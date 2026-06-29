/**
 * models/server.ts
 * --------------------------------------------------------------------
 * TomcatServer — single in-memory wrapper around a persisted
 * ServerConfig plus its live ServerRuntime state.
 *
 * Acts as the single source of truth for one server. UI providers
 * read from this object; services mutate it via setState().
 */

import { EventEmitter } from "events";
import { ServerConfig, ServerRuntime, ServerState } from "./types";

export declare interface TomcatServer {
  on(event: "state-changed", listener: (state: ServerState) => void): this;
  emit(event: "state-changed", state: ServerState): boolean;
}

export class TomcatServer extends EventEmitter {
  public readonly config: ServerConfig;
  public readonly runtime: ServerRuntime;

  constructor(config: ServerConfig) {
    super();
    this.config = config;
    this.runtime = {
      state: "stopped",
      stateChangedAt: Date.now(),
    };
  }

  /** Convenience getter — most callers only care about state. */
  public get state(): ServerState {
    return this.runtime.state;
  }

  /** Update state and notify listeners. Always use this — never mutate directly. */
  public setState(
    next: ServerState,
    opts?: { pid?: number; error?: string },
  ): void {
    if (this.runtime.state === next) {
      return;
    }
    this.runtime.state = next;
    this.runtime.stateChangedAt = Date.now();
    if (opts?.pid !== undefined) {
      this.runtime.pid = opts.pid;
    }
    if (next === "error") {
      this.runtime.lastError = opts?.error;
    }
    if (next === "stopped") {
      this.runtime.pid = undefined;
    }
    this.emit("state-changed", next);
  }

  /** Display label shown in the tree view. */
  public get displayLabel(): string {
    return this.config.name;
  }

  /** Human-readable status string for tooltips. */
  public get statusDescription(): string {
    switch (this.runtime.state) {
      case "running":
        return (
          `Running on :${this.config.httpPort}` +
          (this.runtime.pid ? ` (PID ${this.runtime.pid})` : "")
        );
      case "starting":
        return "Starting…";
      case "stopping":
        return "Stopping…";
      case "error":
        return `Error: ${this.runtime.lastError ?? "unknown"}`;
      case "stopped":
      default:
        return "Stopped";
    }
  }
}

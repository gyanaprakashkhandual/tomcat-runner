/**
 * services/serverManager.ts
 * --------------------------------------------------------------------
 * In-memory registry of TomcatServer instances. Persists configs into
 * VS Code globalState so they survive editor restarts. Acts as the
 * single read/write surface for the rest of the extension.
 */

import * as vscode from "vscode";
import { randomUUID } from "crypto";
import { TomcatServer } from "../models/server";
import { ServerConfig } from "../models/types";
import { STORAGE_KEY_SERVERS } from "../constants";

class ServerManager {
  private context!: vscode.ExtensionContext;
  private readonly servers = new Map<string, TomcatServer>();
  private readonly _onChanged = new vscode.EventEmitter<void>();

  /** Fires whenever the server list or any server state changes. */
  public readonly onChanged = this._onChanged.event;

  /** Wire up storage. Must be called once from extension.ts activate(). */
  public init(context: vscode.ExtensionContext): void {
    this.context = context;
    const stored = context.globalState.get<ServerConfig[]>(
      STORAGE_KEY_SERVERS,
      [],
    );
    for (const cfg of stored) {
      this.attachServer(new TomcatServer(cfg));
    }
  }

  /** All servers, sorted by createdAt ascending (oldest first). */
  public list(): TomcatServer[] {
    return [...this.servers.values()].sort(
      (a, b) => a.config.createdAt - b.config.createdAt,
    );
  }

  /** Lookup by ID — returns undefined if not found. */
  public get(id: string): TomcatServer | undefined {
    return this.servers.get(id);
  }

  /** Create a brand-new server, persist, and return it. */
  public async add(
    partial: Omit<ServerConfig, "id" | "createdAt">,
  ): Promise<TomcatServer> {
    const config: ServerConfig = {
      ...partial,
      id: randomUUID(),
      createdAt: Date.now(),
    };
    const server = new TomcatServer(config);
    this.attachServer(server);
    await this.persist();
    return server;
  }

  /** Update an existing server's config. Triggers state-changed listeners. */
  public async update(
    id: string,
    patch: Partial<Omit<ServerConfig, "id" | "createdAt">>,
  ): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      return;
    }
    Object.assign(server.config, patch);
    await this.persist();
    this._onChanged.fire();
  }

  /** Remove a server. Caller is responsible for stopping it first. */
  public async remove(id: string): Promise<void> {
    if (this.servers.delete(id)) {
      await this.persist();
      this._onChanged.fire();
    }
  }

  /** Dispose all event emitters — called on extension deactivate. */
  public dispose(): void {
    this._onChanged.dispose();
    this.servers.clear();
  }

  // ── internal ────────────────────────────────────────────────────
  private attachServer(server: TomcatServer): void {
    // Whenever any server's state changes, refresh the UI.
    server.on("state-changed", () => this._onChanged.fire());
    this.servers.set(server.config.id, server);
    this._onChanged.fire();
  }

  private async persist(): Promise<void> {
    const configs = [...this.servers.values()].map((s) => s.config);
    await this.context.globalState.update(STORAGE_KEY_SERVERS, configs);
  }
}

/** Singleton — import this everywhere. */
export const serverManager = new ServerManager();

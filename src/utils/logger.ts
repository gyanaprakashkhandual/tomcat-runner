/**
 * utils/logger.ts
 * --------------------------------------------------------------------
 * Manages one VS Code OutputChannel per server, plus a shared global
 * channel for extension-wide events. Channels are created lazily and
 * disposed when the server is removed or the extension deactivates.
 */

import * as vscode from "vscode";
import { OUTPUT_CHANNEL_PREFIX } from "../constants";

class LoggerService implements vscode.Disposable {
  /** Map: serverId -> OutputChannel. The empty key '' is the global channel. */
  private readonly channels = new Map<string, vscode.OutputChannel>();

  /** Global channel for extension-wide events (not tied to one server). */
  public global(): vscode.OutputChannel {
    return this.get("", `${OUTPUT_CHANNEL_PREFIX} Runner`);
  }

  /** Get-or-create an OutputChannel for a specific server. */
  public forServer(serverId: string, serverName: string): vscode.OutputChannel {
    return this.get(serverId, `${OUTPUT_CHANNEL_PREFIX}: ${serverName}`);
  }

  /** Remove and dispose a server's channel — called when the server is deleted. */
  public disposeServer(serverId: string): void {
    const ch = this.channels.get(serverId);
    if (ch) {
      ch.dispose();
      this.channels.delete(serverId);
    }
  }

  /** Show a server's channel in the Output panel. */
  public reveal(serverId: string, serverName: string): void {
    this.forServer(serverId, serverName).show(true);
  }

  /** Dispose every channel — called on extension deactivation. */
  public dispose(): void {
    for (const ch of this.channels.values()) {
      ch.dispose();
    }
    this.channels.clear();
  }

  // ── internal ────────────────────────────────────────────────────
  private get(key: string, displayName: string): vscode.OutputChannel {
    let ch = this.channels.get(key);
    if (!ch) {
      ch = vscode.window.createOutputChannel(displayName);
      this.channels.set(key, ch);
    }
    return ch;
  }
}

/** Singleton — import this everywhere. */
export const logger = new LoggerService();

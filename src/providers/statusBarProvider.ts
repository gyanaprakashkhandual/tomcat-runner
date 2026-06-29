/**
 * providers/statusBarProvider.ts
 * --------------------------------------------------------------------
 * Shows a status bar item summarising running Tomcat servers.
 *
 * Behaviour:
 *   - Hidden when no servers are configured.
 *   - "$(server) Tomcat: 0 running"   when none are up.
 *   - "$(server-process) Tomcat: 2 running" with a green tint when ≥1.
 *   - Clicking it focuses the Servers view.
 */

import * as vscode from "vscode";
import { serverManager } from "../services/serverManager";
import { VIEW_ID_SERVERS } from "../constants";

export class StatusBarProvider implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly listener: vscode.Disposable;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.item.command = `workbench.view.extension.tomcatRunner`; // focus our activity bar container
    this.refresh();
    this.listener = serverManager.onChanged(() => this.refresh());
  }

  /** Recalculate label and visibility from current server states. */
  private refresh(): void {
    const all = serverManager.list();
    const running = all.filter((s) => s.state === "running").length;

    if (all.length === 0) {
      this.item.hide();
      return;
    }

    this.item.text =
      running > 0
        ? `$(server-process) Tomcat: ${running} running`
        : `$(server) Tomcat: 0 running`;
    this.item.tooltip = `${all.length} configured server${all.length === 1 ? "" : "s"} · ${running} running. Click to open Tomcat Runner.`;
    this.item.backgroundColor = running > 0 ? undefined : undefined; // keep theme-neutral
    this.item.show();
  }

  /** Called from extension.ts deactivate(). */
  public dispose(): void {
    this.listener.dispose();
    this.item.dispose();
  }
}

// suppress unused warning if any
void VIEW_ID_SERVERS;

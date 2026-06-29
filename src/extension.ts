/**
 * extension.ts
 * --------------------------------------------------------------------
 * Extension entry point. VS Code calls activate() once and deactivate()
 * on shutdown. All command registrations and provider wiring happens
 * here.
 *
 * Activation flow:
 *   1. Initialise serverManager (loads persisted configs).
 *   2. Register the TreeView provider for the Tomcat sidebar.
 *   3. Register the status bar item.
 *   4. Register every command — passing it the extension context.
 *   5. Ensure all disposables go into context.subscriptions so VS Code
 *      cleans up when the extension is deactivated.
 */

import * as vscode from "vscode";
import { CMD, VIEW_ID_SERVERS } from "./constants";
import { serverManager } from "./services/serverManager";
import { ServerTreeProvider } from "./providers/serverTreeProvider";
import { StatusBarProvider } from "./providers/statusBarProvider";
import { logger } from "./utils/logger";
import { killAll } from "./services/processManager";

// Commands
import { addServer, editServer, removeServer } from "./commands/configCommands";
import {
  startServer,
  stopServer,
  restartServer,
  openInBrowser,
  viewLogs,
} from "./commands/serverCommands";
import {
  deployProject,
  undeployProject,
  cleanWebappsCmd,
} from "./commands/deployCommands";

export function activate(context: vscode.ExtensionContext): void {
  logger
    .global()
    .appendLine(`[${new Date().toISOString()}] Tomcat Runner activated.`);

  // ── Core services ──────────────────────────────────────────────
  serverManager.init(context);

  // ── Tree view ──────────────────────────────────────────────────
  const treeProvider = new ServerTreeProvider();
  const treeView = vscode.window.createTreeView(VIEW_ID_SERVERS, {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // ── Status bar ─────────────────────────────────────────────────
  const statusBar = new StatusBarProvider();

  // ── Commands ───────────────────────────────────────────────────
  // Each registration creates a disposable; we push them all into subscriptions
  // so VS Code unregisters them automatically on deactivate.
  context.subscriptions.push(
    treeView,
    statusBar,

    // config
    vscode.commands.registerCommand(CMD.ADD_SERVER, () => addServer(context)),
    vscode.commands.registerCommand(CMD.EDIT_SERVER, (n) =>
      editServer(context, n),
    ),
    vscode.commands.registerCommand(CMD.REMOVE_SERVER, (n) => removeServer(n)),

    // lifecycle
    vscode.commands.registerCommand(CMD.START_SERVER, (n) => startServer(n)),
    vscode.commands.registerCommand(CMD.STOP_SERVER, (n) => stopServer(n)),
    vscode.commands.registerCommand(CMD.RESTART_SERVER, (n) =>
      restartServer(n),
    ),
    vscode.commands.registerCommand(CMD.OPEN_BROWSER, (n) => openInBrowser(n)),
    vscode.commands.registerCommand(CMD.VIEW_LOGS, (n) => viewLogs(n)),

    // deploy
    vscode.commands.registerCommand(CMD.DEPLOY_PROJECT, (a) =>
      deployProject(a),
    ),
    vscode.commands.registerCommand(CMD.UNDEPLOY_PROJECT, (n) =>
      undeployProject(n),
    ),
    vscode.commands.registerCommand(CMD.CLEAN_WEBAPPS, (n) =>
      cleanWebappsCmd(n),
    ),

    // utility
    vscode.commands.registerCommand(CMD.REFRESH, () => treeProvider.refresh()),

    // disposables we own
    { dispose: () => logger.dispose() },
    { dispose: () => serverManager.dispose() },
  );
}

/**
 * Called when VS Code unloads the extension. Kill any running Tomcat
 * children so we don't leak processes — VS Code does not do this for us.
 */
export function deactivate(): void {
  killAll();
  logger
    .global()
    .appendLine(`[${new Date().toISOString()}] Tomcat Runner deactivated.`);
}

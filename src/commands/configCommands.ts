/**
 * commands/configCommands.ts
 * --------------------------------------------------------------------
 * Command handlers for managing the server registry — add, edit, remove.
 */

import * as vscode from "vscode";
import { serverManager } from "../services/serverManager";
import { openConfigWebview } from "../ui/configWebview";
import { pickServer } from "../ui/quickPick";
import { isProcessAlive, stopProcess } from "../services/processManager";
import { logger } from "../utils/logger";
import { TomcatServer } from "../models/server";

/** Adds a new Tomcat server via the config webview. */
export async function addServer(
  context: vscode.ExtensionContext,
): Promise<void> {
  const cfg = await openConfigWebview(context);
  if (!cfg) {
    return;
  }
  const server = await serverManager.add(cfg);
  vscode.window.showInformationMessage(
    `Tomcat server "${server.config.name}" added.`,
  );
}

/**
 * Edits an existing server. If invoked from the tree, the node is
 * passed in directly; otherwise we prompt with a QuickPick.
 *
 * Note: editing requires the server to be stopped — config changes
 * (especially CATALINA_HOME / port) shouldn't apply mid-run.
 */
export async function editServer(
  context: vscode.ExtensionContext,
  node?: { server: TomcatServer },
): Promise<void> {
  const server =
    node?.server ??
    (await pickServer({ placeHolder: "Select a server to edit" }));
  if (!server) {
    return;
  }

  if (server.state === "running" || server.state === "starting") {
    const choice = await vscode.window.showWarningMessage(
      `"${server.config.name}" is running. Stop it before editing?`,
      { modal: true },
      "Stop and Edit",
    );
    if (choice !== "Stop and Edit") {
      return;
    }
    await stopProcess(server);
    server.setState("stopped");
  }

  const patch = await openConfigWebview(context, server.config);
  if (!patch) {
    return;
  }
  await serverManager.update(server.config.id, patch);
  vscode.window.showInformationMessage(`Server "${patch.name}" updated.`);
}

/**
 * Removes a server. Asks for confirmation. If running, stops it first.
 */
export async function removeServer(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server =
    node?.server ??
    (await pickServer({ placeHolder: "Select a server to remove" }));
  if (!server) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Remove Tomcat server "${server.config.name}"?\n\nThis only removes it from VS Code — your Tomcat installation files are not deleted.`,
    { modal: true },
    "Remove",
  );
  if (confirm !== "Remove") {
    return;
  }

  if (isProcessAlive(server.config.id)) {
    await stopProcess(server);
  }
  logger.disposeServer(server.config.id);
  await serverManager.remove(server.config.id);
  vscode.window.showInformationMessage(
    `Server "${server.config.name}" removed.`,
  );
}

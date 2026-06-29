/**
 * commands/serverCommands.ts
 * --------------------------------------------------------------------
 * Command handlers for server lifecycle — start, stop, restart,
 * open in browser, view logs.
 */

import * as vscode from "vscode";
import { TomcatServer } from "../models/server";
import { pickServer } from "../ui/quickPick";
import {
  startProcess,
  stopProcess,
  isProcessAlive,
} from "../services/processManager";
import { logger } from "../utils/logger";
import { validateCatalinaHome } from "../utils/validator";

/**
 * Resolves the target server from either a tree-node argument
 * or a QuickPick prompt. Centralised so every command uses the
 * same UX.
 */
async function resolveTarget(
  node: { server?: TomcatServer } | undefined,
  placeHolder: string,
): Promise<TomcatServer | undefined> {
  return node?.server ?? pickServer({ placeHolder });
}

/** Start a server. Shows a progress notification with cancel support. */
export async function startServer(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server = await resolveTarget(node, "Select a server to start");
  if (!server) {
    return;
  }

  // Re-validate the install path in case the user moved or deleted it.
  const v = validateCatalinaHome(server.config.catalinaHome);
  if (!v.ok) {
    vscode.window.showErrorMessage(
      `Cannot start "${server.config.name}": ${v.message}`,
    );
    server.setState("error", { error: v.message });
    return;
  }

  if (server.state === "running" || server.state === "starting") {
    vscode.window.showInformationMessage(
      `"${server.config.name}" is already ${server.state}.`,
    );
    return;
  }

  server.setState("starting");

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Starting Tomcat: ${server.config.name}`,
      cancellable: false,
    },
    async () => {
      try {
        const pid = await startProcess(server);
        server.setState("running", { pid });
        vscode.window.showInformationMessage(
          `"${server.config.name}" is up on :${server.config.httpPort}`,
        );
        if (
          vscode.workspace
            .getConfiguration("tomcatRunner")
            .get<boolean>("autoOpenBrowserOnStart")
        ) {
          openInBrowser({ server });
        }
      } catch (err: any) {
        server.setState("error", { error: err.message });
        vscode.window.showErrorMessage(
          `Failed to start "${server.config.name}": ${err.message}`,
        );
      }
    },
  );
}

/** Stop a running server. */
export async function stopServer(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server = await resolveTarget(node, "Select a server to stop");
  if (!server) {
    return;
  }
  if (server.state === "stopped") {
    vscode.window.showInformationMessage(
      `"${server.config.name}" is already stopped.`,
    );
    return;
  }

  server.setState("stopping");
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Stopping ${server.config.name}…`,
      cancellable: false,
    },
    async () => {
      await stopProcess(server);
      server.setState("stopped");
    },
  );
}

/** Restart a server — sequential stop-then-start. */
export async function restartServer(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server = await resolveTarget(node, "Select a server to restart");
  if (!server) {
    return;
  }
  if (isProcessAlive(server.config.id)) {
    await stopServer({ server });
  }
  await startServer({ server });
}

/** Opens the server URL in the user's default browser. */
export async function openInBrowser(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server = await resolveTarget(node, "Select a server to open");
  if (!server) {
    return;
  }
  const url = vscode.Uri.parse(`http://localhost:${server.config.httpPort}/`);
  vscode.env.openExternal(url);
}

/** Reveals the server's OutputChannel in the Output panel. */
export async function viewLogs(node?: { server: TomcatServer }): Promise<void> {
  const server = await resolveTarget(node, "Select a server to view logs");
  if (!server) {
    return;
  }
  logger.reveal(server.config.id, server.config.name);
}

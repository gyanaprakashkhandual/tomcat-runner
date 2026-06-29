/**
 * ui/quickPick.ts
 * --------------------------------------------------------------------
 * Reusable QuickPick helpers — server picker, colour picker.
 */

import * as vscode from "vscode";
import { serverManager } from "../services/serverManager";
import { TomcatServer } from "../models/server";
import { SERVER_COLORS } from "../constants";

/**
 * Prompts the user to pick one configured server.
 * Returns undefined if cancelled.
 */
export async function pickServer(
  opts: { placeHolder?: string; filter?: (s: TomcatServer) => boolean } = {},
): Promise<TomcatServer | undefined> {
  const servers = serverManager.list().filter(opts.filter ?? (() => true));
  if (servers.length === 0) {
    vscode.window.showInformationMessage(
      'No matching Tomcat servers. Use "Add Tomcat Server" first.',
    );
    return;
  }
  const picked = await vscode.window.showQuickPick(
    servers.map((s) => ({
      label: s.config.name,
      description: s.statusDescription,
      detail: s.config.catalinaHome,
      server: s,
    })),
    {
      placeHolder: opts.placeHolder ?? "Select a Tomcat server",
      matchOnDescription: true,
      matchOnDetail: true,
    },
  );
  return picked?.server;
}

/** Prompts the user to pick a colour. Returns the colour ID. */
export async function pickColor(
  currentId?: string,
): Promise<string | undefined> {
  const items = SERVER_COLORS.map((c) => ({
    label: `$(circle-filled) ${c.label}`,
    description: c.id === currentId ? "(current)" : "",
    colorId: c.id,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Pick a colour for this server",
  });
  return picked?.colorId;
}

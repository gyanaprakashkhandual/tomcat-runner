/**
 * providers/serverTreeProvider.ts
 * --------------------------------------------------------------------
 * TreeDataProvider for the "Servers" view in our custom Activity Bar.
 *
 * Tree shape:
 *   ▸ ServerNode  (one per configured server, coloured + state icon)
 *       ▸ AppNode (one per deployed app under webapps/)
 *
 * The view's contextValue values drive which inline action buttons
 * VS Code renders in package.json `view/item/context` menus:
 *   - "server.running"  → shows Stop / Restart / Open in Browser
 *   - "server.stopped"  → shows Start
 *   - "server.starting" | "server.stopping" → shows nothing inline
 *   - "app"             → shows Undeploy
 */

import * as vscode from "vscode";
import { serverManager } from "../services/serverManager";
import { SERVER_COLORS } from "../constants";
import { TomcatServer } from "../models/server";
import { ServerState } from "../models/types";
import { listDeployedApps } from "../services/deployService";

/** Node types in our tree. */
type Node = ServerNode | AppNode;

class ServerNode extends vscode.TreeItem {
  constructor(public readonly server: TomcatServer) {
    super(server.displayLabel, vscode.TreeItemCollapsibleState.Collapsed);

    this.description = server.statusDescription;
    this.tooltip = buildTooltip(server);
    this.contextValue = `server.${server.state}`; // matches package.json `when` clauses
    this.iconPath = iconFor(server);
    this.id = `server:${server.config.id}`;
  }
}

class AppNode extends vscode.TreeItem {
  constructor(
    public readonly server: TomcatServer,
    public readonly contextPath: string,
  ) {
    super(`/${contextPath}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "app";
    this.iconPath = new vscode.ThemeIcon("package");
    this.tooltip = `Deployed at http://localhost:${server.config.httpPort}/${contextPath}/`;
    this.id = `app:${server.config.id}:${contextPath}`;
    // Click to open in browser
    this.command = {
      command: "vscode.open",
      title: "Open in Browser",
      arguments: [
        vscode.Uri.parse(
          `http://localhost:${server.config.httpPort}/${contextPath}/`,
        ),
      ],
    };
  }
}

export class ServerTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<Node | void>();
  public readonly onDidChangeTreeData = this._onDidChange.event;

  constructor() {
    // Refresh whenever the registry signals a change.
    serverManager.onChanged(() => this._onDidChange.fire());
  }

  public refresh(): void {
    this._onDidChange.fire();
  }

  public getTreeItem(el: Node): vscode.TreeItem {
    return el;
  }

  public getChildren(el?: Node): Node[] {
    if (!el) {
      // Root level — list servers.
      return serverManager.list().map((s) => new ServerNode(s));
    }
    if (el instanceof ServerNode) {
      // Children of a server = its deployed apps. Only show when server has at least one.
      return listDeployedApps(el.server).map(
        (ctx) => new AppNode(el.server, ctx),
      );
    }
    return [];
  }
}

// ── helpers ──────────────────────────────────────────────────────────

/** Resolves a ThemeColor for a server's chosen colour ID. */
function themeColorFor(colorId: string): vscode.ThemeColor {
  const found = SERVER_COLORS.find((c) => c.id === colorId) ?? SERVER_COLORS[0];
  return new vscode.ThemeColor(found.themeId);
}

/** Picks the right icon for a server's current state and colour. */
function iconFor(server: TomcatServer): vscode.ThemeIcon {
  const color = themeColorFor(server.config.colorId);
  const state: ServerState = server.state;
  switch (state) {
    case "running":
      return new vscode.ThemeIcon("circle-filled", color);
    case "starting":
      return new vscode.ThemeIcon("sync~spin", color);
    case "stopping":
      return new vscode.ThemeIcon("sync~spin", color);
    case "error":
      return new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
    case "stopped":
    default:
      return new vscode.ThemeIcon("circle-outline", color);
  }
}

/** Multi-line hover tooltip — uses Markdown for richer formatting. */
function buildTooltip(server: TomcatServer): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = false;
  md.appendMarkdown(`**${server.config.name}**\n\n`);
  md.appendMarkdown(`- **Status:** ${server.statusDescription}\n`);
  md.appendMarkdown(`- **Port:** ${server.config.httpPort}\n`);
  md.appendMarkdown(`- **Path:** \`${server.config.catalinaHome}\`\n`);
  if (server.config.javaHome) {
    md.appendMarkdown(`- **Java Home:** \`${server.config.javaHome}\`\n`);
  }
  return md;
}

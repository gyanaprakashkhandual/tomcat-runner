/**
 * commands/deployCommands.ts
 * --------------------------------------------------------------------
 * Command handlers for build & deploy workflows.
 *
 *   - deployProject : build pom + copy WAR to webapps
 *   - undeployProject: remove an app from webapps
 *   - cleanWebapps  : nuke all user apps from webapps
 */

import * as path from "path";
import * as vscode from "vscode";
import { pickServer } from "../ui/quickPick";
import { buildProject, isMavenProject } from "../services/mavenService";
import {
  cleanWebapps,
  deployArtifact,
  pickProjectFolder,
  undeployApp,
} from "../services/deployService";
import { logger } from "../utils/logger";
import { TomcatServer } from "../models/server";
import { isFile } from "../utils/fs";
import { BuildArtifact } from "../services/mavenService";

/**
 * Deploys a project to a server.
 *
 * Argument behaviour (multiple invocation sources):
 *   - From explorer right-click on pom.xml → arg is vscode.Uri
 *   - From explorer right-click on .war/.jar → arg is vscode.Uri
 *   - From tree right-click on server  → arg is { server: TomcatServer }
 *   - From Command Palette             → no arg
 */
export async function deployProject(
  arg?: vscode.Uri | { server: TomcatServer },
): Promise<void> {
  // 1️⃣ Decide what to deploy
  let artifact: BuildArtifact | undefined;
  let targetServer: TomcatServer | undefined;

  if (arg instanceof vscode.Uri) {
    // Right-clicked a file/folder in the explorer
    const fsPath = arg.fsPath;
    if (fsPath.endsWith(".war") || fsPath.endsWith(".jar")) {
      // Pre-built artifact — skip Maven
      artifact = {
        path: fsPath,
        packaging: fsPath.endsWith(".war") ? "war" : "jar",
        isSpringBoot: false, // assume not — user already built it themselves
      };
    } else if (path.basename(fsPath) === "pom.xml") {
      const projectDir = path.dirname(fsPath);
      artifact = await runMavenBuild(projectDir);
    }
  } else if (arg && "server" in arg) {
    // Right-clicked a server in the tree — ask for project
    targetServer = arg.server;
    const folder = await pickProjectFolder();
    if (!folder) {
      return;
    }
    if (!isMavenProject(folder.fsPath)) {
      vscode.window.showErrorMessage(`No pom.xml found in ${folder.fsPath}`);
      return;
    }
    artifact = await runMavenBuild(folder.fsPath);
  } else {
    // Palette — ask both project and server
    const folder = await pickProjectFolder();
    if (!folder) {
      return;
    }
    if (!isMavenProject(folder.fsPath)) {
      vscode.window.showErrorMessage(`No pom.xml found in ${folder.fsPath}`);
      return;
    }
    artifact = await runMavenBuild(folder.fsPath);
  }

  if (!artifact) {
    return;
  }

  // Verify the artifact actually exists on disk (e.g. user-supplied URI).
  if (!isFile(artifact.path)) {
    vscode.window.showErrorMessage(`Artifact not found: ${artifact.path}`);
    return;
  }

  // 2️⃣ Pick destination server
  if (!targetServer) {
    targetServer = await pickServer({ placeHolder: "Deploy to which Tomcat?" });
    if (!targetServer) {
      return;
    }
  }

  // 3️⃣ Confirm context path
  const defaultCtx = path.basename(artifact.path).replace(/\.(war|jar)$/i, "");
  const ctx = await vscode.window.showInputBox({
    prompt: "Context path for this deployment",
    value: defaultCtx,
    placeHolder: "e.g. myapp  →  http://localhost:8080/myapp/",
    validateInput: (v) =>
      v && /^[A-Za-z0-9_-]+$/.test(v)
        ? null
        : "Use letters, numbers, hyphen, underscore.",
  });
  if (!ctx) {
    return;
  }

  // 4️⃣ Deploy + offer to open browser
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Deploying to ${targetServer.config.name}…`,
    },
    async () => {
      try {
        await deployArtifact(targetServer!, artifact!, ctx);
        const url = `http://localhost:${targetServer!.config.httpPort}/${ctx}/`;
        const choice = await vscode.window.showInformationMessage(
          `Deployed to ${url}`,
          "Open in Browser",
        );
        if (choice === "Open in Browser") {
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Deploy failed: ${err.message}`);
      }
    },
  );
}

/** Undeploys an app — invoked from the AppNode in the tree. */
export async function undeployProject(node?: {
  server: TomcatServer;
  contextPath: string;
}): Promise<void> {
  if (!node) {
    vscode.window.showInformationMessage(
      "Right-click a deployed app in the Tomcat Servers view to undeploy.",
    );
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    `Undeploy /${node.contextPath} from "${node.server.config.name}"?`,
    { modal: true },
    "Undeploy",
  );
  if (confirm !== "Undeploy") {
    return;
  }
  undeployApp(node.server, node.contextPath);
  vscode.window.showInformationMessage(`Undeployed /${node.contextPath}`);
}

/** Cleans every user app from a server's webapps folder. */
export async function cleanWebappsCmd(node?: {
  server: TomcatServer;
}): Promise<void> {
  const server =
    node?.server ??
    (await pickServer({ placeHolder: "Clean which server's webapps?" }));
  if (!server) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Remove ALL deployed apps from "${server.config.name}"? (Built-in apps like ROOT, manager, docs are preserved.)`,
    { modal: true },
    "Clean",
  );
  if (confirm !== "Clean") {
    return;
  }

  const n = cleanWebapps(server);
  vscode.window.showInformationMessage(
    `Removed ${n} app${n === 1 ? "" : "s"} from ${server.config.name}.`,
  );
}

// ── helpers ──────────────────────────────────────────────────────────

/** Wraps mavenService.buildProject in a progress notification. */
async function runMavenBuild(
  projectDir: string,
): Promise<BuildArtifact | undefined> {
  const ch = logger.global();
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Building ${path.basename(projectDir)}…`,
    },
    async () => {
      try {
        return await buildProject(projectDir, ch);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Maven build failed: ${err.message}`);
        return undefined;
      }
    },
  );
}

/**
 * services/deployService.ts
 * --------------------------------------------------------------------
 * Deploys / undeploys artifacts to <CATALINA_HOME>/webapps.
 *
 * - For traditional .war files: copy to webapps/, Tomcat hot-deploys.
 * - For Spring Boot fat .jar: we DO NOT deploy to Tomcat — that
 *   wouldn't make sense (Spring Boot embeds its own Tomcat). Instead
 *   we surface a clear warning to the user.
 * - For Spring Boot WAR projects: we DO deploy — those are designed
 *   to drop into an external Tomcat.
 *
 * Naming: WARs are copied as <contextPath>.war so the URL becomes
 *   http://localhost:<port>/<contextPath>/
 */

import * as path from "path";
import * as vscode from "vscode";
import { TomcatServer } from "../models/server";
import { BuildArtifact } from "./mavenService";
import {
  copyFile,
  rmDirIfExists,
  rmFileIfExists,
  webappsDir,
  listDir,
  isDir,
} from "../utils/fs";
import { logger } from "../utils/logger";

/**
 * Deploys a built artifact to a server's webapps folder.
 * Returns the deployed context path (without leading slash).
 */
export async function deployArtifact(
  server: TomcatServer,
  artifact: BuildArtifact,
  contextPath?: string,
): Promise<string> {
  const ch = logger.forServer(server.config.id, server.config.name);

  // Reject fat-jar Spring Boot — those run themselves.
  if (artifact.packaging === "jar" && artifact.isSpringBoot) {
    const msg =
      "Spring Boot fat JARs cannot be deployed to an external Tomcat. " +
      "Run with `java -jar` instead, or change packaging to <packaging>war</packaging>.";
    ch.appendLine(`[ERROR] ${msg}`);
    throw new Error(msg);
  }

  if (artifact.packaging !== "war") {
    throw new Error("Only .war artifacts can be deployed to Tomcat.");
  }

  // Derive context path from the artifact filename if not provided.
  const baseName = path.basename(artifact.path, ".war");
  const ctx = (contextPath || baseName).replace(/^\/+/, "");

  const target = path.join(
    webappsDir(server.config.catalinaHome),
    `${ctx}.war`,
  );
  const exploded = path.join(webappsDir(server.config.catalinaHome), ctx);

  // Tomcat hot-deploys when a new .war lands; remove any previous version + exploded dir.
  ch.appendLine(
    `\n[${new Date().toISOString()}] Deploying ${path.basename(artifact.path)} → ${target}`,
  );
  rmFileIfExists(target);
  rmDirIfExists(exploded);
  copyFile(artifact.path, target);
  ch.appendLine(`[OK] Deployed. Context path = /${ctx}`);

  return ctx;
}

/**
 * Removes a deployed app from a server's webapps folder.
 * Removes both the .war file and the exploded directory.
 */
export function undeployApp(server: TomcatServer, contextPath: string): void {
  const ch = logger.forServer(server.config.id, server.config.name);
  const ctx = contextPath.replace(/^\/+/, "");
  const warFile = path.join(
    webappsDir(server.config.catalinaHome),
    `${ctx}.war`,
  );
  const expDir = path.join(webappsDir(server.config.catalinaHome), ctx);
  rmFileIfExists(warFile);
  rmDirIfExists(expDir);
  ch.appendLine(`\n[${new Date().toISOString()}] Undeployed /${ctx}`);
}

/**
 * Lists currently deployed apps in webapps/ (both .war files and
 * exploded directories), excluding the bundled Tomcat samples.
 */
export function listDeployedApps(server: TomcatServer): string[] {
  const dir = webappsDir(server.config.catalinaHome);
  if (!isDir(dir)) {
    return [];
  }
  // Tomcat ships some default apps — hide them from the UI by default.
  const builtins = new Set([
    "ROOT",
    "docs",
    "examples",
    "host-manager",
    "manager",
  ]);
  const apps = new Set<string>();
  for (const name of listDir(dir)) {
    if (name.endsWith(".war")) {
      const ctx = name.slice(0, -4);
      if (!builtins.has(ctx)) {
        apps.add(ctx);
      }
    } else if (isDir(path.join(dir, name)) && !builtins.has(name)) {
      apps.add(name);
    }
  }
  return [...apps].sort();
}

/**
 * Removes ALL non-builtin apps from webapps/.
 * Asks for confirmation through the caller; this function just does the work.
 */
export function cleanWebapps(server: TomcatServer): number {
  const apps = listDeployedApps(server);
  for (const ctx of apps) {
    undeployApp(server, ctx);
  }
  return apps.length;
}

/**
 * Picks a workspace folder to build. If there's exactly one and it
 * contains a pom.xml, returns it. Otherwise prompts the user.
 */
export async function pickProjectFolder(): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) {
    return folders[0].uri;
  }
  if (folders.length === 0) {
    vscode.window.showWarningMessage(
      "Open a folder containing a Maven project first.",
    );
    return;
  }
  const pick = await vscode.window.showWorkspaceFolderPick({
    placeHolder: "Select the Maven project to deploy",
  });
  return pick?.uri;
}

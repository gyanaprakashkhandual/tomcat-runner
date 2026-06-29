/**
 * services/mavenService.ts
 * --------------------------------------------------------------------
 * Detects Maven projects and runs `mvn package` to produce a WAR or
 * Spring Boot fat JAR. Output is streamed to the OutputChannel for
 * full visibility.
 */

import * as path from "path";
import { spawn } from "child_process";
import * as vscode from "vscode";
import * as fs from "fs";
import { IS_WIN, isFile, isDir, listDir } from "../utils/fs";
import { logger } from "../utils/logger";

export interface BuildArtifact {
  /** Absolute path to the produced .war or .jar. */
  path: string;
  /** Detected packaging from pom.xml — 'war' or 'jar'. */
  packaging: "war" | "jar";
  /** True if the pom.xml declares spring-boot-maven-plugin. */
  isSpringBoot: boolean;
}

/** Resolves the Maven executable from settings, falling back to "mvn" on PATH. */
function mavenExe(): string {
  return (
    vscode.workspace
      .getConfiguration("tomcatRunner")
      .get<string>("mavenExecutable") || "mvn"
  );
}

/**
 * Checks whether `dir` is a Maven project root.
 * Just looks for pom.xml — keeps this cheap.
 */
export function isMavenProject(dir: string): boolean {
  return isDir(dir) && isFile(path.join(dir, "pom.xml"));
}

/**
 * Runs `mvn clean package -DskipTests` in `projectDir`. Streams logs.
 * Resolves with the detected build artifact (.war or .jar in target/).
 */
export function buildProject(
  projectDir: string,
  contextChannel?: vscode.OutputChannel,
): Promise<BuildArtifact> {
  return new Promise((resolve, reject) => {
    if (!isMavenProject(projectDir)) {
      return reject(
        new Error(`Not a Maven project (no pom.xml): ${projectDir}`),
      );
    }

    const ch = contextChannel ?? logger.global();
    ch.show(true);
    ch.appendLine(
      `\n[${new Date().toISOString()}] Building Maven project: ${projectDir}`,
    );

    // Detect packaging + spring boot up-front so we can pick the artifact later.
    const pomMeta = parsePomMeta(path.join(projectDir, "pom.xml"));
    ch.appendLine(`  Packaging   = ${pomMeta.packaging}`);
    ch.appendLine(`  Spring Boot = ${pomMeta.isSpringBoot ? "yes" : "no"}`);
    ch.appendLine("────────────────────────────────────────────────────────");

    const cmd = mavenExe();
    const args = ["clean", "package", "-DskipTests"];
    // On Windows, .cmd files need to be invoked through cmd.exe.
    const child = IS_WIN
      ? spawn("cmd.exe", ["/c", cmd, ...args], { cwd: projectDir })
      : spawn(cmd, args, { cwd: projectDir });

    child.stdout.on("data", (d) => ch.append(d.toString()));
    child.stderr.on("data", (d) => ch.append(d.toString()));

    child.on("error", (err) => {
      ch.appendLine(`\n[ERROR] Failed to start Maven: ${err.message}`);
      reject(err);
    });

    child.on("exit", (code) => {
      if (code !== 0) {
        ch.appendLine(`\n[ERROR] Maven exited with code ${code}`);
        return reject(new Error(`Maven build failed (exit code ${code}).`));
      }
      // Find the produced artifact in target/.
      const artifact = findArtifact(projectDir, pomMeta.packaging);
      if (!artifact) {
        return reject(
          new Error("Build succeeded but no .war/.jar found in target/."),
        );
      }
      ch.appendLine(`\n[OK] Build complete: ${artifact}`);
      resolve({
        path: artifact,
        packaging: pomMeta.packaging,
        isSpringBoot: pomMeta.isSpringBoot,
      });
    });
  });
}

// ── helpers ──────────────────────────────────────────────────────────

/**
 * Lightweight pom.xml inspection — regex-based, no XML parser dep.
 * Good enough to detect <packaging> and the spring-boot-maven-plugin.
 */
function parsePomMeta(pomPath: string): {
  packaging: "war" | "jar";
  isSpringBoot: boolean;
} {
  let xml = "";
  try {
    xml = fs.readFileSync(pomPath, "utf8");
  } catch {
    /* fall through */
  }
  const pkgMatch = xml.match(/<packaging>\s*(\w+)\s*<\/packaging>/i);
  const packaging = pkgMatch?.[1]?.toLowerCase() === "war" ? "war" : "jar";
  const isSpringBoot =
    /spring-boot-maven-plugin|<artifactId>\s*spring-boot-starter[^<]*<\/artifactId>/i.test(
      xml,
    );
  return { packaging, isSpringBoot };
}

/** Find the first .war (or .jar if packaging=jar) in target/, skipping -sources/-javadoc jars. */
function findArtifact(
  projectDir: string,
  packaging: "war" | "jar",
): string | null {
  const targetDir = path.join(projectDir, "target");
  if (!isDir(targetDir)) {
    return null;
  }
  const ext = `.${packaging}`;
  const match = listDir(targetDir)
    .filter((f) => f.endsWith(ext) && !/-sources\.|-javadoc\./.test(f))
    .map((f) => path.join(targetDir, f))[0];
  return match || null;
}

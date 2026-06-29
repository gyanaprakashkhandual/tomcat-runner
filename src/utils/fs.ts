/**
 * utils/fs.ts
 * --------------------------------------------------------------------
 * Lightweight wrappers around node:fs for tasks specific to this
 * extension. Kept platform-aware (Windows vs. *nix) where it matters.
 */

import * as fs from "fs";
import * as path from "path";

/** True if `p` is an existing directory. */
export function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** True if `p` is an existing file. */
export function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** True if the platform is Windows — used to pick .bat vs .sh scripts. */
export const IS_WIN = process.platform === "win32";

/**
 * Resolves the Tomcat startup/shutdown script path for the current OS.
 * Returns null if the expected script is missing.
 */
export function resolveCatalinaScript(
  catalinaHome: string,
  action: "start" | "stop",
): string | null {
  const scriptName = IS_WIN
    ? action === "start"
      ? "startup.bat"
      : "shutdown.bat"
    : action === "start"
      ? "startup.sh"
      : "shutdown.sh";
  const fullPath = path.join(catalinaHome, "bin", scriptName);
  return isFile(fullPath) ? fullPath : null;
}

/** Path to <catalinaHome>/webapps — the deploy target. */
export function webappsDir(catalinaHome: string): string {
  return path.join(catalinaHome, "webapps");
}

/** Path to <catalinaHome>/logs/catalina.out — useful for tailing. */
export function catalinaLogFile(catalinaHome: string): string {
  return path.join(
    catalinaHome,
    "logs",
    IS_WIN ? "catalina.log" : "catalina.out",
  );
}

/** Copy a file, overwriting if it exists. */
export function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest);
}

/** Recursively delete a directory if it exists. */
export function rmDirIfExists(dir: string): void {
  if (isDir(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Delete a single file if it exists. */
export function rmFileIfExists(file: string): void {
  if (isFile(file)) {
    fs.unlinkSync(file);
  }
}

/** List immediate children of a directory; returns [] on error. */
export function listDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

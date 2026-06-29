/**
 * utils/validator.ts
 * --------------------------------------------------------------------
 * Validates user input before persisting a server config.
 */

import * as path from "path";
import { isDir, isFile, resolveCatalinaScript } from "./fs";

export interface ValidationResult {
  ok: boolean;
  /** Human-readable error — shown to the user when ok === false. */
  message?: string;
}

/**
 * Validates a Tomcat installation folder.
 * A real CATALINA_HOME must contain at minimum:
 *   - bin/   with startup + shutdown scripts
 *   - conf/server.xml
 *   - webapps/
 *   - lib/
 */
export function validateCatalinaHome(p: string): ValidationResult {
  if (!p) {
    return { ok: false, message: "Tomcat folder path is required." };
  }
  if (!isDir(p)) {
    return { ok: false, message: `Folder does not exist: ${p}` };
  }
  if (!isDir(path.join(p, "bin"))) {
    return {
      ok: false,
      message: 'Missing "bin" folder — not a Tomcat installation.',
    };
  }
  if (!isFile(path.join(p, "conf", "server.xml"))) {
    return {
      ok: false,
      message: "Missing conf/server.xml — not a Tomcat installation.",
    };
  }
  if (!isDir(path.join(p, "webapps"))) {
    return {
      ok: false,
      message: 'Missing "webapps" folder — not a Tomcat installation.',
    };
  }
  if (!resolveCatalinaScript(p, "start")) {
    return { ok: false, message: "Missing bin/startup.sh or bin/startup.bat." };
  }
  return { ok: true };
}

/** Validates the HTTP port — 1..65535. */
export function validatePort(port: number): ValidationResult {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return {
      ok: false,
      message: "Port must be an integer between 1 and 65535.",
    };
  }
  return { ok: true };
}

/** Validates display name — non-empty, max 40 chars. */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { ok: false, message: "Server name is required." };
  }
  if (name.trim().length > 40) {
    return {
      ok: false,
      message: "Server name must be 40 characters or fewer.",
    };
  }
  return { ok: true };
}

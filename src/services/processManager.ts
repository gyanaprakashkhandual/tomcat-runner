/**
 * services/processManager.ts
 * --------------------------------------------------------------------
 * Spawns and kills the Tomcat catalina process. Uses `catalina.sh run`
 * (or `catalina.bat run`) in foreground mode so we can capture stdout
 * directly to the server's OutputChannel and own the process lifecycle.
 *
 * NOTE: we deliberately avoid `startup.sh` which forks and detaches —
 * we can't reliably stop it that way. `catalina.sh run` stays attached.
 */

import * as path from "path";
import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";
import { IS_WIN, isFile } from "../utils/fs";
import { logger } from "../utils/logger";
import { TomcatServer } from "../models/server";

/** Map: serverId -> running child process. */
const processes = new Map<string, ChildProcess>();

/**
 * Spawns a new Tomcat process for the given server.
 * Resolves once the process emits its "Server startup" line, or rejects
 * on early exit / launch failure.
 */
export function startProcess(server: TomcatServer): Promise<number> {
  return new Promise((resolve, reject) => {
    if (processes.has(server.config.id)) {
      return reject(new Error("Process is already running for this server."));
    }

    const scriptPath = resolveCatalinaRun(server.config.catalinaHome);
    if (!scriptPath) {
      return reject(
        new Error(
          "catalina.sh / catalina.bat not found in <CATALINA_HOME>/bin",
        ),
      );
    }

    // Build env: JAVA_HOME override + CATALINA_OPTS
    const cfg = vscode.workspace.getConfiguration("tomcatRunner");
    const env = {
      ...process.env,
      CATALINA_HOME: server.config.catalinaHome,
      CATALINA_BASE: server.config.catalinaHome,
      JAVA_HOME:
        server.config.javaHome ||
        cfg.get<string>("javaHome") ||
        process.env.JAVA_HOME ||
        "",
      CATALINA_OPTS: server.config.catalinaOpts || "",
    };

    const channel = logger.forServer(server.config.id, server.config.name);
    channel.appendLine(
      `[${new Date().toISOString()}] Starting Tomcat: ${server.config.name}`,
    );
    channel.appendLine(`  CATALINA_HOME = ${server.config.catalinaHome}`);
    channel.appendLine(`  JAVA_HOME     = ${env.JAVA_HOME || "(unset)"}`);
    channel.appendLine(`  Command       = ${scriptPath} run`);
    channel.appendLine(
      "────────────────────────────────────────────────────────",
    );

    // Spawn. On Windows we use the .bat directly through cmd.exe.
    const child = IS_WIN
      ? spawn("cmd.exe", ["/c", scriptPath, "run"], {
          env,
          cwd: server.config.catalinaHome,
        })
      : spawn(scriptPath, ["run"], { env, cwd: server.config.catalinaHome });

    processes.set(server.config.id, child);

    let resolved = false;

    // Forward stdout/stderr to the channel; detect startup line.
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      channel.append(text);
      // Tomcat prints "Server startup in [N] milliseconds" once ready.
      if (!resolved && /Server startup in/i.test(text)) {
        resolved = true;
        resolve(child.pid ?? -1);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    child.on("error", (err) => {
      channel.appendLine(`\n[ERROR] ${err.message}`);
      processes.delete(server.config.id);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    child.on("exit", (code, signal) => {
      channel.appendLine(`\n[EXIT] code=${code} signal=${signal}`);
      processes.delete(server.config.id);
      // If we never saw the startup line, treat the early exit as failure.
      if (!resolved) {
        resolved = true;
        reject(new Error(`Tomcat exited before startup (code ${code}).`));
      } else {
        server.setState("stopped");
      }
    });
  });
}

/**
 * Stops a running Tomcat process. Tries graceful SIGTERM first, then
 * force-kills after the configured timeout.
 */
export function stopProcess(server: TomcatServer): Promise<void> {
  return new Promise((resolve) => {
    const child = processes.get(server.config.id);
    if (!child) {
      // Nothing to stop — already gone.
      return resolve();
    }

    const channel = logger.forServer(server.config.id, server.config.name);
    channel.appendLine(
      `\n[${new Date().toISOString()}] Stopping Tomcat: ${server.config.name}`,
    );

    const timeoutMs = vscode.workspace
      .getConfiguration("tomcatRunner")
      .get<number>("shutdownTimeoutMs", 15_000);
    const killTimer = setTimeout(() => {
      channel.appendLine("[WARN] Graceful shutdown timed out — force killing.");
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    child.once("exit", () => {
      clearTimeout(killTimer);
      processes.delete(server.config.id);
      resolve();
    });

    // SIGTERM gives the JVM a chance to flush logs and unregister shutdown hooks.
    // On Windows, signals are simulated — kill() just calls TerminateProcess.
    try {
      child.kill("SIGTERM");
    } catch (e: any) {
      channel.appendLine(`[ERROR] kill failed: ${e.message}`);
      clearTimeout(killTimer);
      processes.delete(server.config.id);
      resolve();
    }
  });
}

/** True if we currently hold a live child process for this server. */
export function isProcessAlive(serverId: string): boolean {
  return processes.has(serverId);
}

/** Kill every process — called on extension deactivate. */
export function killAll(): void {
  for (const [, child] of processes) {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
  processes.clear();
}

// ── helpers ──────────────────────────────────────────────────────────
function resolveCatalinaRun(catalinaHome: string): string | null {
  const name = IS_WIN ? "catalina.bat" : "catalina.sh";
  const full = path.join(catalinaHome, "bin", name);
  return isFile(full) ? full : null;
}

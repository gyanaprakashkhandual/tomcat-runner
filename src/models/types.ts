/**
 * models/types.ts
 * --------------------------------------------------------------------
 * Shared TypeScript interfaces. Keep this file free of any logic or
 * `vscode` imports so it can be used safely in unit tests later.
 */

/** Possible runtime states for a Tomcat server. */
export type ServerState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error";

/**
 * Persisted configuration for one Tomcat server.
 * This is what gets serialised into globalState.
 */
export interface ServerConfig {
  /** Stable UUID — never changes for the lifetime of this server entry. */
  id: string;
  /** User-defined display name (e.g. "Local Dev", "QA"). */
  name: string;
  /** Colour token ID from SERVER_COLORS. */
  colorId: string;
  /** Absolute path to the Apache Tomcat installation root. */
  catalinaHome: string;
  /** HTTP port to use. We don't edit server.xml — we just record it for browser URLs. */
  httpPort: number;
  /** Optional JAVA_HOME override; falls back to settings then env. */
  javaHome?: string;
  /** Extra JVM args (CATALINA_OPTS). */
  catalinaOpts?: string;
  /** Timestamp added — useful for sorting in the tree view. */
  createdAt: number;
}

/**
 * Runtime info attached to a server while it's alive in this session.
 * NOT persisted — rebuilt every time the extension starts.
 */
export interface ServerRuntime {
  state: ServerState;
  /** PID of the catalina.sh / catalina.bat process if running. */
  pid?: number;
  /** Last error message, if state === 'error'. */
  lastError?: string;
  /** Wall-clock when state last changed — used for "uptime" display. */
  stateChangedAt: number;
}

/**
 * Webview message types — strongly typed messages exchanged between
 * the extension host and the config webview UI.
 */
export type WebviewInbound =
  | { type: "save"; payload: Partial<ServerConfig> }
  | { type: "cancel" }
  | { type: "browse"; field: "catalinaHome" | "javaHome" };

export type WebviewOutbound =
  | {
      type: "init";
      payload: {
        config?: ServerConfig;
        colors: typeof import("../constants").SERVER_COLORS;
      };
    }
  | { type: "browsed"; field: string; value: string };

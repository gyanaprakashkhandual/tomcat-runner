/**
 * constants.ts
 * --------------------------------------------------------------------
 * Centralised constants — single source of truth for command IDs,
 * storage keys, theme colour tokens, and predefined server colours.
 * Keeping these here makes the code grep-friendly and prevents typos.
 */

/** Storage key used in VS Code globalState to persist server configs. */
export const STORAGE_KEY_SERVERS = "tomcatRunner.servers.v1";

/** TreeView ID — must match `views[*].id` in package.json. */
export const VIEW_ID_SERVERS = "tomcatServers";

/** All command IDs — keep in sync with package.json `contributes.commands`. */
export const CMD = {
  ADD_SERVER: "tomcatRunner.addServer",
  EDIT_SERVER: "tomcatRunner.editServer",
  REMOVE_SERVER: "tomcatRunner.removeServer",
  START_SERVER: "tomcatRunner.startServer",
  STOP_SERVER: "tomcatRunner.stopServer",
  RESTART_SERVER: "tomcatRunner.restartServer",
  OPEN_BROWSER: "tomcatRunner.openInBrowser",
  VIEW_LOGS: "tomcatRunner.viewLogs",
  DEPLOY_PROJECT: "tomcatRunner.deployProject",
  UNDEPLOY_PROJECT: "tomcatRunner.undeployProject",
  CLEAN_WEBAPPS: "tomcatRunner.cleanWebapps",
  REFRESH: "tomcatRunner.refresh",
} as const;

/**
 * Predefined colour palette — user picks one per server.
 * Values map to VS Code's built-in ThemeColor IDs so they always
 * blend with whatever VS Code colour theme the user has chosen.
 */
export const SERVER_COLORS: ReadonlyArray<{
  id: string;
  label: string;
  themeId: string;
}> = [
  { id: "blue", label: "Blue", themeId: "charts.blue" },
  { id: "green", label: "Green", themeId: "charts.green" },
  { id: "red", label: "Red", themeId: "charts.red" },
  { id: "orange", label: "Orange", themeId: "charts.orange" },
  { id: "purple", label: "Purple", themeId: "charts.purple" },
  { id: "yellow", label: "Yellow", themeId: "charts.yellow" },
];

/** Default port assumed for fresh Tomcat installations. */
export const DEFAULT_HTTP_PORT = 8080;

/** Output channel base name — each server gets `Tomcat: <name>`. */
export const OUTPUT_CHANNEL_PREFIX = "Tomcat";

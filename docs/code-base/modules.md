# Module Reference

## Entry Point

### extension.ts

Activation entry point. `activate()` initializes `serverManager`, creates the TreeView and status bar, registers every command, and pushes all disposables into `context.subscriptions`. `deactivate()` kills any running Tomcat child processes and disposes the logger so no orphaned processes survive after the extension unloads.

### constants.ts

Single source of truth for command IDs (`CMD`), the `globalState` storage key, the TreeView ID, the predefined server color palette (`SERVER_COLORS`), the default HTTP port, and the Output channel name prefix.

## Models

### types.ts

Defines the core interfaces with no logic or VS Code dependency:

- `ServerState` — `'stopped' | 'starting' | 'running' | 'stopping' | 'error'`
- `ServerConfig` — persisted shape: id, name, color, Tomcat path, port, optional Java home and JVM options, creation timestamp
- `ServerRuntime` — in-memory only: current state, PID, last error, last state-change timestamp
- `WebviewInbound` / `WebviewOutbound` — typed messages exchanged with the config Webview

### server.ts

`TomcatServer` wraps one `ServerConfig` with its live `ServerRuntime` and extends `EventEmitter`. `setState()` is the only sanctioned mutator: it updates state, timestamps the change, clears the PID on stop, records the error message on failure, and emits `state-changed`. Exposes `displayLabel` and `statusDescription` for UI consumption.

## Services

### serverManager.ts

In-memory registry of `TomcatServer` instances, backed by `context.globalState`. Responsibilities:

- `init()` — loads persisted configs and constructs a `TomcatServer` for each
- `list()` — all servers sorted by creation time
- `get(id)` — lookup by id
- `add()` — creates a config with a new UUID, persists, returns the server
- `update()` — patches a config in place and persists
- `remove()` — deletes from the map and persists
- `onChanged` — fires whenever the list changes or any server's state changes, driving every UI provider

### processManager.ts

Owns the actual Tomcat child processes.

- `startProcess(server)` — resolves `catalina.sh`/`catalina.bat`, builds the environment (`CATALINA_HOME`, `CATALINA_BASE`, `JAVA_HOME`, `CATALINA_OPTS`), spawns the process attached in foreground mode, streams output to the server's log channel, and resolves once the "Server startup in ... milliseconds" line appears (or rejects on early exit)
- `stopProcess(server)` — sends `SIGTERM`, then force-kills with `SIGKILL` after a configurable timeout (`tomcatRunner.shutdownTimeoutMs`) if the process has not exited
- `isProcessAlive(id)` — checks whether a child process is currently tracked
- `killAll()` — force-kills every tracked process; called from `deactivate()`

### mavenService.ts

Builds Maven projects.

- `isMavenProject(dir)` — checks for a `pom.xml`
- `buildProject(dir)` — runs `mvn clean package -DskipTests`, streams output to a channel, reads `pom.xml` with a lightweight regex parser to detect packaging (`war`/`jar`) and the presence of `spring-boot-maven-plugin`, then locates the produced artifact under `target/`, excluding `-sources` and `-javadoc` jars

### deployService.ts

Moves build artifacts into a Tomcat instance.

- `deployArtifact(server, artifact, contextPath)` — rejects Spring Boot fat JARs outright (they embed their own server and should run via `java -jar`), copies a `.war` into `<CATALINA_HOME>/webapps/<context>.war`, and removes any previous file or exploded directory at that context path first
- `undeployApp(server, contextPath)` — removes both the `.war` and its exploded directory
- `listDeployedApps(server)` — lists deployed context paths, excluding Tomcat's bundled apps (`ROOT`, `docs`, `examples`, `host-manager`, `manager`)
- `cleanWebapps(server)` — undeploys every non-builtin app
- `pickProjectFolder()` — resolves the workspace folder to build, prompting the user when there is more than one

## Providers

### serverTreeProvider.ts

`TreeDataProvider` for the sidebar. Root nodes are `ServerNode` instances (one per configured server); each can expand into `AppNode` children representing deployed applications. `ServerNode.contextValue` is set to `server.<state>` and `AppNode.contextValue` to `app`, which `package.json`'s `view/item/context` menu `when` clauses match against to decide which inline buttons to show. Icons and colors are resolved from the server's `colorId` and current `state`. Clicking an `AppNode` opens its URL in the browser.

### statusBarProvider.ts

A single status bar item showing the count of running servers (for example, "Tomcat: 2 running"). Hidden entirely when no servers are configured. Clicking it focuses the Tomcat Runner Activity Bar view. Refreshes on every `serverManager.onChanged` event.

## Commands

### serverCommands.ts

Lifecycle commands, each resolving its target server from a tree node argument or a QuickPick prompt:

- `startServer` — re-validates the Tomcat install path, guards against double-start, sets `starting`, calls `processManager.startProcess`, sets `running` with the PID on success or `error` on failure, and optionally opens the browser if `autoOpenBrowserOnStart` is enabled
- `stopServer` — guards against stopping an already-stopped server, sets `stopping`, calls `processManager.stopProcess`, sets `stopped`
- `restartServer` — stops if alive, then starts
- `openInBrowser` — opens `http://localhost:<port>/` in the default browser
- `viewLogs` — reveals the server's Output channel

### configCommands.ts

Registry management commands:

- `addServer` — opens the config Webview, persists the result through `serverManager.add`
- `editServer` — if the server is running, asks for confirmation to stop it first, then opens the Webview pre-filled and applies the patch through `serverManager.update`
- `removeServer` — confirms destructively, stops the process if running, disposes its log channel, removes it from the registry

### deployCommands.ts

Build and deploy commands:

- `deployProject` — branches on how it was invoked (right-click on `pom.xml`, right-click on a pre-built `.war`/`.jar`, right-click on a server node, or the Command Palette with no argument), runs the Maven build when needed, validates the artifact exists on disk, prompts for a destination server and a context path, then deploys and offers to open the result in the browser
- `undeployProject` — confirms and removes a deployed app, invoked from an `AppNode`'s context menu
- `cleanWebappsCmd` — confirms and removes every non-builtin app from a server

## UI Helpers

### quickPick.ts

`pickServer()` shows a `QuickPick` of configured servers (with an optional filter) and warns when none match. `pickColor()` shows a `QuickPick` of the predefined color palette.

### configWebview.ts

Renders the Add/Edit Server form as a `WebviewPanel`. Uses a strict Content-Security-Policy with a per-render nonce and only VS Code theme CSS variables, so the form always matches the user's active color theme. Communicates with the extension host via `postMessage`: outbound `init` (prefill data and color list) and `browsed` (folder picker result); inbound `save` (validated before the panel closes), `cancel`, and `browse` (opens a native folder picker for `catalinaHome` or `javaHome`).

## Utilities

### fs.ts

Platform-aware file system helpers: `isDir`, `isFile`, `IS_WIN`, `resolveCatalinaScript` (locates `startup.sh`/`startup.bat` or `shutdown.sh`/`shutdown.bat`), `webappsDir`, `catalinaLogFile`, `copyFile`, `rmDirIfExists`, `rmFileIfExists`, `listDir`.

### logger.ts

`LoggerService` manages one `OutputChannel` per server (named `Tomcat: <name>`) plus a global channel (`Tomcat Runner`), created lazily on first use. `disposeServer()` removes a channel when its server is deleted; `dispose()` clears all channels on deactivation.

### validator.ts

Pre-persistence validation:

- `validateCatalinaHome` — confirms the folder exists and contains `bin/`, `conf/server.xml`, `webapps/`, and a startup script
- `validatePort` — integer between 1 and 65535
- `validateName` — non-empty, 40 characters or fewer

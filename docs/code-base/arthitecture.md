# Architecture

# Folder Layout

```
src/
├── extension.ts
├── constants.ts
│
├── commands/
│   ├── configCommands.ts
│   ├── deployCommands.ts
│   └── serverCommands.ts
│
├── models/
│   ├── server.ts
│   └── types.ts
│
├── providers/
│   ├── serverTreeProvider.ts
│   └── statusBarProvider.ts
│
├── services/
│   ├── deployService.ts
│   ├── mavenService.ts
│   ├── processManager.ts
│   └── serverManager.ts
│
├── test/
│   ├── mocks/
│   │   ├── registerMock.js
│   │   └── vscode.mock.ts
│   └── suite/
│       ├── model/
│       ├── service/
│       ├── utils/
│       ├── validator/
│       └── .monarch.json
│
├── ui/
│   ├── configWebview.ts
│   └── quickPick.ts
│
└── utils/
    ├── fs.ts
    ├── logger.ts
    └── validator.ts
```

## Layer Responsibilities

**models** — Plain data shapes and the `TomcatServer` runtime wrapper. No VS Code UI calls. `types.ts` defines persisted and in-memory shapes; `server.ts` wraps a config with live state and exposes a `state-changed` event.

**services** — Business logic with no UI calls. `serverManager` owns the in-memory registry and persistence. `processManager` spawns and kills the Tomcat process. `mavenService` builds Maven projects. `deployService` copies build artifacts into a server's `webapps` folder.

**providers** — VS Code UI providers driven by service state. `serverTreeProvider` renders the sidebar TreeView. `statusBarProvider` renders the running-server count in the status bar.

**commands** — Handlers registered against command IDs in `extension.ts`. Each command resolves its target (from a tree node, a QuickPick, or an argument), performs the action through a service, and reports the result via VS Code notifications.

**ui** — Reusable interactive helpers. `quickPick` supplies server and color pickers. `configWebview` renders the Add/Edit Server form as a Webview panel.

**utils** — Pure helpers with no VS Code dependency beyond what is necessary. `fs` wraps file system checks and Tomcat path resolution. `logger` manages one Output channel per server plus a global channel. `validator` checks user input before it is persisted.

## Data Flow

1. `extension.ts` activates, initializes `serverManager` from `globalState`, and registers the tree view, status bar, and all commands.
2. UI providers subscribe to `serverManager.onChanged` and `TomcatServer`'s `state-changed` event, re-rendering whenever either fires.
3. Commands call into services (`processManager`, `mavenService`, `deployService`) and mutate `TomcatServer` state through `setState()`, which is the only sanctioned way to change runtime state.
4. `serverManager.persist()` writes the config array back to `globalState` on every add, update, or remove.

## Process Model

Each Tomcat server runs as a child process started with `catalina.sh run` (or `catalina.bat run` on Windows), kept in the foreground so its stdout/stderr can be streamed directly into the server's Output channel and so the extension retains control over its lifecycle. `startup.sh` is deliberately avoided because it detaches and cannot be reliably stopped.

## Persistence Model

Server configurations are stored as a JSON array under the `tomcatRunner.servers.v1` key in `context.globalState`. Only the `ServerConfig` shape is persisted; runtime state (`ServerRuntime`) is rebuilt fresh on every activation and is never written to disk.

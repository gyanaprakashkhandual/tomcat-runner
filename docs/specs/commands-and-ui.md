# Commands and UI Flows

## Command Reference

| Command ID                     | Title                | Triggered from                                                           |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------ |
| `tomcatRunner.addServer`       | Add Tomcat Server    | View title bar, viewsWelcome link                                        |
| `tomcatRunner.editServer`      | Edit Server          | Tree item context menu                                                   |
| `tomcatRunner.removeServer`    | Remove Server        | Tree item context menu                                                   |
| `tomcatRunner.startServer`     | Start                | Tree item inline action (stopped servers)                                |
| `tomcatRunner.stopServer`      | Stop                 | Tree item inline action (running servers)                                |
| `tomcatRunner.restartServer`   | Restart              | Tree item inline action (running servers)                                |
| `tomcatRunner.openInBrowser`   | Open in Browser      | Tree item inline action (running servers)                                |
| `tomcatRunner.viewLogs`        | View Logs            | Tree item context menu (any configured server)                           |
| `tomcatRunner.deployProject`   | Deploy to Tomcat     | Tree item context menu, Explorer context menu on `pom.xml`/`.war`/`.jar` |
| `tomcatRunner.undeployProject` | Undeploy             | Tree item inline action (deployed app nodes)                             |
| `tomcatRunner.cleanWebapps`    | Clean Webapps Folder | Command Palette                                                          |
| `tomcatRunner.refresh`         | Refresh              | View title bar                                                           |

All commands are registered under the `Tomcat` category in the Command Palette.

## Tree View Structure

```
Tomcat Servers (sidebar view)
├── Local Dev            [running, green]
│   ├── /myapp
│   └── /admin-console
├── QA                    [stopped, blue]
└── Staging               [error, red]
```

- Server nodes show a status description (Running on :8080 (PID 1234), Starting…, Stopped, Error: ...) and a colored state icon.
- Server nodes expand to show their deployed applications.
- Clicking an application node opens its URL directly in the browser.
- The `contextValue` on each node (`server.running`, `server.stopped`, `server.starting`, `server.stopping`, `server.error`, or `app`) determines which inline buttons and context-menu entries VS Code displays, matched against `when` clauses in `package.json`.

## Status Bar

A single status bar item on the left side shows the count of running servers and is hidden entirely until at least one server is configured. Clicking it opens the Tomcat Runner Activity Bar container.

## Add / Edit Server Form

A Webview panel collects:

- Server name (required, up to 40 characters)
- Color (one of six predefined options)
- Tomcat folder / `CATALINA_HOME` (required, validated against the real Tomcat folder structure)
- HTTP port (required, 1–65535)
- Java home override (optional)
- `CATALINA_OPTS` (optional JVM arguments)

Folder fields offer a native Browse button backed by `vscode.window.showOpenDialog`. Validation runs before the form closes; failures are shown inline without closing the panel. Editing a running server first asks for confirmation to stop it.

## Deploy Flow

1. Triggered by right-clicking `pom.xml`, a `.war`, or a `.jar` in the Explorer; right-clicking a server in the tree; or running the command with no context.
2. If the source is a `pom.xml`, the extension runs `mvn clean package -DskipTests` and streams output to the global Output channel.
3. If the source is a pre-built `.war` or `.jar`, the build step is skipped.
4. Spring Boot fat JARs are rejected with an explanation, since they embed their own Tomcat instance.
5. The user picks a destination server (if not already implied) and confirms a context path.
6. The artifact is copied into the destination server's `webapps` folder, replacing any previous version at that context path.
7. On success, the user is offered a button to open the deployed application in the browser.

## Notifications and Confirmations

- Destructive actions (remove server, undeploy, clean webapps) use a modal `showWarningMessage` confirmation.
- Long-running actions (start, stop, build, deploy) use `withProgress` notifications.
- Errors during start, build, or deploy are surfaced with `showErrorMessage` and also written to the relevant Output channel.

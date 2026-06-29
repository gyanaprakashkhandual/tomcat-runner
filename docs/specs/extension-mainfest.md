# Extension Manifest Spec

Source: `package.json`

## Identity

| Field            | Value              |
| ---------------- | ------------------ |
| name             | tomcat-runner      |
| displayName      | Tomcat Runner      |
| version          | 1.0.0              |
| publisher        | your-publisher-id  |
| engines.vscode   | ^1.80.0            |
| categories       | Other, Debuggers   |
| activationEvents | onStartupFinished  |
| main             | ./out/extension.js |

## Views Container

- Activity Bar container: `tomcatRunner` ("Tomcat Runner"), icon `resources/icons/tomcat.svg`
- View: `tomcatServers` ("Servers") inside that container
- Welcome content on the empty view: prompts the user to run "Add Tomcat Server"

## Commands

All commands use the `Tomcat` category.

| Command ID                   | Title                | Icon              |
| ---------------------------- | -------------------- | ----------------- |
| tomcatRunner.addServer       | Add Tomcat Server    | $(add)            |
| tomcatRunner.editServer      | Edit Server          | $(gear)           |
| tomcatRunner.removeServer    | Remove Server        | $(trash)          |
| tomcatRunner.startServer     | Start                | $(play)           |
| tomcatRunner.stopServer      | Stop                 | $(debug-stop)     |
| tomcatRunner.restartServer   | Restart              | $(debug-restart)  |
| tomcatRunner.openInBrowser   | Open in Browser      | $(globe)          |
| tomcatRunner.viewLogs        | View Logs            | $(output)         |
| tomcatRunner.deployProject   | Deploy to Tomcat     | $(cloud-upload)   |
| tomcatRunner.undeployProject | Undeploy             | $(cloud-download) |
| tomcatRunner.cleanWebapps    | Clean Webapps Folder | $(clear-all)      |
| tomcatRunner.refresh         | Refresh              | $(refresh)        |

## Menu Contributions

**view/title** (on `tomcatServers`): Add Server, Refresh.

**view/item/context** (on `tomcatServers`), keyed by `contextValue`:

- `server.stopped` → Start (inline)
- `server.running` → Stop, Restart, Open in Browser (inline)
- `server.*` (regex match) → View Logs, Deploy to Tomcat, Edit Server, Remove Server
- `app` → Undeploy (inline)

**explorer/context**: Deploy to Tomcat, shown when the selected file is named `pom.xml` or has extension `.war` or `.jar`.

## Configuration Properties

| Setting                             | Type    | Default | Description                                             |
| ----------------------------------- | ------- | ------- | ------------------------------------------------------- |
| tomcatRunner.javaHome               | string  | ""      | Override JAVA_HOME for Tomcat processes                 |
| tomcatRunner.mavenExecutable        | string  | "mvn"   | Path to the Maven executable                            |
| tomcatRunner.autoOpenBrowserOnStart | boolean | false   | Open the browser automatically when a server starts     |
| tomcatRunner.shutdownTimeoutMs      | number  | 15000   | Time to wait for graceful shutdown before force-killing |

## Build Scripts

| Script            | Command          |
| ----------------- | ---------------- |
| vscode:prepublish | npm run compile  |
| compile           | tsc -p ./        |
| watch             | tsc -watch -p ./ |

## Dev Dependencies

`@types/node` ^20.0.0, `@types/vscode` ^1.80.0, `typescript` ^5.3.0

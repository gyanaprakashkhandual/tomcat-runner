# Tomcat Runner

A VS Code extension to manage Apache Tomcat servers and deploy Spring Boot, Java, and Maven projects without leaving the editor.

## Features

- Manage multiple Tomcat servers, each with a custom name and colour
- Start, stop, and restart servers from the sidebar, command palette, or status bar
- Deploy in one click — right-click `pom.xml` and select Deploy to Tomcat
- View per-server logs in dedicated Output channels
- Open your running app directly in the browser
- Undeploy apps without touching the file system
- All server settings persist across editor restarts

## Getting Started

1. Click the Tomcat icon in the Activity Bar
2. Click Add Server and browse to your Apache Tomcat folder
3. Set a name, colour, and HTTP port, then save
4. Click Start next to your server
5. Right-click `pom.xml` in the Explorer and select Deploy to Tomcat

## Settings

| Setting                               | Description                                     |
| ------------------------------------- | ----------------------------------------------- |
| `tomcatRunner.javaHome`               | Override `JAVA_HOME` for Tomcat processes       |
| `tomcatRunner.mavenExecutable`        | Path to `mvn` executable (defaults to PATH)     |
| `tomcatRunner.autoOpenBrowserOnStart` | Open browser automatically when a server starts |
| `tomcatRunner.shutdownTimeoutMs`      | Graceful shutdown timeout before force-kill     |

## Building from Source

```bash
git clone <repo-url>
cd tomcat-runner
npm install
npm run compile
```

Press F5 in VS Code to launch an Extension Development Host.

To package a `.vsix`:

```bash
npm install -g @vscode/vsce
vsce package
```

## License

MIT

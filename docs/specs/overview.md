# Tomcat Runner — Overview

Tomcat Runner is a VS Code extension for managing Apache Tomcat servers and deploying Java, Maven, and Spring Boot projects without leaving the editor.

## Purpose

The extension lets a developer register one or more local Tomcat installations, control their lifecycle (start, stop, restart), and deploy build artifacts to them directly from VS Code, using the Activity Bar, a TreeView, the Command Palette, the status bar, and a Webview form.

## Core Capabilities

- Register multiple Tomcat servers, each with a name, color, and HTTP port
- Start, stop, and restart servers from the sidebar, status bar, or Command Palette
- Deploy a Maven-built WAR to a server with a single command
- View per-server logs in dedicated Output channels
- Open a running server in the default browser
- Undeploy individual applications or clear all deployed apps
- Persist server configuration across editor restarts

## Technology

- Language: TypeScript, compiled with `tsc`
- Platform: VS Code Extension API (`^1.80.0`)
- Runtime dependencies: none beyond Node's built-in `child_process`, `fs`, `path`, and `crypto` modules
- Build output: `out/extension.js`, loaded as the extension's `main` entry point

## Document Map

| File                       | Contents                                                |
| -------------------------- | ------------------------------------------------------- |
| `01-overview.md`           | This file — purpose, capabilities, technology           |
| `02-architecture.md`       | Folder layout and layer responsibilities                |
| `03-modules.md`            | File-by-file reference for every source module          |
| `04-commands-and-ui.md`    | Commands, tree view behavior, and UI flows              |
| `05-extension-manifest.md` | `package.json` contribution points (the extension spec) |

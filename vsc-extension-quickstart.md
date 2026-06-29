# VS Code Extension Quickstart

## What's in the Folder

- `package.json` — the extension manifest. Declares commands, views, menus, and configuration settings.
- `src/extension.ts` — the entry point. Exports `activate()` and `deactivate()`.
- `src/` — all source code, organized into `models`, `services`, `providers`, `commands`, `ui`, and `utils`.

## Get Up and Running

1. Run `npm install` to install dependencies.
2. Press `F5` to open a new window with the extension loaded (Extension Development Host).
3. Open the **Tomcat Runner** icon in the Activity Bar.
4. Click **Add Server** and point it at a local Apache Tomcat installation.
5. Set breakpoints in `src/` to debug the extension.
6. Find console output in the Debug Console.

## Make Changes

- You can relaunch the extension from the debug toolbar after changing code in `src/`.
- You can also reload (`Ctrl+R` / `Cmd+R` on macOS) the VS Code window with the extension to load your changes.

## Run Tests

1. Open the Debug viewlet (`Ctrl+Shift+D` / `Cmd+Shift+D`) and select **Extension Tests** from the dropdown.
2. Press `F5` to run the tests in a new window.
3. See the output of the test result in the Debug Console.

## Build and Package

```bash
npm run compile        # compile TypeScript to out/
npm install -g @vscode/vsce
vsce package           # produce a .vsix package
```

## Explore More

- Follow the [UX guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) to create extensions that fit naturally into VS Code.
- See the [Extension API](https://code.visualstudio.com/api) documentation for details on individual contribution points.
- See `STRUCTURE.md` in this repository for a full file-by-file breakdown of the codebase.

/**
 * ui/configWebview.ts
 * --------------------------------------------------------------------
 * Renders an "Add / Edit Server" webview panel — single, consistent
 * theme that uses VS Code's CSS variables so it blends with whatever
 * VS Code theme the user is on.
 *
 * Message protocol (extension ↔ webview):
 *   Out (extension → webview): { type: 'init', payload: {...} }
 *   In  (webview → extension): { type: 'save', payload: {...} }
 *                              { type: 'cancel' }
 *                              { type: 'browse', field: 'catalinaHome' | 'javaHome' }
 */

import * as vscode from "vscode";
import { ServerConfig } from "../models/types";
import { SERVER_COLORS, DEFAULT_HTTP_PORT } from "../constants";
import {
  validateCatalinaHome,
  validateName,
  validatePort,
} from "../utils/validator";

/**
 * Opens the form and resolves with the user-entered config, or
 * undefined if they cancelled / closed the panel.
 */
export function openConfigWebview(
  context: vscode.ExtensionContext,
  existing?: ServerConfig,
): Promise<Omit<ServerConfig, "id" | "createdAt"> | undefined> {
  return new Promise((resolve) => {
    const panel = vscode.window.createWebviewPanel(
      "tomcatRunner.config",
      existing ? `Edit Server — ${existing.name}` : "Add Tomcat Server",
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    panel.webview.html = renderHtml(panel.webview, context);
    let settled = false;

    // Send initial state once the webview loads.
    panel.webview.postMessage({
      type: "init",
      payload: { config: existing, colors: SERVER_COLORS },
    });

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "save": {
          const payload = msg.payload as Partial<ServerConfig>;
          // Validate before closing
          const nameRes = validateName(payload.name ?? "");
          const homeRes = validateCatalinaHome(payload.catalinaHome ?? "");
          const portRes = validatePort(payload.httpPort ?? 0);
          const firstErr = [nameRes, homeRes, portRes].find(
            (r) => !r.ok,
          )?.message;
          if (firstErr) {
            panel.webview.postMessage({
              type: "validation-error",
              message: firstErr,
            });
            return;
          }
          settled = true;
          resolve({
            name: payload.name!.trim(),
            colorId: payload.colorId ?? SERVER_COLORS[0].id,
            catalinaHome: payload.catalinaHome!.trim(),
            httpPort: payload.httpPort!,
            javaHome: payload.javaHome?.trim() || undefined,
            catalinaOpts: payload.catalinaOpts?.trim() || undefined,
          });
          panel.dispose();
          return;
        }
        case "cancel": {
          settled = true;
          resolve(undefined);
          panel.dispose();
          return;
        }
        case "browse": {
          const dialog = await vscode.window.showOpenDialog({
            canSelectFolders:
              msg.field === "catalinaHome" || msg.field === "javaHome",
            canSelectFiles: false,
            canSelectMany: false,
            title:
              msg.field === "catalinaHome"
                ? "Select Tomcat installation folder"
                : "Select Java home folder",
          });
          if (dialog?.[0]) {
            panel.webview.postMessage({
              type: "browsed",
              field: msg.field,
              value: dialog[0].fsPath,
            });
          }
          return;
        }
      }
    });

    panel.onDidDispose(() => {
      if (!settled) {
        resolve(undefined);
      }
    });
  });
}

/** Builds the webview HTML. Uses VS Code CSS variables for theming. */
function renderHtml(
  webview: vscode.Webview,
  _ctx: vscode.ExtensionContext,
): string {
  const nonce = generateNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="${csp}"/>
<style>
  /* All colours come from VS Code theme variables — keeps a single, consistent look. */
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size)}
  body{padding:18px 22px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
  h1{font-size:14px;font-weight:600;margin-bottom:14px;color:var(--vscode-foreground)}
  .field{margin-bottom:12px}
  label{display:block;font-size:11px;font-weight:500;color:var(--vscode-descriptionForeground);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
  input[type=text],input[type=number],textarea{
    width:100%;padding:5px 8px;font-size:12px;
    background:var(--vscode-input-background);color:var(--vscode-input-foreground);
    border:1px solid var(--vscode-input-border,transparent);border-radius:3px;outline:none;
  }
  input:focus,textarea:focus{border-color:var(--vscode-focusBorder)}
  textarea{min-height:60px;resize:vertical;font-family:var(--vscode-editor-font-family);font-size:11px}
  .row{display:flex;gap:8px}
  .row .field{flex:1}
  .browse{display:flex;gap:6px}
  .browse input{flex:1}
  button{
    padding:4px 12px;font-size:11px;font-weight:500;cursor:pointer;border:none;border-radius:3px;
    background:var(--vscode-button-background);color:var(--vscode-button-foreground);
  }
  button:hover{background:var(--vscode-button-hoverBackground)}
  button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
  button.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}
  .colors{display:flex;gap:6px;flex-wrap:wrap}
  .color-pill{
    width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;
    transition:transform .12s;
  }
  .color-pill:hover{transform:scale(1.12)}
  .color-pill.selected{border-color:var(--vscode-focusBorder)}
  .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--vscode-panel-border)}
  .err{
    margin-top:10px;padding:6px 10px;font-size:11px;border-radius:3px;
    background:var(--vscode-inputValidation-errorBackground,rgba(255,0,0,.1));
    color:var(--vscode-inputValidation-errorForeground,inherit);
    border:1px solid var(--vscode-inputValidation-errorBorder,rgba(255,0,0,.3));
    display:none;
  }
  .err.show{display:block}
  .help{font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px}
</style>
</head>
<body>

<h1 id="title">Add Tomcat Server</h1>

<div class="field">
  <label for="name">Server Name</label>
  <input id="name" type="text" placeholder="e.g. Local Dev" maxlength="40"/>
</div>

<div class="field">
  <label>Colour</label>
  <div class="colors" id="colors"></div>
</div>

<div class="field">
  <label for="catalinaHome">Tomcat Folder (CATALINA_HOME)</label>
  <div class="browse">
    <input id="catalinaHome" type="text" placeholder="/opt/apache-tomcat-10.x or C:\\apache-tomcat-10.x"/>
    <button class="secondary" id="browseHome">Browse…</button>
  </div>
  <div class="help">Folder containing bin/, conf/, webapps/</div>
</div>

<div class="row">
  <div class="field">
    <label for="port">HTTP Port</label>
    <input id="port" type="number" min="1" max="65535" value="${DEFAULT_HTTP_PORT}"/>
  </div>
  <div class="field" style="flex:2">
    <label for="javaHome">Java Home (optional)</label>
    <div class="browse">
      <input id="javaHome" type="text" placeholder="Leave blank to use system JAVA_HOME"/>
      <button class="secondary" id="browseJava">Browse…</button>
    </div>
  </div>
</div>

<div class="field">
  <label for="catalinaOpts">CATALINA_OPTS (optional)</label>
  <textarea id="catalinaOpts" placeholder="-Xms512m -Xmx2g -Dspring.profiles.active=dev"></textarea>
  <div class="help">JVM args passed to the Tomcat process</div>
</div>

<div class="err" id="err"></div>

<div class="actions">
  <button class="secondary" id="cancel">Cancel</button>
  <button id="save">Save Server</button>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  let selectedColor = '';

  // Render the colour pills using the actual chart hex values so the
  // user sees the colour they're picking (themeId resolves at TreeItem time).
  const COLOR_HEX = {
    blue:'#3794ff',green:'#89d185',red:'#f14c4c',
    orange:'#cc8b29',purple:'#b180d7',yellow:'#e8e87d'
  };

  function renderColors(colors){
    const wrap = $('colors');
    wrap.innerHTML = '';
    colors.forEach(c => {
      const pill = document.createElement('div');
      pill.className = 'color-pill';
      pill.style.background = COLOR_HEX[c.id] || '#888';
      pill.dataset.id = c.id;
      pill.title = c.label;
      pill.onclick = () => {
        selectedColor = c.id;
        wrap.querySelectorAll('.color-pill').forEach(p => p.classList.toggle('selected', p.dataset.id === c.id));
      };
      wrap.appendChild(pill);
    });
    // default
    if (!selectedColor) {
      selectedColor = colors[0].id;
      wrap.firstChild.classList.add('selected');
    }
  }

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'init') {
      const { config, colors } = msg.payload;
      renderColors(colors);
      if (config) {
        $('title').textContent = 'Edit Server — ' + config.name;
        $('name').value         = config.name;
        $('catalinaHome').value = config.catalinaHome;
        $('port').value         = config.httpPort;
        $('javaHome').value     = config.javaHome || '';
        $('catalinaOpts').value = config.catalinaOpts || '';
        selectedColor           = config.colorId;
        document.querySelectorAll('.color-pill').forEach(p => p.classList.toggle('selected', p.dataset.id === config.colorId));
      }
    }
    if (msg.type === 'browsed') {
      $(msg.field).value = msg.value;
    }
    if (msg.type === 'validation-error') {
      const err = $('err');
      err.textContent = msg.message;
      err.classList.add('show');
    }
  });

  $('browseHome').onclick = () => vscode.postMessage({ type: 'browse', field: 'catalinaHome' });
  $('browseJava').onclick = () => vscode.postMessage({ type: 'browse', field: 'javaHome' });
  $('cancel').onclick     = () => vscode.postMessage({ type: 'cancel' });
  $('save').onclick       = () => {
    $('err').classList.remove('show');
    vscode.postMessage({
      type: 'save',
      payload: {
        name:         $('name').value,
        colorId:      selectedColor,
        catalinaHome: $('catalinaHome').value,
        httpPort:     parseInt($('port').value, 10) || 0,
        javaHome:     $('javaHome').value,
        catalinaOpts: $('catalinaOpts').value
      }
    });
  };
</script>
</body>
</html>`;
}

/** Crypto-style nonce for CSP. */
function generateNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

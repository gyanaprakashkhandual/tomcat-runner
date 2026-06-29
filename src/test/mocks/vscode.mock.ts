/**
 * A minimal, in-memory stand-in for the `vscode` module.
 *
 * Only implements the surface area that src/ actually calls. This lets
 * services/providers/commands be unit-tested in plain Node — no
 * Extension Development Host, no Electron, fast CI.
 *
 * Registered as the `vscode` module via Mocha's `--require` hook
 * (see test/mocks/registerMock.js) so `import * as vscode from 'vscode'`
 * resolves to this file during tests.
 */

import { EventEmitter as NodeEventEmitter } from "events";

// ── EventEmitter ───────────────────────────────────────────────────────
// Mirrors vscode.EventEmitter<T>: `.event` is the subscribe function,
// `.fire()` triggers listeners.
export class EventEmitter<T> {
  private readonly emitter = new NodeEventEmitter();
  private static SIG = "fire";

  public readonly event = (listener: (e: T) => any): Disposable => {
    this.emitter.on(EventEmitter.SIG, listener);
    return { dispose: () => this.emitter.off(EventEmitter.SIG, listener) };
  };

  public fire(data?: T): void {
    this.emitter.emit(EventEmitter.SIG, data);
  }

  public dispose(): void {
    this.emitter.removeAllListeners();
  }
}

export interface Disposable {
  dispose(): void;
}

// ── ThemeColor / ThemeIcon ─────────────────────────────────────────────
export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor,
  ) {}
}

// ── Uri ─────────────────────────────────────────────────────────────────
export class Uri {
  private constructor(
    public readonly fsPath: string,
    public readonly scheme = "file",
  ) {}
  public static parse(value: string): Uri {
    return new Uri(value);
  }
  public static file(path: string): Uri {
    return new Uri(path);
  }
  public toString(): string {
    return this.fsPath;
  }
}

// ── MarkdownString ──────────────────────────────────────────────────────
export class MarkdownString {
  public value = "";
  public isTrusted = false;
  constructor(initial?: string, _supportThemeIcons?: boolean) {
    this.value = initial ?? "";
  }
  public appendMarkdown(text: string): this {
    this.value += text;
    return this;
  }
}

// ── TreeItem ─────────────────────────────────────────────────────────────
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  public description?: string;
  public tooltip?: string | MarkdownString;
  public contextValue?: string;
  public iconPath?: ThemeIcon;
  public id?: string;
  public command?: { command: string; title: string; arguments?: any[] };
  constructor(
    public label: string,
    public collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None,
  ) {}
}

// ── StatusBarItem ─────────────────────────────────────────────────────────
export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class StatusBarItemMock implements Disposable {
  public text = "";
  public tooltip = "";
  public command: string | undefined;
  public backgroundColor: ThemeColor | undefined;
  private visible = false;
  public show(): void {
    this.visible = true;
  }
  public hide(): void {
    this.visible = false;
  }
  public dispose(): void {
    /* no-op */
  }
  public isVisible(): boolean {
    return this.visible;
  }
}

// ── OutputChannel ─────────────────────────────────────────────────────────
export class OutputChannelMock implements Disposable {
  public readonly lines: string[] = [];
  public shown = false;
  constructor(public readonly name: string) {}
  public appendLine(value: string): void {
    this.lines.push(value);
  }
  public append(value: string): void {
    if (this.lines.length === 0) {
      this.lines.push(value);
    } else {
      this.lines[this.lines.length - 1] += value;
    }
  }
  public clear(): void {
    this.lines.length = 0;
  }
  public show(_preserveFocus?: boolean): void {
    this.shown = true;
  }
  public hide(): void {
    this.shown = false;
  }
  public dispose(): void {
    /* no-op */
  }
}

// ── WorkspaceConfiguration ─────────────────────────────────────────────────
class WorkspaceConfigurationMock {
  constructor(private readonly values: Record<string, any> = {}) {}
  public get<T>(key: string, defaultValue?: T): T {
    return key in this.values ? this.values[key] : (defaultValue as T);
  }
}

// ── Mutable mock state — tests can poke these directly ───────────────────
export const __mockState = {
  configuration: {} as Record<string, Record<string, any>>,
  workspaceFolders: [] as Array<{ uri: Uri; name: string; index: number }>,
  showInformationMessage: {
    lastArgs: undefined as any[] | undefined,
    returnValue: undefined as any,
  },
  showWarningMessage: {
    lastArgs: undefined as any[] | undefined,
    returnValue: undefined as any,
  },
  showErrorMessage: {
    lastArgs: undefined as any[] | undefined,
    returnValue: undefined as any,
  },
  showInputBox: { returnValue: undefined as string | undefined },
  showOpenDialog: { returnValue: undefined as Uri[] | undefined },
  showQuickPick: { returnValue: undefined as any },
  showWorkspaceFolderPick: { returnValue: undefined as any },
  openExternal: { calls: [] as Uri[] },
  outputChannels: new Map<string, OutputChannelMock>(),

  /** Reset all mutable mock state between tests. */
  reset(): void {
    this.configuration = {};
    this.workspaceFolders = [];
    this.showInformationMessage = {
      lastArgs: undefined,
      returnValue: undefined,
    };
    this.showWarningMessage = { lastArgs: undefined, returnValue: undefined };
    this.showErrorMessage = { lastArgs: undefined, returnValue: undefined };
    this.showInputBox = { returnValue: undefined };
    this.showOpenDialog = { returnValue: undefined };
    this.showQuickPick = { returnValue: undefined };
    this.showWorkspaceFolderPick = { returnValue: undefined };
    this.openExternal = { calls: [] };
    this.outputChannels = new Map();
  },
};

// ── window ──────────────────────────────────────────────────────────────
export const window = {
  createOutputChannel(name: string): OutputChannelMock {
    let ch = __mockState.outputChannels.get(name);
    if (!ch) {
      ch = new OutputChannelMock(name);
      __mockState.outputChannels.set(name, ch);
    }
    return ch;
  },
  createStatusBarItem(
    _alignment?: StatusBarAlignment,
    _priority?: number,
  ): StatusBarItemMock {
    return new StatusBarItemMock();
  },
  createTreeView(_viewId: string, _options: any): Disposable {
    return { dispose: () => undefined };
  },
  createWebviewPanel(
    _viewType: string,
    _title: string,
    _column: any,
    _options: any,
  ): any {
    const listeners: Array<(msg: any) => void> = [];
    const disposeListeners: Array<() => void> = [];
    return {
      webview: {
        cspSource: "mock-csp",
        html: "",
        postMessage: (_msg: any) => Promise.resolve(true),
        onDidReceiveMessage: (cb: (msg: any) => void) => {
          listeners.push(cb);
          return { dispose: () => undefined };
        },
      },
      onDidDispose: (cb: () => void) => {
        disposeListeners.push(cb);
        return { dispose: () => undefined };
      },
      dispose: () => disposeListeners.forEach((cb) => cb()),
      // Test helper — not part of the real API — lets tests drive messages.
      __simulateMessage: (msg: any) => listeners.forEach((cb) => cb(msg)),
    };
  },
  showInformationMessage(...args: any[]): Promise<any> {
    __mockState.showInformationMessage.lastArgs = args;
    return Promise.resolve(__mockState.showInformationMessage.returnValue);
  },
  showWarningMessage(...args: any[]): Promise<any> {
    __mockState.showWarningMessage.lastArgs = args;
    return Promise.resolve(__mockState.showWarningMessage.returnValue);
  },
  showErrorMessage(...args: any[]): Promise<any> {
    __mockState.showErrorMessage.lastArgs = args;
    return Promise.resolve(__mockState.showErrorMessage.returnValue);
  },
  showInputBox(_options?: any): Promise<string | undefined> {
    return Promise.resolve(__mockState.showInputBox.returnValue);
  },
  showOpenDialog(_options?: any): Promise<Uri[] | undefined> {
    return Promise.resolve(__mockState.showOpenDialog.returnValue);
  },
  showQuickPick(_items?: any, _options?: any): Promise<any> {
    return Promise.resolve(__mockState.showQuickPick.returnValue);
  },
  showWorkspaceFolderPick(_options?: any): Promise<any> {
    return Promise.resolve(__mockState.showWorkspaceFolderPick.returnValue);
  },
  withProgress(
    _options: any,
    task: (progress: any, token: any) => Promise<any>,
  ): Promise<any> {
    return task(
      { report: () => undefined },
      { isCancellationRequested: false },
    );
  },
};

// ── env ─────────────────────────────────────────────────────────────────
export const env = {
  openExternal(uri: Uri): Promise<boolean> {
    __mockState.openExternal.calls.push(uri);
    return Promise.resolve(true);
  },
};

// ── workspace ───────────────────────────────────────────────────────────
export const workspace = {
  get workspaceFolders() {
    return __mockState.workspaceFolders.length
      ? __mockState.workspaceFolders
      : undefined;
  },
  getConfiguration(section?: string): WorkspaceConfigurationMock {
    return new WorkspaceConfigurationMock(
      section ? __mockState.configuration[section] : {},
    );
  },
};

// ── commands ────────────────────────────────────────────────────────────
export const commands = {
  registerCommand(_id: string, _callback: (...args: any[]) => any): Disposable {
    return { dispose: () => undefined };
  },
};

// ── ExtensionContext factory ───────────────────────────────────────────
/** Builds a minimal in-memory ExtensionContext sufficient for globalState persistence tests. */
export function createMockExtensionContext(): any {
  const store = new Map<string, any>();
  return {
    subscriptions: [] as Disposable[],
    globalState: {
      get<T>(key: string, defaultValue?: T): T {
        return store.has(key) ? store.get(key) : (defaultValue as T);
      },
      update(key: string, value: any): Promise<void> {
        store.set(key, value);
        return Promise.resolve();
      },
    },
  };
}

export enum ViewColumn {
  Active = -1,
  One = 1,
}

export const ProgressLocation = {
  Notification: 15,
};

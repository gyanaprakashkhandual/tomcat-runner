/**
 * Intercepts `require('vscode')` and redirects it to our compiled
 * vscode.mock.js. Loaded via Mocha's `--require` flag before any
 * test file runs, so every `import * as vscode from 'vscode'` in the
 * compiled output transparently resolves to the mock.
 *
 * Plain JS (not TS) because Mocha's --require hook loads it before
 * ts-node/the TS build step is guaranteed to be in play.
 */

const Module = require('module');
const path = require('path');

const originalResolve = Module._resolveFilename;
const mockPath = path.join(__dirname, 'vscode.mock.js');

Module._resolveFilename = function (request, ...rest) {
    if (request === 'vscode') {
        return mockPath;
    }
    return originalResolve.call(this, request, ...rest);
};
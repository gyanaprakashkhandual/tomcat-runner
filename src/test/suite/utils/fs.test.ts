/**
 * Exercises utils/fs.ts against a real temporary directory. These are
 * thin wrappers around node:fs, so we verify them against the actual
 * filesystem rather than mocking fs — the wrappers' only real job is
 * correct path-joining and graceful failure handling.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  isDir,
  isFile,
  resolveCatalinaScript,
  webappsDir,
  catalinaLogFile,
  copyFile,
  rmDirIfExists,
  rmFileIfExists,
  listDir,
  IS_WIN,
} from "../../../utils/fs";

describe("utils/fs", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tomcat-runner-fs-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe("isDir / isFile", () => {
    it("isDir returns true for an existing directory", () => {
      assert.strictEqual(isDir(tmpRoot), true);
    });

    it("isDir returns false for a missing path", () => {
      assert.strictEqual(isDir(path.join(tmpRoot, "nope")), false);
    });

    it("isFile returns true for an existing file", () => {
      const file = path.join(tmpRoot, "a.txt");
      fs.writeFileSync(file, "hi");
      assert.strictEqual(isFile(file), true);
    });

    it("isFile returns false for a directory", () => {
      assert.strictEqual(isFile(tmpRoot), false);
    });

    it("isFile returns false for a missing path", () => {
      assert.strictEqual(isFile(path.join(tmpRoot, "missing.txt")), false);
    });
  });

  describe("resolveCatalinaScript", () => {
    it("returns null when bin/ does not exist", () => {
      assert.strictEqual(resolveCatalinaScript(tmpRoot, "start"), null);
    });

    it("finds the platform-appropriate startup script when present", () => {
      const binDir = path.join(tmpRoot, "bin");
      fs.mkdirSync(binDir);
      const scriptName = IS_WIN ? "startup.bat" : "startup.sh";
      const scriptPath = path.join(binDir, scriptName);
      fs.writeFileSync(scriptPath, "");
      assert.strictEqual(resolveCatalinaScript(tmpRoot, "start"), scriptPath);
    });

    it("finds the platform-appropriate shutdown script when present", () => {
      const binDir = path.join(tmpRoot, "bin");
      fs.mkdirSync(binDir);
      const scriptName = IS_WIN ? "shutdown.bat" : "shutdown.sh";
      const scriptPath = path.join(binDir, scriptName);
      fs.writeFileSync(scriptPath, "");
      assert.strictEqual(resolveCatalinaScript(tmpRoot, "stop"), scriptPath);
    });
  });

  describe("webappsDir / catalinaLogFile", () => {
    it("joins the webapps path correctly", () => {
      assert.strictEqual(
        webappsDir("/opt/tomcat"),
        path.join("/opt/tomcat", "webapps"),
      );
    });

    it("picks the platform-appropriate log filename", () => {
      const expected = IS_WIN ? "catalina.log" : "catalina.out";
      assert.strictEqual(
        catalinaLogFile("/opt/tomcat"),
        path.join("/opt/tomcat", "logs", expected),
      );
    });
  });

  describe("copyFile", () => {
    it("copies file contents to the destination", () => {
      const src = path.join(tmpRoot, "src.txt");
      const dest = path.join(tmpRoot, "dest.txt");
      fs.writeFileSync(src, "payload");
      copyFile(src, dest);
      assert.strictEqual(fs.readFileSync(dest, "utf8"), "payload");
    });

    it("overwrites an existing destination file", () => {
      const src = path.join(tmpRoot, "src.txt");
      const dest = path.join(tmpRoot, "dest.txt");
      fs.writeFileSync(src, "new");
      fs.writeFileSync(dest, "old");
      copyFile(src, dest);
      assert.strictEqual(fs.readFileSync(dest, "utf8"), "new");
    });
  });

  describe("rmDirIfExists", () => {
    it("removes an existing directory recursively", () => {
      const dir = path.join(tmpRoot, "app");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "file.txt"), "x");
      rmDirIfExists(dir);
      assert.strictEqual(fs.existsSync(dir), false);
    });

    it("does nothing when the directory does not exist", () => {
      // Should simply not throw.
      assert.doesNotThrow(() => rmDirIfExists(path.join(tmpRoot, "missing")));
    });
  });

  describe("rmFileIfExists", () => {
    it("removes an existing file", () => {
      const file = path.join(tmpRoot, "a.txt");
      fs.writeFileSync(file, "x");
      rmFileIfExists(file);
      assert.strictEqual(fs.existsSync(file), false);
    });

    it("does nothing when the file does not exist", () => {
      assert.doesNotThrow(() =>
        rmFileIfExists(path.join(tmpRoot, "missing.txt")),
      );
    });
  });

  describe("listDir", () => {
    it("lists immediate children of a directory", () => {
      fs.writeFileSync(path.join(tmpRoot, "a.txt"), "");
      fs.writeFileSync(path.join(tmpRoot, "b.txt"), "");
      const names = listDir(tmpRoot).sort();
      assert.deepStrictEqual(names, ["a.txt", "b.txt"]);
    });

    it("returns an empty array for a missing directory", () => {
      assert.deepStrictEqual(listDir(path.join(tmpRoot, "missing")), []);
    });
  });
});

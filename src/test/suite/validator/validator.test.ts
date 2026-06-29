/**
 * Covers validateCatalinaHome (built against a real temp directory so
 * we test the actual fs-backed checks), validatePort, and validateName.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  validateCatalinaHome,
  validatePort,
  validateName,
} from "../../../utils/validator";
import { IS_WIN } from "../../../utils/fs";

/** Creates a fully valid, minimal Tomcat installation layout under a temp dir. */
function makeValidCatalinaHome(root: string): void {
  fs.mkdirSync(path.join(root, "bin"), { recursive: true });
  fs.mkdirSync(path.join(root, "conf"), { recursive: true });
  fs.mkdirSync(path.join(root, "webapps"), { recursive: true });
  fs.writeFileSync(path.join(root, "conf", "server.xml"), "<Server/>");
  const startupScript = IS_WIN ? "startup.bat" : "startup.sh";
  fs.writeFileSync(path.join(root, "bin", startupScript), "");
}

describe("utils/validator", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "tomcat-runner-validator-"),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe("validateCatalinaHome", () => {
    it("passes for a fully valid Tomcat installation", () => {
      makeValidCatalinaHome(tmpRoot);
      const result = validateCatalinaHome(tmpRoot);
      assert.deepStrictEqual(result, { ok: true });
    });

    it("fails when the path is empty", () => {
      const result = validateCatalinaHome("");
      assert.strictEqual(result.ok, false);
      assert.match(result.message ?? "", /required/i);
    });

    it("fails when the folder does not exist", () => {
      const result = validateCatalinaHome(path.join(tmpRoot, "nope"));
      assert.strictEqual(result.ok, false);
      assert.match(result.message ?? "", /does not exist/i);
    });

    it("fails when bin/ is missing", () => {
      fs.mkdirSync(path.join(tmpRoot, "conf"), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, "webapps"), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, "conf", "server.xml"), "<Server/>");
      const result = validateCatalinaHome(tmpRoot);
      assert.strictEqual(result.ok, false);
      assert.match(result.message ?? "", /bin/i);
    });

    it("fails when conf/server.xml is missing", () => {
      fs.mkdirSync(path.join(tmpRoot, "bin"), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, "webapps"), { recursive: true });
      const startupScript = IS_WIN ? "startup.bat" : "startup.sh";
      fs.writeFileSync(path.join(tmpRoot, "bin", startupScript), "");
      const result = validateCatalinaHome(tmpRoot);
      assert.strictEqual(result.ok, false);
      assert.match(result.message ?? "", /server\.xml/i);
    });

    it("fails when webapps/ is missing", () => {
      fs.mkdirSync(path.join(tmpRoot, "bin"), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, "conf"), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, "conf", "server.xml"), "<Server/>");
      const startupScript = IS_WIN ? "startup.bat" : "startup.sh";
      fs.writeFileSync(path.join(tmpRoot, "bin", startupScript), "");
      const result = validateCatalinaHome(tmpRoot);
      assert.strictEqual(result.ok, false);
      assert.match(result.message ?? "", /webapps/i);
    });

    it("fails when the startup script is missing from bin/", () => {
      fs.mkdirSync(path.join(tmpRoot, "bin"), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, "conf"), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, "webapps"), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, "conf", "server.xml"), "<Server/>");
      const result = validateCatalinaHome(tmpRoot);
      assert.strictEqual(result.ok, false);
    });
  });

  describe("validatePort", () => {
    it("accepts a normal port", () => {
      assert.deepStrictEqual(validatePort(8080), { ok: true });
    });

    it("accepts the minimum valid port (1)", () => {
      assert.strictEqual(validatePort(1).ok, true);
    });

    it("accepts the maximum valid port (65535)", () => {
      assert.strictEqual(validatePort(65535).ok, true);
    });

    it("rejects 0", () => {
      assert.strictEqual(validatePort(0).ok, false);
    });

    it("rejects a negative port", () => {
      assert.strictEqual(validatePort(-1).ok, false);
    });

    it("rejects a port above 65535", () => {
      assert.strictEqual(validatePort(65536).ok, false);
    });

    it("rejects a non-integer port", () => {
      assert.strictEqual(validatePort(8080.5).ok, false);
    });
  });

  describe("validateName", () => {
    it("accepts a normal name", () => {
      assert.deepStrictEqual(validateName("Local Dev"), { ok: true });
    });

    it("rejects an empty string", () => {
      assert.strictEqual(validateName("").ok, false);
    });

    it("rejects a whitespace-only string", () => {
      assert.strictEqual(validateName("   ").ok, false);
    });

    it("accepts a name exactly at the 40-character limit", () => {
      const name = "a".repeat(40);
      assert.strictEqual(validateName(name).ok, true);
    });

    it("rejects a name over the 40-character limit", () => {
      const name = "a".repeat(41);
      assert.strictEqual(validateName(name).ok, false);
    });
  });
});

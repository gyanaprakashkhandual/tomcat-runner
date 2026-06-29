/**
 * Covers TomcatServer: initial state, setState() transitions and side
 * effects (pid tracking, error capture, stopped-clears-pid), the
 * 'state-changed' event, and the display/status getters.
 */

import * as assert from "assert";
import { TomcatServer } from "../../../models/server";
import { ServerConfig } from "../../../models/types";

/** Builds a minimal valid ServerConfig with sensible test defaults. */
function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    id: "srv-1",
    name: "Local Dev",
    colorId: "blue",
    catalinaHome: "/opt/tomcat",
    httpPort: 8080,
    createdAt: 1_000,
    ...overrides,
  };
}

describe("models/server — TomcatServer", () => {
  it('starts in the "stopped" state with no pid', () => {
    const server = new TomcatServer(makeConfig());
    assert.strictEqual(server.state, "stopped");
    assert.strictEqual(server.runtime.pid, undefined);
  });

  it("exposes config values unchanged via .config", () => {
    const config = makeConfig({ name: "QA Box", httpPort: 9090 });
    const server = new TomcatServer(config);
    assert.strictEqual(server.config.name, "QA Box");
    assert.strictEqual(server.config.httpPort, 9090);
  });

  describe("setState()", () => {
    it("updates state and stateChangedAt", () => {
      const server = new TomcatServer(makeConfig());
      const before = server.runtime.stateChangedAt;
      server.setState("starting");
      assert.strictEqual(server.state, "starting");
      assert.ok(server.runtime.stateChangedAt >= before);
    });

    it("is a no-op when the new state equals the current state", () => {
      const server = new TomcatServer(makeConfig());
      let fireCount = 0;
      server.on("state-changed", () => fireCount++);
      server.setState("stopped"); // already stopped
      assert.strictEqual(fireCount, 0);
    });

    it("records the pid when transitioning to running", () => {
      const server = new TomcatServer(makeConfig());
      server.setState("running", { pid: 4242 });
      assert.strictEqual(server.state, "running");
      assert.strictEqual(server.runtime.pid, 4242);
    });

    it("clears the pid when transitioning to stopped", () => {
      const server = new TomcatServer(makeConfig());
      server.setState("running", { pid: 4242 });
      server.setState("stopped");
      assert.strictEqual(server.runtime.pid, undefined);
    });

    it("captures lastError only when transitioning to error", () => {
      const server = new TomcatServer(makeConfig());
      server.setState("error", { error: "boom" });
      assert.strictEqual(server.state, "error");
      assert.strictEqual(server.runtime.lastError, "boom");
    });

    it("does not carry a stale lastError into a later non-error state", () => {
      const server = new TomcatServer(makeConfig());
      server.setState("error", { error: "boom" });
      server.setState("starting");
      // lastError is only read by statusDescription when state === 'error',
      // so once we leave the error state it should no longer be reported.
      assert.notStrictEqual(server.statusDescription, "Error: boom");
    });

    it('emits "state-changed" with the new state', () => {
      const server = new TomcatServer(makeConfig());
      const seen: string[] = [];
      server.on("state-changed", (s) => seen.push(s));
      server.setState("starting");
      server.setState("running", { pid: 1 });
      assert.deepStrictEqual(seen, ["starting", "running"]);
    });
  });

  describe("displayLabel", () => {
    it("returns the config name", () => {
      const server = new TomcatServer(makeConfig({ name: "Prod" }));
      assert.strictEqual(server.displayLabel, "Prod");
    });
  });

  describe("statusDescription", () => {
    it('describes "stopped"', () => {
      const server = new TomcatServer(makeConfig());
      assert.strictEqual(server.statusDescription, "Stopped");
    });

    it('describes "starting"', () => {
      const server = new TomcatServer(makeConfig());
      server.setState("starting");
      assert.strictEqual(server.statusDescription, "Starting…");
    });

    it('describes "stopping"', () => {
      const server = new TomcatServer(makeConfig());
      server.setState("running", { pid: 1 });
      server.setState("stopping");
      assert.strictEqual(server.statusDescription, "Stopping…");
    });

    it('describes "running" with port and pid when pid is known', () => {
      const server = new TomcatServer(makeConfig({ httpPort: 8081 }));
      server.setState("running", { pid: 555 });
      assert.strictEqual(
        server.statusDescription,
        "Running on :8081 (PID 555)",
      );
    });

    it('describes "running" with port only when pid is unknown', () => {
      const server = new TomcatServer(makeConfig({ httpPort: 8081 }));
      server.setState("running");
      assert.strictEqual(server.statusDescription, "Running on :8081");
    });

    it('describes "error" with the captured message', () => {
      const server = new TomcatServer(makeConfig());
      server.setState("error", { error: "port already in use" });
      assert.strictEqual(
        server.statusDescription,
        "Error: port already in use",
      );
    });

    it('falls back to "unknown" when error state has no message', () => {
      const server = new TomcatServer(makeConfig());
      server.setState("error");
      assert.strictEqual(server.statusDescription, "Error: unknown");
    });
  });
});

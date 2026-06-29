/**
 * serverManager is a module-level singleton, so each test re-imports
 * it fresh via a helper that clears Node's module cache — otherwise
 * state from one test (servers, listeners) would bleed into the next.
 */

import * as assert from "assert";
import { createMockExtensionContext } from "../../mocks/vscode.mock";
import { ServerConfig } from "../../../models/types";

/** Fresh require of serverManager — clears the module cache first so the
 *  singleton's internal Map/EventEmitter starts empty for every test. */
function freshServerManager() {
  const modPath = require.resolve("../../../services/serverManager");
  delete require.cache[modPath];
  // Also clear the model it wraps, so TomcatServer listeners reset too.
  const serverModelPath = require.resolve("../../../models/server");
  delete require.cache[serverModelPath];
  return require("../../../services/serverManager")
    .serverManager as typeof import("../../../services/serverManager").serverManager;
}

function partialConfig(
  overrides: Partial<ServerConfig> = {},
): Omit<ServerConfig, "id" | "createdAt"> {
  return {
    name: "Local Dev",
    colorId: "blue",
    catalinaHome: "/opt/tomcat",
    httpPort: 8080,
    ...overrides,
  };
}

describe("services/serverManager", () => {
  it("starts empty when globalState has no stored servers", () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    assert.deepStrictEqual(serverManager.list(), []);
  });

  it("loads previously persisted servers from globalState on init", () => {
    const serverManager = freshServerManager();
    const ctx = createMockExtensionContext();
    const stored: ServerConfig[] = [
      {
        id: "a",
        name: "Old Server",
        colorId: "red",
        catalinaHome: "/tomcat",
        httpPort: 8080,
        createdAt: 1,
      },
    ];
    ctx.globalState.update("tomcatRunner.servers.v1", stored);
    serverManager.init(ctx);
    const list = serverManager.list();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].config.name, "Old Server");
  });

  it("add() creates a server with a generated id and createdAt", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    const server = await serverManager.add(partialConfig());
    assert.ok(server.config.id, "expected a generated id");
    assert.ok(server.config.createdAt > 0, "expected a createdAt timestamp");
    assert.strictEqual(server.config.name, "Local Dev");
  });

  it("add() persists the new server so it survives a fresh init() from the same context", async () => {
    const serverManager = freshServerManager();
    const ctx = createMockExtensionContext();
    serverManager.init(ctx);
    await serverManager.add(partialConfig({ name: "Persisted" }));

    // Re-init with the SAME context to simulate an editor restart.
    const serverManager2 = freshServerManager();
    serverManager2.init(ctx);
    const list = serverManager2.list();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].config.name, "Persisted");
  });

  it("list() returns servers sorted by createdAt ascending", async () => {
    const serverManager = freshServerManager();
    const ctx = createMockExtensionContext();
    const stored: ServerConfig[] = [
      {
        id: "b",
        name: "Second",
        colorId: "blue",
        catalinaHome: "/t",
        httpPort: 8080,
        createdAt: 200,
      },
      {
        id: "a",
        name: "First",
        colorId: "blue",
        catalinaHome: "/t",
        httpPort: 8081,
        createdAt: 100,
      },
    ];
    ctx.globalState.update("tomcatRunner.servers.v1", stored);
    serverManager.init(ctx);
    const names = serverManager.list().map((s) => s.config.name);
    assert.deepStrictEqual(names, ["First", "Second"]);
  });

  it("get() returns the matching server by id", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    const server = await serverManager.add(partialConfig());
    assert.strictEqual(serverManager.get(server.config.id), server);
  });

  it("get() returns undefined for an unknown id", () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    assert.strictEqual(serverManager.get("does-not-exist"), undefined);
  });

  it("update() patches the config and persists it", async () => {
    const serverManager = freshServerManager();
    const ctx = createMockExtensionContext();
    serverManager.init(ctx);
    const server = await serverManager.add(partialConfig({ name: "Before" }));

    await serverManager.update(server.config.id, {
      name: "After",
      httpPort: 9090,
    });

    assert.strictEqual(server.config.name, "After");
    assert.strictEqual(server.config.httpPort, 9090);
  });

  it("update() is a no-op for an unknown id (does not throw)", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    await assert.doesNotReject(() =>
      serverManager.update("missing", { name: "X" }),
    );
  });

  it("remove() deletes the server from the registry", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    const server = await serverManager.add(partialConfig());
    await serverManager.remove(server.config.id);
    assert.strictEqual(serverManager.get(server.config.id), undefined);
    assert.deepStrictEqual(serverManager.list(), []);
  });

  it("remove() of an unknown id does not fire onChanged or throw", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    let fired = false;
    serverManager.onChanged(() => {
      fired = true;
    });
    await serverManager.remove("missing");
    assert.strictEqual(fired, false);
  });

  it("onChanged fires when a server is added", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    let fireCount = 0;
    serverManager.onChanged(() => fireCount++);
    await serverManager.add(partialConfig());
    assert.ok(fireCount > 0, "expected onChanged to fire at least once");
  });

  it("onChanged fires when a tracked server changes state", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    const server = await serverManager.add(partialConfig());

    let fireCount = 0;
    serverManager.onChanged(() => fireCount++);
    server.setState("starting");
    assert.ok(
      fireCount > 0,
      "expected onChanged to fire on server state change",
    );
  });

  it("dispose() clears the registry", async () => {
    const serverManager = freshServerManager();
    serverManager.init(createMockExtensionContext());
    await serverManager.add(partialConfig());
    serverManager.dispose();
    assert.deepStrictEqual(serverManager.list(), []);
  });
});

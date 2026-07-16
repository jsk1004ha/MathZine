const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = process.cwd();
const context = vm.createContext({
  Buffer,
  URL,
  console,
  process,
  setTimeout,
  clearTimeout,
  TextDecoder,
  TextEncoder
});
const moduleCache = new Map();
const collections = { rateLimits: [] };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSyntheticModule(specifier, namespace) {
  return new vm.SyntheticModule(
    Object.keys(namespace),
    function initializeSyntheticModule() {
      for (const [name, value] of Object.entries(namespace)) {
        this.setExport(name, value);
      }
    },
    { context, identifier: specifier }
  );
}

const storeModule = createSyntheticModule("@/lib/store", {
  readCollection: async (name) => clone(collections[name] ?? []),
  writeCollection: async (name, data) => {
    collections[name] = clone(data);
  }
});
const authModule = createSyntheticModule("@/lib/auth", {
  applySessionCookie: () => {},
  loginUser: async (loginId, password, options = {}) => ({
    user: { id: `user_${loginId}`, authProvider: "local", role: "member" },
    sessionToken: `session_${password}`,
    rememberMe: Boolean(options.rememberMe)
  })
});
const apiModule = createSyntheticModule("@/lib/api", {
  jsonSuccess: (data, options = {}) => ({
    status: options.status ?? 200,
    body: { ok: true, data },
    headers: options.headers ?? {}
  }),
  jsonError: (error, fallback = {}) => ({
    status: error?.status || fallback.status || 400,
    body: {
      ok: false,
      error: {
        code: error?.code || fallback.code || "BAD_REQUEST",
        message: error?.message || fallback.message || "Request failed.",
        ...(error?.details ? { details: error.details } : {})
      }
    }
  }),
  noStoreHeaders: () => ({ "Cache-Control": "no-store" })
});

async function loadExternalModule(specifier) {
  const namespace = await import(specifier);
  return createSyntheticModule(specifier, namespace);
}

function resolveLocalSpecifier(specifier, referencingModule) {
  if (specifier.startsWith("@/")) {
    const withoutAlias = specifier.slice(2);
    return path.join(repoRoot, withoutAlias.endsWith(".js") ? withoutAlias : `${withoutAlias}.js`);
  }

  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(referencingModule.identifier), specifier);
    return resolved.endsWith(".js") || resolved.endsWith(".mjs") ? resolved : `${resolved}.js`;
  }

  return null;
}

async function loadLocalModule(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (moduleCache.has(resolvedPath)) {
    return moduleCache.get(resolvedPath);
  }

  const source = readFileSync(resolvedPath, "utf8");
  const module = new vm.SourceTextModule(source, { context, identifier: resolvedPath });
  moduleCache.set(resolvedPath, module);

  await module.link(async (specifier, referencingModule) => {
    if (specifier === "@/lib/store") return storeModule;
    if (specifier === "@/lib/auth") return authModule;
    if (specifier === "@/lib/api") return apiModule;

    const localPath = resolveLocalSpecifier(specifier, referencingModule);
    return localPath ? loadLocalModule(localPath) : loadExternalModule(specifier);
  });
  await module.evaluate();
  return module;
}

async function evaluateSyntheticModule(module) {
  if (module.status === "unlinked") {
    await module.link(() => {
      throw new Error("Synthetic test module has no imports.");
    });
  }

  if (module.status === "linked") {
    await module.evaluate();
  }
}

function makeRequest({
  ip = "203.0.113.10",
  loginId = "member",
  password = "password",
  host = "mathzine.test",
  origin = "https://mathzine.test"
} = {}) {
  let jsonCalls = 0;
  const request = {
    headers: new Headers({
      host,
      origin,
      "x-forwarded-for": ip
    }),
    json: async () => {
      jsonCalls += 1;
      return { riroId: loginId, password };
    }
  };

  return { request, getJsonCalls: () => jsonCalls };
}

function resetRateLimits() {
  collections.rateLimits = [];
}

function assertRateLimited(response) {
  assert.equal(response.status, 429);
  assert.equal(response.body.error.code, "RATE_LIMITED");
  assert.equal(typeof response.body.error.details?.retryAfterMs, "number");
  assert.ok(response.body.error.details.retryAfterMs > 0);
}

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

async function main() {
  await Promise.all([
    evaluateSyntheticModule(storeModule),
    evaluateSyntheticModule(authModule),
    evaluateSyntheticModule(apiModule)
  ]);
  const route = (await loadLocalModule(path.join(repoRoot, "app/api/auth/login/route.js"))).namespace;

  test("shared IP permits 60 distinct login IDs and blocks attempt 61", async () => {
    resetRateLimits();

    for (let index = 0; index < 60; index += 1) {
      const { request } = makeRequest({ loginId: `member-${index}` });
      const response = await route.POST(request);
      assert.equal(response.status, 200, `attempt ${index + 1} should be allowed`);
    }

    const { request } = makeRequest({ loginId: "member-60" });
    assertRateLimited(await route.POST(request));
  });

  test("normalized login ID permits 20 attempts across IPs and blocks attempt 21", async () => {
    resetRateLimits();

    for (let index = 0; index < 20; index += 1) {
      const { request } = makeRequest({
        ip: `198.51.100.${index + 1}`,
        loginId: index % 2 === 0 ? "  Target.User  " : "target.user"
      });
      const response = await route.POST(request);
      assert.equal(response.status, 200, `attempt ${index + 1} should be allowed`);
    }

    const { request } = makeRequest({ ip: "198.51.100.21", loginId: "TARGET.USER" });
    assertRateLimited(await route.POST(request));
  });

  test("persisted per-login-ID keys contain only a stable SHA-256 digest", async () => {
    resetRateLimits();
    const first = makeRequest({ loginId: "  Target.User  " });
    const second = makeRequest({ loginId: "TARGET.USER" });
    assert.equal((await route.POST(first.request)).status, 200);
    assert.equal((await route.POST(second.request)).status, 200);

    const accountEntries = collections.rateLimits.filter((entry) => entry.scope === "auth.login.account");
    assert.equal(accountEntries.length, 1);
    assert.equal(accountEntries[0].count, 2);
    assert.match(accountEntries[0].key, /^auth\.login\.account:[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(collections.rateLimits).toLowerCase().includes("target.user"));
  });

  test("same-origin validation happens before reading the request body", async () => {
    resetRateLimits();
    const input = makeRequest({ origin: "https://attacker.example" });
    const response = await route.POST(input.request);

    assert.equal(response.status, 400);
    assert.equal(input.getJsonCalls(), 0);
    assert.deepEqual(collections.rateLimits, []);
  });

  test("a valid login submission reads the request body exactly once", async () => {
    resetRateLimits();
    const input = makeRequest();
    const response = await route.POST(input.request);

    assert.equal(response.status, 200);
    assert.equal(input.getJsonCalls(), 1);
  });

  let failed = 0;
  for (const { name, run } of tests) {
    try {
      await run();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error.stack || error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }

  console.log("Rate-limit regression checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

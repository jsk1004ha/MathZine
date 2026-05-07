const { spawn, spawnSync } = require("node:child_process");

const PORT = 3011;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let index = 0; index < 40; index += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) {
        return;
      }
    } catch {}

    await wait(500);
  }

  throw new Error("Smoke test server did not start in time.");
}

async function verify(pathname, matcher) {
  const response = await fetch(`${BASE_URL}${pathname}`, { signal: AbortSignal.timeout(15_000) });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Smoke check failed for ${pathname}: ${response.status}`);
  }

  if (matcher && !matcher.test(body)) {
    throw new Error(`Smoke check content mismatch for ${pathname}`);
  }
}

function stopServer(server) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  server.kill("SIGTERM");
}

async function main() {
  const server =
    process.platform === "win32"
      ? spawn(process.env.ComSpec || "cmd.exe", ["/c", "npx", "next", "start", "-p", String(PORT)], {
          cwd: process.cwd(),
          stdio: "ignore"
        })
      : spawn("npx", ["next", "start", "-p", String(PORT)], {
          cwd: process.cwd(),
          stdio: "ignore"
        });

  try {
    await waitForServer();
    await verify("/", /MathZine/);
    await verify("/search?q=test", /검색 결과/);
    await verify("/api/health", /"status":"ok"/);
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

const { spawn, spawnSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");

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

  return body;
}

function verifyHeaderAccountSource() {
  const header = readFileSync("components/header.js", "utf8");
  const accountMenu = readFileSync("components/account-menu.js", "utf8");
  const profilePage = readFileSync("app/profile/page.js", "utf8");
  const searchPage = readFileSync("app/search/page.js", "utf8");
  const sidebarPath = "components/site-sidebar.js";
  const sidebar = existsSync(sidebarPath) ? readFileSync(sidebarPath, "utf8") : "";
  const violations = [];

  if (/<form[^>]+className="mz-header-search"/.test(header) || !/<Link[^>]+href="\/search"[^>]+aria-label="검색"/.test(header)) {
    violations.push("Header must link to search instead of rendering a search form.");
  }

  if (!/autoFocus/.test(searchPage)) {
    violations.push("Search page must focus its only search input.");
  }

  if (/href="\/(?:studio|admin)|handleLogout|로그아웃/.test(accountMenu)) {
    violations.push("Account strip must only expose the authenticated profile link.");
  }

  if (!/LogoutButton/.test(profilePage)) {
    violations.push("Profile page must retain an authenticated logout control.");
  }

  if (!/SiteSidebar/.test(header) || /<Link[^>]+className="mz-icon-button mz-menu-link"/.test(header)) {
    violations.push("Header hamburger must toggle SiteSidebar instead of linking directly to another page.");
  }

  if (
    !/aria-controls="site-sidebar"/.test(sidebar) ||
    !/aria-expanded=\{open\}/.test(sidebar) ||
    !/id="site-sidebar"/.test(sidebar) ||
    !/aria-modal="true"/.test(sidebar)
  ) {
    violations.push("Site sidebar must expose an accessible toggle and modal navigation panel.");
  }

  if (!/event\.key === "Escape"/.test(sidebar) || !/triggerRef\.current\?\.focus\(\)/.test(sidebar)) {
    violations.push("Site sidebar must close with Escape and return focus to its trigger.");
  }

  if (!/className="mz-sidebar-backdrop"/.test(sidebar) || !/onClick=\{closeSidebar\}/.test(sidebar)) {
    violations.push("Site sidebar backdrop must close the panel.");
  }

  if (violations.length) {
    throw new Error(violations.join("\n"));
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
  verifyHeaderAccountSource();

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
    const searchPage = await verify("/search?q=test", /검색 결과/);
    const searchInputs = searchPage.match(/<input\b[^>]*\btype="search"/g) ?? [];

    if (searchInputs.length !== 1) {
      throw new Error(`Search page must render exactly one search input; found ${searchInputs.length}.`);
    }

    if (!searchInputs[0].includes("autofocus")) {
      throw new Error("Search page input must receive focus after using the header search affordance.");
    }

    await verify("/api/health", /"status":"ok"/);
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

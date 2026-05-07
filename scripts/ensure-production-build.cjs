const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

if (existsSync(".next/BUILD_ID")) {
  console.log("Production build found in .next.");
  process.exit(0);
}

console.log("Production build not found in .next; running npm run build first.");

const npmExecPath = process.env.npm_execpath;
const command = npmExecPath ? process.execPath : process.platform === "win32" ? "cmd.exe" : "npm";
const args = npmExecPath
  ? [npmExecPath, "run", "build"]
  : process.platform === "win32"
    ? ["/d", "/s", "/c", "npm run build"]
    : ["run", "build"];

const result = spawnSync(command, args, {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

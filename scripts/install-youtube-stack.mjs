import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const venv = path.join(root, ".ytdlp-venv");
const provider = path.join(root, ".yt-pot-provider");
const server = path.join(provider, "server");
const providerVersion = "2.0.0";
const python = path.join(venv, process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const marker = path.join(venv, ".duongtube-stack.json");
const signature = JSON.stringify({ providerVersion, platform: process.platform, node: process.versions.node.split(".")[0], revision: 2 });

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false, windowsHide: true, timeout: 600_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed with exit code ${result.status}`);
}

// Invoke npm through Node on Windows: .cmd files cannot be execFile'd safely.
function npm(args, cwd) {
  const cli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  if (fs.existsSync(cli)) run(process.execPath, [cli, ...args], cwd);
  else if (process.platform !== "win32") run("npm", args, cwd);
  else throw new Error("Run this installer with npm run build so npm_execpath is available.");
}

try {
  const ready = fs.existsSync(python) && fs.existsSync(path.join(server, "build/main.js")) &&
    fs.existsSync(marker) && fs.readFileSync(marker, "utf8") === signature;
  if (ready && process.env.YOUTUBE_STACK_REFRESH !== "1") {
    console.log("YouTube audio runtime is already installed.");
  } else {
    console.log("Installing YouTube audio runtime…");
    if (!fs.existsSync(python)) run(process.platform === "win32" ? "python" : "python3", ["-m", "venv", venv]);
    run(python, ["-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"]);
    run(python, ["-m", "pip", "install", "--upgrade", "yt-dlp[default,curl-cffi]", `bgutil-ytdlp-pot-provider==${providerVersion}`]);
    if (!fs.existsSync(path.join(provider, ".git"))) {
      run("git", ["clone", "--depth", "1", "--branch", providerVersion, "https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git", provider]);
    } else {
      run("git", ["fetch", "--depth", "1", "origin", "tag", providerVersion], provider);
      run("git", ["checkout", "--detach", providerVersion], provider);
    }
    npm(["ci", "--no-audit", "--no-fund"], server);
    run(process.execPath, [path.join(server, "node_modules/typescript/bin/tsc")], server);
    run(python, ["-m", "yt_dlp", "--version"]);
    fs.writeFileSync(marker, signature);
    console.log("YouTube audio runtime installed. Live media is checked separately from the build.");
  }
} catch (error) {
  console.error("YouTube runtime installation failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}


import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const venv = path.join(root, ".ytdlp-venv");
const python = path.join(venv, process.platform === "win32" ? "Scripts/python.exe" : "bin/python3");
const marker = path.join(venv, ".duongtube-stack.json");
const signature = JSON.stringify({ platform: process.platform, node: process.versions.node.split(".")[0], revision: 3 });

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false, windowsHide: true, timeout: 600_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed with exit code ${result.status}`);
}

try {
  const ready = fs.existsSync(python) && fs.existsSync(marker) && fs.readFileSync(marker, "utf8") === signature;
  if (ready && process.env.YOUTUBE_STACK_REFRESH !== "1") {
    console.log("YouTube audio runtime is already installed.");
  } else {
    console.log("Installing YouTube audio runtime…");
    if (!fs.existsSync(python)) run(process.platform === "win32" ? "python" : "python3", ["-m", "venv", venv]);
    run(python, ["-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"]);
    run(python, ["-m", "pip", "install", "--upgrade", "yt-dlp[default,curl-cffi]"]);
    run(python, ["-m", "yt_dlp", "--version"]);
    fs.writeFileSync(marker, signature);
    console.log("YouTube audio runtime installed. Live media is checked separately from the build.");
  }
} catch (error) {
  console.error("YouTube runtime installation failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}


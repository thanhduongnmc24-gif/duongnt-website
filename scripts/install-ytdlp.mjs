import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

if (process.platform !== "linux") process.exit(0);

const directory = path.join(process.cwd(), ".yt-dlp-bin");
const target = path.join(directory, "yt-dlp.pyz");

try {
  const current = await stat(target);
  if (current.size > 1_000_000) {
    await chmod(target, 0o755);
    process.exit(0);
  }
} catch {
  // The binary is downloaded below on a fresh Render build.
}

await mkdir(directory, { recursive: true });
const response = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp");
if (!response.ok) {
  throw new Error(`Cannot download yt-dlp (${response.status} ${response.statusText})`);
}
const binary = Buffer.from(await response.arrayBuffer());
if (binary.length < 1_000_000) throw new Error("Downloaded yt-dlp file is unexpectedly small");
await writeFile(target, binary);
await chmod(target, 0o755);
console.log(`Installed yt-dlp for Render (${binary.length} bytes)`);

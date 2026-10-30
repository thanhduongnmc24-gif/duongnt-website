import { chmod, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let installing: Promise<string> | null = null;

async function usable(file: string) {
  try {
    const info = await stat(file);
    if (info.size < 1_000_000) return false;
    await chmod(file, 0o755);
    return true;
  } catch {
    return false;
  }
}

async function installLinuxBinary() {
  const bundled = path.join(process.cwd(), ".yt-dlp-bin", "yt-dlp.pyz");
  if (await usable(bundled)) return bundled;

  const target = path.join(os.tmpdir(), "duongtube-yt-dlp.pyz");
  if (await usable(target)) return target;

  const response = await fetch(
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
    { cache: "no-store", signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok) {
    throw new Error(`Cannot download yt-dlp (${response.status} ${response.statusText})`);
  }
  const binary = Buffer.from(await response.arrayBuffer());
  if (binary.length < 1_000_000) throw new Error("Downloaded yt-dlp file is unexpectedly small");
  await writeFile(target, binary, { mode: 0o755 });
  await chmod(target, 0o755);
  return target;
}

export function ensureYtDlp() {
  if (process.env.YTDLP_PATH) return Promise.resolve(process.env.YTDLP_PATH);
  if (process.platform === "win32") {
    return Promise.resolve(path.join(process.cwd(), ".ytdlp-venv", "Scripts", "yt-dlp.exe"));
  }
  if (process.platform !== "linux") return Promise.resolve("yt-dlp");
  installing ??= installLinuxBinary().catch((error) => {
    installing = null;
    throw error;
  });
  return installing;
}

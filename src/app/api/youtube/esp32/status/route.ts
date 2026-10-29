import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

function executable(name: "yt-dlp" | "ffmpeg") {
  const configured = name === "yt-dlp" ? process.env.YTDLP_PATH : process.env.FFMPEG_PATH;
  if (configured) return configured;
  if (name === "yt-dlp" && process.platform === "win32") {
    return path.join(process.cwd(), ".ytdlp-venv", "Scripts", "yt-dlp.exe");
  }
  if (name === "yt-dlp" && process.platform === "linux") {
    return path.join(process.cwd(), ".yt-dlp-bin", "yt-dlp");
  }
  return name;
}

async function version(name: "yt-dlp" | "ffmpeg") {
  try {
    const args = name === "yt-dlp" ? ["--version"] : ["-version"];
    const { stdout, stderr } = await execFileAsync(executable(name), args, {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    });
    const firstLine = `${stdout || stderr}`.split(/\r?\n/, 1)[0].trim();
    return { installed: true, version: firstLine };
  } catch {
    return { installed: false, version: null };
  }
}

export async function GET() {
  const [ytDlp, ffmpeg] = await Promise.all([version("yt-dlp"), version("ffmpeg")]);
  return Response.json({
    ready: ytDlp.installed && ffmpeg.installed,
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    ytDlp,
    ffmpeg,
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir =
  path.join(
    process.cwd(),
    ".yt-dlp-bin",
  );

function asset() {
  if (
    process.platform === "win32"
  ) {
    return process.arch === "arm64"
      ? "yt-dlp_arm64.exe"
      : "yt-dlp.exe";
  }

  if (
    process.platform === "linux"
  ) {
    if (
      process.arch === "arm64"
    ) {
      return "yt-dlp_linux_aarch64";
    }

    if (
      process.arch === "x64"
    ) {
      return "yt-dlp_linux";
    }
  }

  if (
    process.platform === "darwin"
  ) {
    return "yt-dlp_macos";
  }

  throw new Error(
    "Khong ho tro " +
      process.platform +
      "/" +
      process.arch,
  );
}

async function main() {
  fs.rmSync(
    dir,
    {
      recursive: true,
      force: true,
    },
  );

  fs.mkdirSync(
    dir,
    {
      recursive: true,
    },
  );

  const file =
    process.platform === "win32"
      ? "yt-dlp.exe"
      : "yt-dlp";

  const target =
    path.join(
      dir,
      file,
    );

  const url =
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/" +
    asset();

  console.log(
    "[yt-dlp] Tai binary moi nhat...",
  );

  console.log(
    "[yt-dlp]",
    url,
  );

  const r =
    await fetch(
      url,
      {
        redirect: "follow",

        headers: {
          "User-Agent":
            "duongnt-website-build",
        },
      },
    );

  if (!r.ok) {
    throw new Error(
      "Tai yt-dlp that bai, HTTP " +
        r.status,
    );
  }

  const bytes =
    Buffer.from(
      await r.arrayBuffer(),
    );

  fs.writeFileSync(
    target,
    bytes,
  );

  if (
    process.platform !== "win32"
  ) {
    fs.chmodSync(
      target,
      0o755,
    );
  }

  const test =
    spawnSync(
      target,
      [
        "--version",
      ],
      {
        encoding: "utf8",
      },
    );

  if (
    test.status !== 0
  ) {
    throw new Error(
      String(
        test.stderr ||
        test.error ||
        "yt-dlp khong chay duoc",
      ),
    );
  }

  console.log(
    "[yt-dlp] Version:",
    String(
      test.stdout,
    ).trim(),
  );

  console.log(
    "[yt-dlp] San sang.",
  );
}

main().catch(
  (e) => {
    console.error("");
    console.error(
      "[yt-dlp] CAI DAT THAT BAI",
    );

    console.error(
      e instanceof Error
        ? e.message
        : e,
    );

    console.error("");

    process.exit(1);
  },
);

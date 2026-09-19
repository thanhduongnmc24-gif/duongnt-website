
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root =
  process.cwd();

const venv =
  path.join(
    root,
    ".ytdlp-venv",
  );

const provider =
  path.join(
    root,
    ".yt-pot-provider",
  );


function run(
  command,
  args,
  options = {},
) {

  console.log("");
  console.log(
    ">",
    command,
    ...args,
  );

  const r =
    spawnSync(
      command,
      args,
      {
        cwd:
          options.cwd ||
          root,

        stdio:
          "inherit",

        shell:
          false,

        env: {
          ...process.env,
        },
      },
    );


  if (
    r.error
  ) {
    throw r.error;
  }


  if (
    r.status !== 0
  ) {
    throw new Error(
      command +
        " that bai, exit code " +
        r.status,
    );
  }
}


function pythonInVenv() {

  if (
    process.platform ===
    "win32"
  ) {
    return path.join(
      venv,
      "Scripts",
      "python.exe",
    );
  }


  return path.join(
    venv,
    "bin",
    "python3",
  );
}


async function main() {

  console.log("");
  console.log(
    "=== Cai yt-dlp stack ===",
  );


  /*
   * Xoa ban build cu.
   */

  fs.rmSync(
    venv,
    {
      recursive: true,
      force: true,
    },
  );


  fs.rmSync(
    provider,
    {
      recursive: true,
      force: true,
    },
  );


  /*
   * Tim Python.
   */

  const pythonCommand =
    process.platform === "win32"
      ? "python"
      : "python3";


  /*
   * Tao virtualenv.
   */

  run(
    pythonCommand,
    [
      "-m",
      "venv",
      venv,
    ],
  );


  const python =
    pythonInVenv();


  /*
   * Nang pip.
   */

  run(
    python,
    [
      "-m",
      "pip",
      "install",
      "--upgrade",
      "pip",
      "setuptools",
      "wheel",
    ],
  );


  /*
   * Cai yt-dlp.
   *
   * default:
   * cac dependency khuyen nghi.
   *
   * curl-cffi:
   * TLS/browser impersonation tot hon.
   */

  run(
    python,
    [
      "-m",
      "pip",
      "install",
      "--upgrade",
      "yt-dlp[default,curl-cffi]",
    ],
  );


  /*
   * POT Provider plugin.
   *
   * Pin 2.0.0 de plugin va
   * generation server cung version.
   */

  run(
    python,
    [
      "-m",
      "pip",
      "install",
      "--upgrade",
      "bgutil-ytdlp-pot-provider==2.0.0",
    ],
  );


  /*
   * Tai dung source POT provider
   * version 2.0.0.
   */

  run(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "--branch",
      "2.0.0",
      "https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git",
      provider,
    ],
  );


  const server =
    path.join(
      provider,
      "server",
    );


  /*
   * Cai Node dependency cua
   * BotGuard/POT generator.
   */

  run(
    "npm",
    [
      "ci",
    ],
    {
      cwd:
        server,
    },
  );


  /*
   * Compile TypeScript POT generator.
   */

  const npx =
    process.platform === "win32"
      ? "npx.cmd"
      : "npx";


  run(
    npx,
    [
      "tsc",
    ],
    {
      cwd:
        server,
    },
  );


  /*
   * Test yt-dlp.
   */

  run(
    python,
    [
      "-m",
      "yt_dlp",
      "--version",
    ],
  );


  /*
   * Test plugin + Node JS runtime.
   *
   * Day chi la smoke test.
   * Khong duoc lam ca deployment that bai
   * chi vi YouTube tam thoi chan video test.
   */

  console.log("");
  console.log(
    "=== Test yt-dlp + POT + Node JS runtime ===",
  );

  console.log(
    "Node runtime:",
    process.execPath,
  );


  const smokeArgs = [
    "-m",
    "yt_dlp",

    "-v",

    "--simulate",

    /*
     * QUAN TRONG:
     *
     * Log cu bao:
     *
     * JS runtimes: none
     *
     * nen signature challenge khong giai duoc.
     */

    "--js-runtimes",

    "node:" +
      process.execPath,

    /*
     * Test dung format audio
     * ma DuongTube se dung.
     */

    "-f",

    "m4a/bestaudio/best",

    /*
     * mweb + POT
     */

    "--extractor-args",

    "youtube:player-client=mweb",

    "--extractor-args",

    "youtubepot-bgutilscript:server_home=" +
      server,

    /*
     * Chi test metadata/format,
     * khong download file.
     */

    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ];


  console.log(
    ">",
    python,
    ...smokeArgs,
  );


  const smoke =
    spawnSync(
      python,
      smokeArgs,
      {
        cwd:
          root,

        stdio:
          "inherit",

        shell:
          false,

        env: {
          ...process.env,

          TOKEN_TTL:
            "6",

          NO_COLOR:
            "1",
        },
      },
    );


  if (
    smoke.error
  ) {

    console.warn("");
    console.warn(
      "[CANH BAO] Smoke test khong chay duoc:",
    );

    console.warn(
      smoke.error.message,
    );

    console.warn(
      "Build se tiep tuc.",
    );

  } else if (
    smoke.status !== 0
  ) {

    console.warn("");
    console.warn(
      "==========================================",
    );

    console.warn(
      "[CANH BAO] YouTube smoke test that bai.",
    );

    console.warn(
      "Exit code:",
      smoke.status,
    );

    console.warn("");
    console.warn(
      "Dieu nay KHONG co nghia la Next.js build bi loi.",
    );

    console.warn(
      "YouTube co the dang chan IP Render hoac video test.",
    );

    console.warn(
      "Build se tiep tuc de website van deploy.",
    );

    console.warn(
      "==========================================",
    );

  } else {

    console.log("");
    console.log(
      "==========================================",
    );

    console.log(
      " YT-DLP + POT + NODE JS TEST OK",
    );

    console.log(
      "==========================================",
    );
  }



  console.log("");
  console.log(
    "======================================",
  );

  console.log(
    " YT-DLP + POT PROVIDER SAN SANG",
  );

  console.log(
    "======================================",
  );
}


main().catch(
  (error) => {

    console.error("");
    console.error(
      "CAI DAT YOUTUBE STACK THAT BAI",
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    console.error("");

    process.exit(1);
  },
);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const f = (p) => path.join(root, p);
const exists = (p) => fs.existsSync(f(p));
const read = (p) => fs.readFileSync(f(p), "utf8");

function backup(p) {
  if (!exists(p)) return;

  const dest = `${f(p)}.bak-${stamp}`;

  fs.copyFileSync(
    f(p),
    dest,
  );

  console.log(
    `Backup: ${p}`,
  );
}

function write(p, content) {
  fs.mkdirSync(
    path.dirname(f(p)),
    {
      recursive: true,
    },
  );

  backup(p);

  fs.writeFileSync(
    f(p),
    content,
    "utf8",
  );

  console.log(
    `Da tao/cap nhat: ${p}`,
  );
}

function gitignore(line) {
  const p = ".gitignore";

  const old =
    exists(p)
      ? read(p)
      : "";

  const lines =
    old
      .split(/\r?\n/)
      .map((x) => x.trim());

  if (
    lines.includes(line)
  ) {
    return;
  }

  fs.writeFileSync(
    f(p),

    old.replace(/\s*$/, "") +
      (old.trim() ? "\n" : "") +
      line +
      "\n",

    "utf8",
  );

  console.log(
    `Gitignore: ${line}`,
  );
}


/*
 * =========================================================
 * BAT DAU
 * =========================================================
 */

console.log("");
console.log("===============================================");
console.log(" DuongTube - yt-dlp + PO Token + Cookie Fix");
console.log("===============================================");
console.log("");


if (
  !exists("package.json")
) {
  console.error(
    "Khong tim thay package.json.",
  );

  console.error(
    "Hay dat file nay o thu muc goc project.",
  );

  process.exit(1);
}


let pkg;

try {
  pkg =
    JSON.parse(
      read("package.json"),
    );
} catch {
  console.error(
    "package.json khong hop le.",
  );

  process.exit(1);
}


if (
  !pkg.dependencies?.next
) {
  console.error(
    "Day khong phai project Next.js.",
  );

  process.exit(1);
}


/*
 * =========================================================
 * 1. BUILD HELPER
 * =========================================================
 *
 * Cai:
 *
 * - Python venv
 * - yt-dlp
 * - curl-cffi
 * - bgutil POT plugin
 * - bgutil POT generation script
 *
 * Tat ca nam TRONG CHINH service hien tai.
 */

write(
  "scripts/install-youtube-stack.mjs",

  String.raw`
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
   * Test plugin.
   */

  run(
    python,
    [
      "-m",
      "yt_dlp",

      "-v",

      "--simulate",

      "--extractor-args",

      "youtube:player-client=mweb",

      "--extractor-args",

      "youtubepot-bgutilscript:server_home=" +
        server,

      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ],
  );


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
`,
);


/*
 * =========================================================
 * 2. STREAM ROUTE
 * =========================================================
 */

write(
  "src/app/api/youtube/stream/route.ts",

  String.raw`
import { NextResponse } from "next/server";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";


export async function GET(
  request: Request,
) {

  const id =
    new URL(
      request.url,
    )
      .searchParams
      .get("id")
      ?.trim();


  if (
    !id ||

    !/^[a-zA-Z0-9_-]{6,20}$/.test(
      id,
    )
  ) {

    return NextResponse.json(
      {
        loi:
          "ID video khong hop le.",
      },

      {
        status:
          400,
      },
    );
  }


  return NextResponse.json(
    {
      url:
        "/api/youtube/audio?id=" +
        encodeURIComponent(
          id,
        ),
    },

    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
`,
);


/*
 * =========================================================
 * 3. AUDIO PROXY
 * =========================================================
 */

write(
  "src/app/api/youtube/audio/route.ts",

  String.raw`
import {
  execFile,
} from "node:child_process";

import {
  promises as fs,
} from "node:fs";

import os from "node:os";
import path from "node:path";


export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";


type StreamInfo = {
  url: string;

  headers:
    Record<
      string,
      string
    >;

  expiresAt:
    number;
};


type CacheGlobal =
  typeof globalThis & {

    __duongTubeCache?:
      Map<
        string,
        StreamInfo
      >;

    __duongTubePending?:
      Map<
        string,
        Promise<StreamInfo>
      >;

    __duongTubeCookiePath?:
      string | null;
  };


const g =
  globalThis as CacheGlobal;


const cache =
  g.__duongTubeCache ??
  new Map<
    string,
    StreamInfo
  >();


const pending =
  g.__duongTubePending ??
  new Map<
    string,
    Promise<StreamInfo>
  >();


g.__duongTubeCache =
  cache;

g.__duongTubePending =
  pending;


/*
 * ========================================================
 * Python
 * ========================================================
 */

function pythonPath() {

  if (
    process.platform ===
    "win32"
  ) {

    return path.join(
      process.cwd(),
      ".ytdlp-venv",
      "Scripts",
      "python.exe",
    );
  }


  return path.join(
    process.cwd(),
    ".ytdlp-venv",
    "bin",
    "python3",
  );
}


/*
 * ========================================================
 * PO Token Provider
 * ========================================================
 */

function potServerHome() {

  return path.join(
    process.cwd(),

    ".yt-pot-provider",

    "server",
  );
}


/*
 * ========================================================
 * Cookie
 * ========================================================
 *
 * Render Environment:
 *
 * YOUTUBE_COOKIES_B64
 *
 * Gia tri la NOI DUNG cookies.txt
 * da ma hoa Base64.
 *
 * Tuyet doi khong commit cookie vao Git.
 */

async function cookiePath() {

  if (
    g.__duongTubeCookiePath !==
    undefined
  ) {

    return (
      g.__duongTubeCookiePath ||
      null
    );
  }


  const encoded =
    process.env
      .YOUTUBE_COOKIES_B64
      ?.trim();


  if (!encoded) {

    console.log(
      "[DuongTube] Khong co YOUTUBE_COOKIES_B64. Chay o che do anonymous.",
    );


    g.__duongTubeCookiePath =
      null;


    return null;
  }


  try {

    const decoded =
      Buffer
        .from(
          encoded,
          "base64",
        )
        .toString(
          "utf8",
        );


    if (
      !decoded.includes(
        ".youtube.com",
      ) &&

      !decoded.includes(
        "youtube.com",
      )
    ) {

      throw new Error(
        "Cookie khong co youtube.com",
      );
    }


    if (
      !decoded.startsWith(
        "# Netscape HTTP Cookie File",
      ) &&

      !decoded.startsWith(
        "# HTTP Cookie File",
      )
    ) {

      throw new Error(
        "Cookie khong phai Netscape cookies.txt",
      );
    }


    const dest =
      path.join(
        os.tmpdir(),
        "duongtube-youtube-cookies.txt",
      );


    await fs.writeFile(
      dest,

      decoded,

      {
        encoding:
          "utf8",

        mode:
          0o600,
      },
    );


    console.log(
      "[DuongTube] Da nap YouTube cookies.",
    );


    g.__duongTubeCookiePath =
      dest;


    return dest;

  } catch (error) {

    console.error(
      "[DuongTube] Cookie loi:",
      error,
    );


    g.__duongTubeCookiePath =
      null;


    return null;
  }
}


/*
 * ========================================================
 * Chay yt-dlp
 * ========================================================
 */

async function extract(
  id: string,
) {

  const cookie =
    await cookiePath();


  return new Promise<StreamInfo>(
    (
      resolve,
      reject,
    ) => {

      const args = [
        "-m",
        "yt_dlp",

        "--no-playlist",

        "--no-progress",

        "--no-warnings",

        /*
         * Cho yt-dlp dung
         * Node cua Next.js.
         */

        "--js-runtimes",

        "node:" +
          process.execPath,

        /*
         * mweb la client
         * duoc khuyen nghi voi POT.
         */

        "--extractor-args",

        "youtube:player-client=mweb",

        /*
         * BgUtils POT generation script.
         *
         * Chay CUNG SERVICE,
         * khong co HTTP service moi.
         */

        "--extractor-args",

        "youtubepot-bgutilscript:server_home=" +
          potServerHome(),

        /*
         * Uu tien audio m4a.
         */

        "-f",

        "m4a/bestaudio/best",

        /*
         * Metadata JSON.
         */

        "-J",
      ];


      /*
       * Neu co cookies,
       * them authentication.
       */

      if (cookie) {

        args.push(
          "--cookies",
          cookie,
        );
      }


      args.push(
        "https://www.youtube.com/watch?v=" +
          id,
      );


      execFile(
        pythonPath(),

        args,

        {
          timeout:
            60_000,

          maxBuffer:
            50 *
            1024 *
            1024,

          windowsHide:
            true,

          env: {
            ...process.env,

            /*
             * POT cache.
             */

            TOKEN_TTL:
              "6",

            NO_COLOR:
              "1",
          },
        },

        (
          error,
          stdout,
          stderr,
        ) => {

          if (error) {

            const raw =
              String(
                stderr ||
                error.message,
              )
                .replace(
                  /\x1b\[[0-9;]*m/g,
                  "",
                )
                .trim();


            console.error(
              "[DuongTube yt-dlp raw]",
              raw,
            );


            /*
             * Loi age restriction.
             */

            if (
              /confirm your age/i.test(
                raw,
              ) ||

              /age.?restricted/i.test(
                raw,
              )
            ) {

              reject(
                new Error(
                  "Video giới hạn độ tuổi. Hãy cấu hình YOUTUBE_COOKIES_B64 trên Render.",
                ),
              );

              return;
            }


            /*
             * Loi bot.
             */

            if (
              /not a bot/i.test(
                raw,
              )
            ) {

              reject(
                new Error(
                  cookie
                    ? "YouTube vẫn yêu cầu xác minh bot dù đã có cookie/POT. Cookie có thể hết hạn hoặc IP Render đang bị chặn."
                    : "YouTube yêu cầu xác minh bot. POT đã được bật; hãy thêm YOUTUBE_COOKIES_B64 nếu lỗi vẫn tiếp diễn.",
                ),
              );

              return;
            }


            const lines =
              raw
                .split(
                  /\r?\n/,
                )
                .filter(
                  Boolean,
                );


            reject(
              new Error(
                (
                  lines[
                    lines.length -
                      1
                  ] ||
                  "yt-dlp that bai"
                ).slice(
                  0,
                  700,
                ),
              ),
            );


            return;
          }


          try {

            const info =
              JSON.parse(
                stdout,
              );


            const candidates =
              [
                info,

                ...(
                  Array.isArray(
                    info.requested_downloads,
                  )
                    ? info.requested_downloads
                    : []
                ),

                ...(
                  Array.isArray(
                    info.requested_formats,
                  )
                    ? info.requested_formats
                    : []
                ),
              ];


            const selected =
              candidates.find(
                (x) =>
                  x &&

                  typeof x.url ===
                    "string" &&

                  /^https?:\/\//i.test(
                    x.url,
                  ),
              );


            if (!selected) {

              throw new Error(
                "yt-dlp khong tra ve URL audio.",
              );
            }


            const rawHeaders =
              selected.http_headers ??
              info.http_headers ??
              {};


            const headers:
              Record<
                string,
                string
              > = {};


            if (
              rawHeaders &&
              typeof rawHeaders ===
                "object"
            ) {

              for (
                const [
                  key,
                  value,
                ] of
                  Object.entries(
                    rawHeaders,
                  )
              ) {

                const lower =
                  key.toLowerCase();


                if (
                  typeof value ===
                    "string" &&

                  lower !==
                    "host" &&

                  lower !==
                    "content-length" &&

                  lower !==
                    "connection"
                ) {

                  headers[
                    key
                  ] =
                    value;
                }
              }
            }


            resolve({
              url:
                selected.url,

              headers,

              /*
               * Googlevideo URL
               * co thoi han.
               */

              expiresAt:
                Date.now() +
                4 *
                  60 *
                  1000,
            });

          } catch (parseError) {

            reject(
              parseError instanceof Error
                ? parseError
                : new Error(
                    "Khong doc duoc output yt-dlp.",
                  ),
            );
          }
        },
      );
    },
  );
}


/*
 * ========================================================
 * Cache metadata
 * ========================================================
 */

async function info(
  id: string,

  force = false,
) {

  if (!force) {

    const existing =
      cache.get(id);


    if (
      existing &&
      existing.expiresAt >
        Date.now()
    ) {

      return existing;
    }


    const active =
      pending.get(id);


    if (active) {

      return active;
    }
  }


  const job =
    extract(id)

      .then(
        (value) => {

          cache.set(
            id,
            value,
          );


          return value;
        },
      )

      .finally(
        () => {

          pending.delete(
            id,
          );
        },
      );


  pending.set(
    id,
    job,
  );


  return job;
}


/*
 * ========================================================
 * Fetch Googlevideo
 * ========================================================
 */

async function fetchSource(
  request: Request,

  id: string,

  force: boolean,

  method:
    | "GET"
    | "HEAD",
) {

  const data =
    await info(
      id,
      force,
    );


  const headers =
    new Headers(
      data.headers,
    );


  /*
   * Audio element gui Range.
   */

  const range =
    request.headers.get(
      "range",
    );


  if (range) {

    headers.set(
      "range",
      range,
    );
  }


  headers.set(
    "accept-encoding",
    "identity",
  );


  return fetch(
    data.url,

    {
      method,

      headers,

      redirect:
        "follow",

      cache:
        "no-store",
    },
  );
}


/*
 * ========================================================
 * Response headers
 * ========================================================
 */

function responseHeaders(
  response: Response,
) {

  const out =
    new Headers();


  for (
    const key of [
      "accept-ranges",
      "content-length",
      "content-range",
      "content-type",
      "etag",
      "last-modified",
    ]
  ) {

    const value =
      response.headers.get(
        key,
      );


    if (value) {

      out.set(
        key,
        value,
      );
    }
  }


  if (
    !out.has(
      "content-type",
    )
  ) {

    out.set(
      "content-type",
      "audio/mp4",
    );
  }


  out.set(
    "cache-control",
    "private, no-store, max-age=0",
  );


  return out;
}


/*
 * ========================================================
 * Request
 * ========================================================
 */

async function handle(
  request: Request,

  method:
    | "GET"
    | "HEAD",
) {

  const id =
    new URL(
      request.url,
    )
      .searchParams
      .get("id")
      ?.trim();


  if (
    !id ||

    !/^[a-zA-Z0-9_-]{6,20}$/.test(
      id,
    )
  ) {

    return Response.json(
      {
        loi:
          "ID video khong hop le.",
      },

      {
        status:
          400,
      },
    );
  }


  try {

    let response =
      await fetchSource(
        request,
        id,
        false,
        method,
      );


    /*
     * URL het han / bi reject:
     * lay URL moi mot lan.
     */

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 410
    ) {

      try {
        await response.body?.cancel();
      } catch {
        // Ignore.
      }


      cache.delete(
        id,
      );


      response =
        await fetchSource(
          request,
          id,
          true,
          method,
        );
    }


    if (
      !response.ok
    ) {

      const status =
        response.status;


      try {
        await response.body?.cancel();
      } catch {
        // Ignore.
      }


      throw new Error(
        "YouTube media server tra HTTP " +
          status +
          ".",
      );
    }


    return new Response(
      method === "HEAD"
        ? null
        : response.body,

      {
        status:
          response.status,

        headers:
          responseHeaders(
            response,
          ),
      },
    );

  } catch (error) {

    console.error(
      "[DuongTube yt-dlp]",
      error,
    );


    return Response.json(
      {
        loi:
          error instanceof Error
            ? error.message
            : "Khong lay duoc audio.",
      },

      {
        status:
          502,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}


export async function GET(
  request: Request,
) {

  return handle(
    request,
    "GET",
  );
}


export async function HEAD(
  request: Request,
) {

  return handle(
    request,
    "HEAD",
  );
}
`,
);


/*
 * =========================================================
 * 4. PACKAGE.JSON
 * =========================================================
 */

pkg.scripts =
  pkg.scripts ||
  {};


let build =
  pkg.scripts.build ||
  "next build --webpack";


/*
 * Bo installer yt-dlp cu neu co.
 */

build =
  build.replace(
    /node scripts\/install-ytdlp\.mjs\s*&&\s*/g,
    "",
  );


build =
  build.replace(
    /node scripts\/install-youtube-stack\.mjs\s*&&\s*/g,
    "",
  );


pkg.scripts.build =
  "node scripts/install-youtube-stack.mjs && " +
  build;


write(
  "package.json",

  JSON.stringify(
    pkg,
    null,
    2,
  ) + "\n",
);


/*
 * =========================================================
 * 5. NODE VERSION
 * =========================================================
 */

if (
  !exists(".node-version") ||
  Number.parseInt(
    read(".node-version"),
    10,
  ) < 22
) {

  if (
    exists(".node-version")
  ) {

    backup(
      ".node-version",
    );
  }


  fs.writeFileSync(
    f(".node-version"),

    "22.22.0\n",

    "utf8",
  );


  console.log(
    "Node version: 22.22.0",
  );
}


/*
 * =========================================================
 * 6. GITIGNORE
 * =========================================================
 */

gitignore(
  ".ytdlp-venv/",
);

gitignore(
  ".yt-pot-provider/",
);

gitignore(
  ".yt-dlp-bin/",
);

gitignore(
  "*.bak-*",
);


/*
 * =========================================================
 * XONG
 * =========================================================
 */

console.log(`
===============================================
 HOAN THANH
===============================================

Da cai kien truc:

  DuongTube
      |
      v
  yt-dlp
      |
      +--> bgutil PO Token
      |
      +--> YouTube cookies (neu co)
      |
      v
  YouTube


KHONG tao Web Service moi.

KHONG dung Cobalt.


Bay gio chay:

  npm run build


PUBLIC VIDEO:

  POT Provider co the xu ly
  loi bot ma khong can login.


AGE RESTRICTED VIDEO:

  Can them Environment Variable:

  YOUTUBE_COOKIES_B64

vao Render.


Tuyet doi:

  KHONG commit cookies.txt vao Git.

  KHONG gui cookie cho nguoi khac.

  KHONG paste cookie vao ChatGPT.
`);
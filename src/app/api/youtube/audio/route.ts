
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

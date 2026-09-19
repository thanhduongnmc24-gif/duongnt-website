import {
  execFile,
} from "node:child_process";

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


type GlobalCache =
  typeof globalThis & {
    __duongTubeAudioCache?:
      Map<
        string,
        StreamInfo
      >;

    __duongTubeAudioPending?:
      Map<
        string,
        Promise<StreamInfo>
      >;
  };


const g =
  globalThis as GlobalCache;


const cache =
  g.__duongTubeAudioCache ??
  new Map<
    string,
    StreamInfo
  >();


const pending =
  g.__duongTubeAudioPending ??
  new Map<
    string,
    Promise<StreamInfo>
  >();


g.__duongTubeAudioCache =
  cache;

g.__duongTubeAudioPending =
  pending;


/*
 * Vi tri binary duoc tai
 * trong luc npm run build.
 */

function binary() {
  return path.join(
    process.cwd(),

    ".yt-dlp-bin",

    process.platform === "win32"
      ? "yt-dlp.exe"
      : "yt-dlp",
  );
}


/*
 * Chay yt-dlp va lay metadata
 * cua format audio.
 */

function ytdlp(
  id: string,
) {
  return new Promise<StreamInfo>(
    (
      resolve,
      reject,
    ) => {

      execFile(
        binary(),

        [
          "--no-playlist",

          "--no-progress",

          "--no-warnings",

          /*
           * yt-dlp moi can
           * JavaScript runtime
           * de xu ly YouTube.
           *
           * Dung chinh Node
           * dang chay Next.js.
           */

          "--js-runtimes",

          "node:" +
            process.execPath,

          /*
           * Uu tien audio m4a.
           *
           * Neu khong co thi
           * dung bestaudio.
           */

          "-f",

          "m4a/bestaudio/best",

          /*
           * Tra metadata JSON,
           * KHONG download file.
           */

          "-J",

          "https://www.youtube.com/watch?v=" +
            id,
        ],

        {
          timeout:
            45_000,

          maxBuffer:
            50 *
            1024 *
            1024,

          windowsHide:
            true,

          env: {
            ...process.env,

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

            const err =
              error as
                NodeJS.ErrnoException;


            if (
              err.code ===
              "ENOENT"
            ) {
              reject(
                new Error(
                  "Khong tim thay yt-dlp. Hay deploy/build lai.",
                ),
              );

              return;
            }


            const lines =
              String(
                stderr ||
                error.message,
              )
                .replace(
                  /\x1b\[[0-9;]*m/g,
                  "",
                )
                .trim()
                .split(
                  /\r?\n/,
                )
                .filter(
                  Boolean,
                );


            reject(
              new Error(
                "yt-dlp loi: " +

                (
                  lines[
                    lines.length -
                      1
                  ] ||
                  error.message
                ).slice(
                  0,
                  600,
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


            /*
             * yt-dlp co the dat
             * URL o root hoac
             * requested_downloads /
             * requested_formats.
             */

            const choices =
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
              choices.find(
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


            /*
             * Headers do yt-dlp
             * tim ra can duoc
             * gui lai khi server
             * truy cap googlevideo.
             */

            const raw =
              selected.http_headers ??
              info.http_headers ??
              {};


            const headers:
              Record<
                string,
                string
              > = {};


            if (
              raw &&
              typeof raw ===
                "object"
            ) {

              for (
                const [
                  key,
                  value,
                ] of
                  Object.entries(
                    raw,
                  )
              ) {

                const k =
                  key.toLowerCase();


                if (
                  typeof value ===
                    "string" &&

                  k !==
                    "host" &&

                  k !==
                    "content-length" &&

                  k !==
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
               * Khong cache URL qua lau.
               *
               * URL googlevideo co
               * thoi han.
               */

              expiresAt:
                Date.now() +
                4 *
                  60 *
                  1000,
            });

          } catch (e) {

            reject(
              e instanceof Error
                ? e
                : new Error(
                    "Khong doc duoc ket qua yt-dlp.",
                  ),
            );
          }
        },
      );
    },
  );
}


/*
 * Lay stream info co cache.
 *
 * Neu browser gui nhieu Range
 * request lien tuc thi khong
 * can chay yt-dlp moi lan.
 */

async function getInfo(
  id: string,

  force = false,
) {

  if (!force) {

    const c =
      cache.get(id);


    if (
      c &&
      c.expiresAt >
        Date.now()
    ) {
      return c;
    }


    const p =
      pending.get(id);


    if (p) {
      return p;
    }
  }


  const task =
    ytdlp(id)

      .then(
        (info) => {

          cache.set(
            id,
            info,
          );

          return info;
        },
      )

      .finally(
        () =>
          pending.delete(
            id,
          ),
      );


  pending.set(
    id,
    task,
  );


  return task;
}


/*
 * Goi googlevideo tu server.
 */

async function source(
  request: Request,

  id: string,

  force: boolean,

  method:
    | "GET"
    | "HEAD",
) {

  const info =
    await getInfo(
      id,
      force,
    );


  const headers =
    new Headers(
      info.headers,
    );


  /*
   * Forward Range cua
   * audio element.
   *
   * Rat quan trong de tua.
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


  /*
   * Tranh gzip lam sai
   * content-length/range.
   */

  headers.set(
    "accept-encoding",
    "identity",
  );


  return fetch(
    info.url,

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
 * Chi forward cac header
 * media can thiet.
 */

function copyHeaders(
  r: Response,
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
      r.headers.get(
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
 * Xu ly GET/HEAD.
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
    ).searchParams
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

    let r =
      await source(
        request,

        id,

        false,

        method,
      );


    /*
     * Neu URL media
     * het han hoac YouTube
     * tu choi, chay yt-dlp
     * lai mot lan.
     */

    if (
      r.status ===
        401 ||

      r.status ===
        403 ||

      r.status ===
        410
    ) {

      try {
        await r.body?.cancel();
      } catch {
        // Bo qua.
      }


      cache.delete(
        id,
      );


      r =
        await source(
          request,

          id,

          true,

          method,
        );
    }


    if (!r.ok) {

      try {
        await r.body?.cancel();
      } catch {
        // Bo qua.
      }


      return Response.json(
        {
          loi:
            "Nguon YouTube tra ve HTTP " +
            r.status +
            ".",
        },

        {
          status:
            r.status >= 400
              ? r.status
              : 502,
        },
      );
    }


    /*
     * Stream truc tiep
     * tu Render ve dien thoai.
     *
     * Khong tai ca file
     * vao RAM.
     */

    return new Response(
      method === "HEAD"
        ? null
        : r.body,

      {
        status:
          r.status,

        headers:
          copyHeaders(r),
      },
    );

  } catch (e) {

    console.error(
      "[DuongTube yt-dlp]",
      e,
    );


    return Response.json(
      {
        loi:
          e instanceof Error
            ? e.message
            : "Khong lay duoc audio bang yt-dlp.",
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

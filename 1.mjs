import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function full(relative) {
  return path.join(root, relative);
}

function exists(relative) {
  return fs.existsSync(full(relative));
}

function read(relative) {
  return fs.readFileSync(full(relative), "utf8");
}

function backup(relative) {
  const file = full(relative);
  if (!fs.existsSync(file)) return null;

  const bak = `${file}.bak-${stamp}`;
  fs.copyFileSync(file, bak);
  console.log(`Backup: ${relative} -> ${path.basename(bak)}`);
  return bak;
}

function write(relative, content) {
  const file = full(relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  backup(relative);
  fs.writeFileSync(file, content, "utf8");
  console.log(`Da tao/cap nhat: ${relative}`);
}

console.log("\n=== DuongTube Background Media Installer ===\n");

if (!exists("package.json")) {
  console.error("Khong tim thay package.json.");
  console.error("Hay dat file nay vao thu muc goc cua project roi chay lai.");
  process.exit(1);
}

let pkg;

try {
  pkg = JSON.parse(read("package.json"));
} catch {
  console.error("package.json khong hop le.");
  process.exit(1);
}

if (!pkg.dependencies?.next) {
  console.error("Project nay khong co Next.js trong dependencies.");
  process.exit(1);
}

if (!exists("src/app/youtube/page.tsx")) {
  console.error("Khong tim thay src/app/youtube/page.tsx.");
  console.error("Hay chay installer DuongTube truoc, sau do chay file nay.");
  process.exit(1);
}

if (!exists("src/app/api/youtube/stream/route.ts")) {
  console.error("Khong tim thay src/app/api/youtube/stream/route.ts.");
  console.error("Ban DuongTube hien tai chua co API stream audio.");
  process.exit(1);
}

const currentPage = read("src/app/youtube/page.tsx");

if (
  currentPage.includes("MEDIA_ACTIONS") &&
  currentPage.includes("setPositionState") &&
  currentPage.includes('safeSetAction("seekbackward"')
) {
  console.log(
    "DuongTube da co Media Session background controls. Khong can cap nhat.",
  );
  process.exit(0);
}

write(
  "src/app/youtube/page.tsx",
  `"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Video = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
};

const MEDIA_ACTIONS: MediaSessionAction[] = [
  "play",
  "pause",
  "seekbackward",
  "seekforward",
  "seekto",
  "stop",
];

export default function DuongTube() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Video[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("Tìm video để bắt đầu nghe.");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/youtube-sw.js")
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!video || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: video.title,
      artist: video.channel,
      album: "DuongTube",
      artwork: video.thumbnail
        ? [
            {
              src: video.thumbnail,
            },
          ]
        : [],
    });
  }, [video]);

  useEffect(() => {
    if (!streamUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.play().catch(() => {
      setMsg(
        "Trình duyệt chặn tự phát. Hãy nhấn nút Play một lần để tiếp tục.",
      );
    });
  }, [streamUrl]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const mediaSession = navigator.mediaSession;

    const safeSetAction = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Một số trình duyệt chỉ hỗ trợ một phần Media Session API.
      }
    };

    safeSetAction("play", async () => {
      const audio = audioRef.current;
      if (!audio) return;

      try {
        await audio.play();
      } catch {
        setMsg(
          "Không thể tiếp tục phát. Hãy mở lại DuongTube và nhấn Play.",
        );
      }
    });

    safeSetAction("pause", () => {
      audioRef.current?.pause();
    });

    safeSetAction("stop", () => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.pause();
      audio.currentTime = 0;
    });

    safeSetAction("seekbackward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;

      const offset = details.seekOffset ?? 10;

      audio.currentTime = Math.max(
        0,
        audio.currentTime - offset,
      );
    });

    safeSetAction("seekforward", (details) => {
      const audio = audioRef.current;
      if (!audio) return;

      const offset = details.seekOffset ?? 10;
      const target = audio.currentTime + offset;

      audio.currentTime = Number.isFinite(audio.duration)
        ? Math.min(audio.duration, target)
        : target;
    });

    safeSetAction("seekto", (details) => {
      const audio = audioRef.current;

      if (!audio || details.seekTime == null) {
        return;
      }

      audio.currentTime = details.seekTime;
    });

    return () => {
      for (const action of MEDIA_ACTIONS) {
        safeSetAction(action, null);
      }
    };
  }, []);

  function syncMediaSessionPosition() {
    if (!("mediaSession" in navigator)) return;

    const audio = audioRef.current;

    if (
      !audio ||
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0 ||
      !Number.isFinite(audio.currentTime)
    ) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(
          audio.currentTime,
          audio.duration,
        ),
      });
    } catch {
      // Trình duyệt cũ có thể chưa hỗ trợ.
    }
  }

  function handlePlay() {
    setMsg("");

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }

    syncMediaSessionPosition();
  }

  function handlePause() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }

    syncMediaSessionPosition();
  }

  async function playVideo(v: Video) {
    setVideo(v);
    setStreamUrl("");
    setMsg("Đang chuẩn bị luồng âm thanh...");

    try {
      const res = await fetch(
        \`/api/youtube/stream?id=\${encodeURIComponent(v.id)}\`,
        {
          cache: "no-store",
        },
      );

      const text = await res.text();

      let data: {
        url?: string;
        loi?: string;
      };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Máy chủ trả về dữ liệu không hợp lệ.",
        );
      }

      if (!res.ok || !data.url) {
        throw new Error(
          data.loi || "Không thể lấy luồng âm thanh.",
        );
      }

      setStreamUrl(data.url);
      setMsg("");
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra.",
      );
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault();

    if (!q.trim()) {
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const r = await fetch(
        \`/api/youtube/search?q=\${encodeURIComponent(q.trim())}\`,
      );

      const text = await r.text();

      let data: {
        items?: Video[];
        loi?: string;
      };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "YouTube API trả về dữ liệu không hợp lệ.",
        );
      }

      if (!r.ok) {
        throw new Error(
          data.loi || "Không thể tìm kiếm.",
        );
      }

      setItems(data.items || []);

      if (!data.items?.length) {
        setMsg("Không tìm thấy video.");
      }
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <b className="text-xl text-red-500">
            DuongTube
          </b>

          <form
            onSubmit={search}
            className="flex min-w-0 flex-1"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm YouTube..."
              className="h-11 min-w-0 flex-1 rounded-l-full border border-slate-600 bg-slate-900 px-5 outline-none focus:border-blue-500"
            />

            <button
              disabled={loading}
              className="rounded-r-full bg-slate-700 px-5 font-bold disabled:opacity-50"
            >
              {loading ? "..." : "Tìm"}
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
            {video ? (
              <>
                <img
                  src={video.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="mb-6 h-32 w-32 rounded-2xl border-2 border-slate-700 object-cover shadow-2xl"
                  />

                  {streamUrl ? (
                    <audio
                      ref={audioRef}
                      controls
                      preload="auto"
                      src={streamUrl}
                      className="w-full max-w-md"
                      onPlay={handlePlay}
                      onPause={handlePause}
                      onLoadedMetadata={
                        syncMediaSessionPosition
                      }
                      onDurationChange={
                        syncMediaSessionPosition
                      }
                      onTimeUpdate={
                        syncMediaSessionPosition
                      }
                      onRateChange={
                        syncMediaSessionPosition
                      }
                      onEnded={() => {
                        if (
                          "mediaSession" in navigator
                        ) {
                          navigator.mediaSession.playbackState =
                            "none";
                        }
                      }}
                      onError={() =>
                        setMsg(
                          "Luồng âm thanh đã hết hạn hoặc bị máy chủ nguồn từ chối. Hãy chọn lại video để tạo luồng mới.",
                        )
                      }
                    />
                  ) : (
                    <div className="text-center font-medium text-white">
                      {msg || "Đang kết nối..."}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Chọn video từ kết quả tìm kiếm
              </div>
            )}
          </div>

          {video ? (
            <div className="py-4">
              <h1 className="text-xl font-black">
                {video.title}
              </h1>

              <p className="text-slate-400">
                {video.channel}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              Đã bật Media Session: khi trình duyệt cho
              phép phát audio nền, bạn có thể dùng
              Play/Pause và tua ngay từ màn hình khóa
              hoặc tai nghe.
            </p>

            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
              Lưu ý: khả năng tiếp tục phát sau khi khóa
              màn hình còn phụ thuộc iOS/Android, trình
              duyệt và việc URL luồng âm thanh còn hiệu
              lực.
            </p>

            {msg && video ? (
              <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                {msg}
              </p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-2">
          {msg && !video ? (
            <p className="rounded-xl bg-slate-900 p-4 text-slate-300">
              {msg}
            </p>
          ) : null}

          {items.map((v) => (
            <button
              key={v.id}
              onClick={() => playVideo(v)}
              className="grid w-full grid-cols-[150px_1fr] gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/10"
            >
              <img
                src={v.thumbnail}
                alt=""
                className="aspect-video rounded-lg object-cover"
              />

              <span>
                <strong className="line-clamp-2 text-sm">
                  {v.title}
                </strong>

                <small className="mt-2 block text-slate-400">
                  {v.channel}
                </small>
              </span>
            </button>
          ))}
        </aside>
      </div>
    </main>
  );
}
`,
);

console.log("");
console.log("HOAN THANH");
console.log("");
console.log("Da nang cap DuongTube voi:");
console.log("- Media Session metadata");
console.log("- Play / Pause tren man hinh khoa");
console.log("- Stop");
console.log("- Tua lui / tua toi");
console.log("- Seek position");
console.log("- Dong bo playback state");
console.log("- Dong bo progress voi he dieu hanh");
console.log("- Xu ly autoplay bi chan");
console.log("- Canh bao stream het han");
console.log("");
console.log("Tiep theo chay:");
console.log("");
console.log("  npm run build");
console.log("");
console.log("Neu build thanh cong thi deploy lai dich vu.");
console.log("");
console.log(
  "Luu y: background playback tren web con phu thuoc iOS/Android,",
);
console.log(
  "trinh duyet va URL stream audio. Khong co hack web nao dam bao 100%.",
);
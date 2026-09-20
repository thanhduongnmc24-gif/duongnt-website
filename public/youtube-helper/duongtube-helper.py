#!/usr/bin/env python3
"""Local audio bridge for DuongTube. Binds to loopback only."""

from __future__ import annotations

import json
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

try:
    import yt_dlp
except ImportError:
    print("Thiếu yt-dlp. Chạy: python -m pip install -U yt-dlp", file=sys.stderr)
    raise SystemExit(1)

HOST = "127.0.0.1"
PORT = 43110
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
ALLOWED_ORIGINS = {
    "https://youtube.duongnt.io.vn",
    "http://localhost:3000",
    "http://localhost:10000",
}
CACHE: dict[str, tuple[float, str, dict[str, str]]] = {}
CACHE_LOCK = threading.Lock()


def resolve_audio(video_id: str, refresh: bool = False) -> tuple[str, dict[str, str]]:
    now = time.time()
    with CACHE_LOCK:
        cached = CACHE.get(video_id)
        if cached and not refresh and cached[0] > now:
            return cached[1], cached[2]

    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 1,
        "extractor_retries": 1,
        "format": "bestaudio[ext=m4a][protocol=https]/bestaudio[protocol=https]/best[ext=mp4][protocol=https]",
        "extractor_args": {"youtube": {"player_client": ["web_music", "android_vr"]}},
        "js_runtimes": {"node": {}},
    }
    with yt_dlp.YoutubeDL(options) as client:
        info = client.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
    if not info or not isinstance(info.get("url"), str):
        raise RuntimeError("YouTube không trả về nguồn âm thanh phù hợp")
    headers = {
        str(key): str(value)
        for key, value in (info.get("http_headers") or {}).items()
        if str(key).lower() in {"user-agent", "accept", "accept-language", "referer", "origin"}
    }
    with CACHE_LOCK:
        CACHE[video_id] = (now + 240, info["url"], headers)
        if len(CACHE) > 40:
            oldest = min(CACHE, key=lambda key: CACHE[key][0])
            CACHE.pop(oldest, None)
    return info["url"], headers


class HelperHandler(BaseHTTPRequestHandler):
    server_version = "DuongTubeHelper/1.0"

    def log_message(self, message: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {message % args}")

    def cors(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

    def json_response(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self) -> None:
        self.handle_request(stream=False)

    def do_GET(self) -> None:
        self.handle_request(stream=True)

    def handle_request(self, stream: bool) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.json_response(200, {"ok": True, "name": "DuongTube helper", "version": 1})
            return
        if parsed.path != "/audio":
            self.json_response(404, {"loi": "Không tìm thấy đường dẫn.", "code": "NOT_FOUND"})
            return
        video_id = (parse_qs(parsed.query).get("id") or [""])[0]
        if not VIDEO_ID.fullmatch(video_id):
            self.json_response(400, {"loi": "ID video không hợp lệ.", "code": "INVALID_VIDEO"})
            return
        try:
            self.proxy_audio(video_id, stream)
        except Exception as error:
            print(f"[DuongTube helper] {video_id}: {error}", file=sys.stderr)
            try:
                self.json_response(502, {
                    "loi": "Helper chưa lấy được âm thanh. Hãy cập nhật yt-dlp rồi thử lại.",
                    "code": "HELPER_AUDIO_ERROR",
                })
            except (BrokenPipeError, ConnectionResetError):
                pass

    def proxy_audio(self, video_id: str, stream: bool) -> None:
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                url, headers = resolve_audio(video_id, refresh=attempt > 0)
                headers = {**headers, "Accept-Encoding": "identity"}
                if requested_range := self.headers.get("Range"):
                    headers["Range"] = requested_range
                request = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(request, timeout=30) as upstream:
                    self.send_response(upstream.status)
                    self.cors()
                    for name in ("Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"):
                        if value := upstream.headers.get(name):
                            self.send_header(name, value)
                    self.send_header("Cache-Control", "no-store")
                    self.end_headers()
                    if stream:
                        while chunk := upstream.read(64 * 1024):
                            self.wfile.write(chunk)
                    return
            except urllib.error.HTTPError as error:
                last_error = error
                if error.code not in (403, 410):
                    raise
        if last_error:
            raise last_error


class HelperServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    server = HelperServer((HOST, PORT), HelperHandler)
    print(f"DuongTube helper đang chạy tại http://{HOST}:{PORT}")
    print("Giữ Termux mở. Quay lại DuongTube và bấm nút tai nghe.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


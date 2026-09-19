"use client";

/* eslint-disable @next/next/no-img-element -- Thumbnails are external media artwork. */
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Check, ChevronLeft, CircleHelp, Clock3, ExternalLink, Headphones, Heart, History, House, ListMusic, LoaderCircle, Menu, MonitorPlay, Music2, Pause, Play, Radio, RefreshCw, Repeat2, Search, SkipBack, SkipForward, Volume2, VolumeX, WifiOff, X } from "lucide-react";
import { useYouTubeBackgroundPlayer } from "@/components/youtube/use-youtube-background-player";
import type { Video } from "@/components/youtube/types";
import { usePwa } from "@/components/youtube/use-pwa";
import "./youtube.css";

type View = "home" | "music" | "liked" | "history";
const categories = ["Tất cả", "Âm nhạc", "Nhạc Việt", "Lofi", "Acoustic", "Nhạc không lời", "K-pop", "Nhạc quốc tế", "Podcast", "Trực tiếp"];
const navItems = [{ id: "home", label: "Trang chủ", icon: House }, { id: "music", label: "Âm nhạc", icon: Music2 }, { id: "history", label: "Đã nghe", icon: History }, { id: "liked", label: "Yêu thích", icon: Heart }] as const;

function readLibrary(key: string): Video[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((v): v is Video => !!v && typeof v === "object" && /^[\w-]{11}$/.test(v.id) && [v.title, v.channel, v.thumbnail].every(x => typeof x === "string")).slice(0, 100) : [];
  } catch { return []; }
}
function saveLibrary(key: string, value: Video[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable in private mode. */ }
}
function time(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes > 59 ? `${Math.floor(minutes / 60)}:` : ""}${minutes > 59 ? String(minutes % 60).padStart(2, "0") : minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
function views(value?: number) {
  return value == null ? "" : `${new Intl.NumberFormat("vi", { notation: "compact", maximumFractionDigits: 1 }).format(value)} lượt xem`;
}

export default function DuongTube() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [items, setItems] = useState<Video[]>([]);
  const [liked, setLiked] = useState<Video[]>([]);
  const [history, setHistory] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [sidebar, setSidebar] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState(false);
  const [embedOrigin, setEmbedOrigin] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pwa = usePwa();
  const onStarted = useCallback((video: Video) => {
    setHistory(previous => {
      const next = [video, ...previous.filter(v => v.id !== video.id)].slice(0, 100);
      saveLibrary("duongtube-history", next);
      return next;
    });
  }, []);
  const player = useYouTubeBackgroundPlayer({ onStarted });

  useEffect(() => {
    setLiked(readLibrary("duongtube-liked"));
    setHistory(readLibrary("duongtube-history"));
    const q = new URL(window.location.href).searchParams.get("q") || "";
    setEmbedOrigin(window.location.origin);
    setQuery(q); setSubmitted(q);
    const syncOnline = () => setOffline(!navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => { window.removeEventListener("online", syncOnline); window.removeEventListener("offline", syncOnline); };
  }, []);

  useEffect(() => {
    if (view === "liked" || view === "history") return;
    const controller = new AbortController();
    const term = submitted || (category !== "Tất cả" ? category : "");
    setLoading(true); setLoadError("");
    fetch(`/api/youtube/search${term ? `?q=${encodeURIComponent(term)}` : ""}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.loi || "Không thể tải video lúc này.");
        setItems(data.items || []);
      })
      .catch(error => { if (!controller.signal.aborted) { setItems([]); setLoadError(error instanceof Error ? error.message : "Không thể kết nối. Vui lòng thử lại."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [submitted, category, view, reload]);

  useEffect(() => {
    if (help) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [help]);

  function navigate(next: View) {
    setView(next); setSidebar(false); setExpanded(false); setVideoMode(false);
    setSubmitted(""); setQuery(""); setCategory(next === "music" ? "Âm nhạc" : "Tất cả");
    const url = new URL(window.location.href); url.searchParams.delete("q"); window.history.replaceState(null, "", url);
  }
  function search(event: FormEvent) {
    event.preventDefault();
    setSubmitted(query.trim()); setView("home"); setCategory("Tất cả"); setExpanded(false); setVideoMode(false);
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim()); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
    searchRef.current?.blur();
  }
  function toggleLike(video: Video) {
    setLiked(previous => {
      const next = previous.some(v => v.id === video.id) ? previous.filter(v => v.id !== video.id) : [video, ...previous].slice(0, 100);
      saveLibrary("duongtube-liked", next); return next;
    });
  }
  const visible = view === "liked" ? liked : view === "history" ? history : items;
  const busy = loading && view !== "liked" && view !== "history";
  const error = view === "liked" || view === "history" ? "" : loadError;
  const activeVideo = videoMode ? selectedVideo : player.current;
  const currentLiked = !!activeVideo && liked.some(v => v.id === activeVideo.id);
  function watch(video: Video) {
    player.close();
    setSelectedVideo(video);
    setShowQueue(false);
    setVideoMode(true);
    setExpanded(true);
    onStarted(video);
  }
  function listen(video: Video, videos: Video[] = visible) {
    setSelectedVideo(video);
    setVideoMode(false);
    setExpanded(true);
    player.play(video, videos);
  }
  function togglePlayback() { setVideoMode(false); player.toggle(); }
  function enableVideo() {
    if (!activeVideo) return;
    watch(activeVideo);
  }
  function useOfficialPlayer() { if (player.current) watch(player.current); }
  const heading = view === "liked" ? "Video bạn yêu thích" : view === "history" ? "Nhạc đã nghe" : submitted ? `Kết quả cho “${submitted}”` : "Dành cho bạn";

  return (
    <div className={`yt-app ${sidebar ? "yt-sidebar-open" : ""} ${player.current ? "yt-has-player" : ""}`}>
      <a className="yt-skip" href="#youtube-content">Đi đến nội dung</a>
      <div className="yt-hidden-iframe-player" aria-hidden="true"><div ref={player.hostRef} /></div>
      <header className="yt-header">
        <div className="yt-brand-group">
          <button className="yt-icon-button yt-menu" aria-label="Mở menu" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Menu /></button>
          <button className="yt-brand" onClick={() => navigate("home")} aria-label="DuongTube — Trang chủ"><span className="yt-logo"><Play size={20} fill="currentColor" strokeWidth={0} /></span><span>DuongTube</span><sup>VN</sup></button>
        </div>
        <form className="yt-search" onSubmit={search} role="search">
          <input ref={searchRef} aria-label="Tìm kiếm YouTube" placeholder="Tìm kiếm hoặc dán liên kết YouTube" value={query} onChange={e => setQuery(e.target.value)} maxLength={500} />
          {query && <button type="button" className="yt-clear-search" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={19} /></button>}
          <button type="submit" aria-label="Tìm kiếm"><Search size={23} /></button>
        </form>
        <div className="yt-header-actions">
          <button className="yt-install" onClick={() => pwa.canInstall ? pwa.install() : setHelp(true)}><ArrowDownToLine size={18} /><span>{pwa.installed ? "Đã cài đặt" : "Cài ứng dụng"}</span></button>
          <button className="yt-avatar" aria-label="Mở thư viện của bạn" onClick={() => navigate("liked")}>D</button>
        </div>
      </header>
      {sidebar && <button className="yt-scrim" aria-label="Đóng menu" onClick={() => setSidebar(false)} />}
      <aside className="yt-sidebar">
        <nav aria-label="Điều hướng chính">
          {navItems.map(({ id, label, icon: Icon }, index) => <div key={id} className={index === 2 ? "yt-nav-divider" : ""}>{index === 2 && <h3>Thư viện của bạn</h3>}<button className={`yt-nav-item ${view === id ? "active" : ""}`} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><Icon size={22} fill={view === id && id === "home" ? "currentColor" : "none"} /><span>{label}</span>{id === "liked" && liked.length > 0 && <small>{liked.length}</small>}</button></div>)}
          <div className="yt-nav-divider"><h3>Khám phá</h3><button className="yt-nav-item" onClick={() => { navigate("home"); setCategory("Trực tiếp"); }}><Radio size={22} /><span>Trực tiếp</span></button><button className="yt-nav-item" onClick={() => { navigate("home"); setCategory("Podcast"); }}><Headphones size={22} /><span>Podcast</span></button></div>
          <div className="yt-nav-divider"><button className="yt-nav-item" onClick={() => setHelp(true)}><CircleHelp size={22} /><span>Hướng dẫn sử dụng</span></button></div>
        </nav>
        <div className="yt-sidebar-note"><Headphones size={26} /><strong>Âm nhạc theo bạn</strong><p>Nghe những điều bạn thích.<br />Tiếp tục trên thiết bị hỗ trợ.</p><button onClick={() => setHelp(true)}>Tìm hiểu nghe nền</button></div>
        <footer className="yt-sidebar-footer">DuongTube · Cá nhân hóa âm nhạc<p>Ứng dụng độc lập, sử dụng nội dung từ YouTube.</p></footer>
      </aside>
      <main className="yt-content" id="youtube-content">
        {offline && <div className="yt-notice" role="status"><WifiOff size={18} />Bạn đang ngoại tuyến. Kết nối mạng để tìm và phát nhạc.</div>}
        {pwa.updateAvailable && <div className="yt-notice" role="status"><RefreshCw size={18} />Có phiên bản mới.<button onClick={() => { player.close(); pwa.update(); }}>Cập nhật ứng dụng</button></div>}
        {(view === "home" || view === "music") && <div className="yt-categories" aria-label="Chủ đề">{categories.map(label => <button key={label} className={category === label && !submitted ? "active" : ""} onClick={() => { setCategory(label); setSubmitted(""); setQuery(""); setExpanded(false); setVideoMode(false); const url = new URL(window.location.href); url.searchParams.delete("q"); window.history.replaceState(null, "", url); }}>{label}</button>)}</div>}
        {expanded && activeVideo && <section className="yt-watch" aria-label="Đang phát">
          <button className="yt-text-button" onClick={() => { setExpanded(false); setVideoMode(false); }}><ChevronLeft size={18} /> Quay lại danh sách</button>
          <div className="yt-watch-columns"><div>
            <div className="yt-stage">
              {videoMode ? <iframe title={activeVideo.title} src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&playsinline=1&controls=1&enablejsapi=1&rel=0${embedOrigin ? `&origin=${encodeURIComponent(embedOrigin)}` : ""}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <><img className="yt-stage-backdrop" src={activeVideo.thumbnail} alt="" /><div className="yt-stage-art"><img src={activeVideo.thumbnail} alt="" /><button className="yt-stage-play" onClick={togglePlayback} aria-label={player.isPlaying ? "Tạm dừng" : "Phát nhạc"}>{player.isLoading ? <LoaderCircle className="yt-spin" /> : player.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button></div><span className="yt-stage-label"><Headphones size={16} />YouTube IFrame chạy ẩn</span></>}
            </div>
            <h1>{activeVideo.title}</h1><div className="yt-watch-meta"><div className="yt-channel"><span className="yt-channel-avatar">{activeVideo.channel[0] || "♪"}</span><strong>{activeVideo.channel}</strong></div><div className="yt-watch-actions"><button className={currentLiked ? "selected" : ""} aria-pressed={currentLiked} onClick={() => toggleLike(activeVideo)}><Heart size={18} fill={currentLiked ? "currentColor" : "none"} />{currentLiked ? "Đã thích" : "Yêu thích"}</button><button className={videoMode ? "yt-background-action" : ""} onClick={() => videoMode ? listen(activeVideo) : enableVideo()}>{videoMode ? <Headphones size={18} /> : <MonitorPlay size={18} />}{videoMode ? "Nghe trong nền" : "Xem bằng YouTube"}</button></div></div>
            <p className="yt-watch-note">{videoMode ? "Video đang phát bằng trình phát nhúng chính thức của YouTube. Chọn Nghe trong nền để thử trình phát IFrame ẩn." : "Chế độ thử nghiệm đang điều khiển YouTube IFrame Player API chạy ẩn và kết nối Media Session. Khả năng tiếp tục khi khóa màn hình phụ thuộc thiết bị."}</p>
          </div><div className="yt-watch-queue"><h2><ListMusic size={20} />Tiếp theo</h2>{(videoMode ? visible : player.queue).filter(v => v.id !== activeVideo.id).slice(0, 8).map(v => <button key={v.id} className="yt-queue-item" onClick={() => videoMode ? watch(v) : listen(v, player.queue)}><img src={v.thumbnail} alt="" /><span><strong>{v.title}</strong><small>{v.channel}</small></span></button>)}</div></div>
        </section>}
        {!expanded && <><div className="yt-section-heading"><div><h1>{heading}</h1>{view === "liked" || view === "history" ? <p>{visible.length} video · Lưu trên thiết bị này</p> : <p>{submitted ? "Khám phá video và nghe theo cách của bạn" : "Khám phá giai điệu cho ngày của bạn"}</p>}</div>{!submitted && view === "home" && <span className="yt-listening-label"><span />Sẵn sàng để nghe</span>}</div>
          {busy ? <div className="yt-grid" aria-label="Đang tải video" aria-busy="true">{Array.from({ length: 9 }, (_, i) => <div className="yt-skeleton" key={i}><div /><span /><span /></div>)}</div> : error ? <div className="yt-empty" role="alert"><WifiOff /><h2>Chưa thể tải video</h2><p>{error}</p><button className="yt-primary" onClick={() => setReload(x => x + 1)}><RefreshCw size={18} />Thử lại</button></div> : !visible.length ? <div className="yt-empty">{view === "liked" ? <Heart /> : view === "history" ? <Clock3 /> : <Search />}<h2>{view === "liked" ? "Những giai điệu bạn muốn giữ lại" : view === "history" ? "Bắt đầu hành trình âm nhạc" : "Không tìm thấy video"}</h2><p>{view === "liked" ? "Nhấn trái tim trên một video để lưu vào thư viện của bạn." : view === "history" ? "Các video bạn nghe sẽ xuất hiện tại đây." : "Thử một từ khóa khác hoặc dán liên kết YouTube."}</p>{(view === "liked" || view === "history") && <button className="yt-primary" onClick={() => navigate("home")}>Khám phá âm nhạc</button>}</div> : <div className="yt-grid">{visible.map(video => <article className={`yt-card ${player.current?.id === video.id ? "yt-card-playing" : ""}`} key={video.id}>
            <button className="yt-thumbnail" onClick={() => watch(video)} aria-label={`Xem ${video.title} bằng YouTube`}><img src={video.thumbnail || "/youtube-assets/icon.svg"} alt="" loading="lazy" /><span className="yt-card-play"><Play fill="currentColor" size={24} /></span>{player.current?.id === video.id ? <span className="yt-duration yt-now"><Headphones size={13} />{player.isPlaying ? "Đang nghe nền" : "Đã chọn"}</span> : !!video.duration && <span className="yt-duration">{time(video.duration)}</span>}</button>
            <div className="yt-card-info"><span className="yt-channel-avatar">{video.channel[0] || "♪"}</span><div><button className="yt-video-title" onClick={() => watch(video)}>{video.title}</button><p>{video.channel}</p>{video.views != null && <p>{views(video.views)}</p>}</div><div className="yt-card-actions"><button className="yt-listen" onClick={() => listen(video)} aria-label={`Nghe ${video.title} trong nền`} title="Nghe trong nền"><Headphones size={18} /></button><button className={`yt-like ${liked.some(v => v.id === video.id) ? "selected" : ""}`} onClick={() => toggleLike(video)} aria-label={`${liked.some(v => v.id === video.id) ? "Bỏ thích" : "Yêu thích"} ${video.title}`} aria-pressed={liked.some(v => v.id === video.id)}><Heart size={18} fill={liked.some(v => v.id === video.id) ? "currentColor" : "none"} /></button></div></div>
          </article>)}</div>}
        </>}
      </main>
      {player.current && <section className="yt-player" aria-label="Trình phát nhạc">
        {player.error && <div className="yt-player-error" role="alert"><span>{player.error}</span><button onClick={() => { setVideoMode(false); player.retry(); }}>Thử lại</button>{player.errorCode === "YOUTUBE_VERIFICATION" && <button onClick={useOfficialPlayer}>Phát bằng YouTube</button>}<a href={`https://www.youtube.com/watch?v=${player.current.id}`} target="_blank" rel="noopener noreferrer">Mở YouTube <ExternalLink size={13} /></a></div>}
        {videoMode && <div className="yt-player-error"><span>Đang xem video · Chuyển sang âm thanh để nghe nền</span><button onClick={() => { setVideoMode(false); player.toggle(); }}>Nghe nhạc</button></div>}
        <input className="yt-progress" type="range" min={0} max={player.duration || 1} step={0.1} value={Math.min(player.position, player.duration || 1)} disabled={!player.duration || videoMode} onChange={e => player.seek(Number(e.target.value))} aria-label="Tua nhạc" style={{ "--progress": `${player.duration ? player.position / player.duration * 100 : 0}%` } as React.CSSProperties} />
        <div className="yt-player-body"><button className="yt-track" onClick={() => { if (expanded) setVideoMode(false); setExpanded(!expanded); }} aria-label="Mở bài đang phát"><img src={player.current.thumbnail} alt="" /><span><strong>{player.current.title}</strong><small>{player.current.channel}</small></span></button>
          <div className="yt-player-controls"><button className="yt-icon-button yt-previous" onClick={() => { setVideoMode(false); player.previous(); }} aria-label="Bài trước"><SkipBack fill="currentColor" size={21} /></button><button className="yt-main-play" onClick={togglePlayback} aria-label={player.isPlaying ? "Tạm dừng" : "Phát nhạc"}>{player.isLoading ? <LoaderCircle className="yt-spin" /> : player.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button><button className="yt-icon-button" onClick={() => { setVideoMode(false); player.next(); }} disabled={player.queue.length < 2} aria-label="Bài tiếp theo"><SkipForward fill="currentColor" size={21} /></button><span className="yt-time">{time(player.position)} <span>/ {time(player.duration)}</span></span></div>
          <div className="yt-player-tools"><button className={`yt-icon-button ${currentLiked ? "selected" : ""}`} onClick={() => player.current && toggleLike(player.current)} aria-label={currentLiked ? "Bỏ thích bài đang phát" : "Thích bài đang phát"}><Heart size={20} fill={currentLiked ? "currentColor" : "none"} /></button><button className={`yt-icon-button ${player.repeat ? "selected" : ""}`} aria-label="Lặp lại bài hát" aria-pressed={player.repeat} onClick={() => player.setRepeat(!player.repeat)}><Repeat2 size={20} /></button><div className="yt-volume"><button className="yt-icon-button" aria-label={player.volume ? "Tắt âm" : "Bật âm"} onClick={() => player.setVolume(player.volume ? 0 : 1)}>{player.volume ? <Volume2 size={21} /> : <VolumeX size={21} />}</button><input type="range" min={0} max={1} step={0.05} value={player.volume} onChange={e => player.setVolume(Number(e.target.value))} aria-label="Âm lượng" /></div><button className={`yt-icon-button ${showQueue ? "selected" : ""}`} aria-label="Danh sách phát" aria-expanded={showQueue} onClick={() => setShowQueue(!showQueue)}><ListMusic size={22} /></button><button className="yt-icon-button yt-close-player" aria-label="Đóng trình phát" onClick={() => { player.close(); setExpanded(false); setShowQueue(false); setVideoMode(false); }}><X size={20} /></button></div>
        </div>
      </section>}
      {showQueue && player.current && <aside className="yt-queue-panel" aria-label="Danh sách phát"><header><h2>Danh sách phát <small>{player.queue.length} video</small></h2><button className="yt-icon-button" aria-label="Đóng danh sách phát" onClick={() => setShowQueue(false)}><X /></button></header><div>{player.queue.map((v, i) => <button key={v.id} className={`yt-queue-item ${v.id === player.current?.id ? "active" : ""}`} onClick={() => { setVideoMode(false); player.play(v, player.queue); }}><small>{i + 1}</small><img src={v.thumbnail} alt="" /><span><strong>{v.title}</strong><small>{v.channel}</small></span></button>)}</div></aside>}
      <nav className="yt-mobile-nav" aria-label="Điều hướng di động">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><Icon size={22} /><span>{label}</span></button>)}</nav>
      <dialog ref={dialogRef} className="yt-help" onClose={() => setHelp(false)} onClick={event => { if (event.target === dialogRef.current) setHelp(false); }}><div className="yt-help-heading"><span className="yt-logo"><Play fill="currentColor" size={20} /></span><h2>DuongTube, luôn bên bạn</h2><button className="yt-icon-button" aria-label="Đóng hướng dẫn" onClick={() => setHelp(false)}><X /></button></div><div className="yt-help-body"><h3><ArrowDownToLine size={21} />Cài đặt ứng dụng</h3><p>Android / máy tính: chọn <b>Cài ứng dụng</b> hoặc mục cài đặt trong menu trình duyệt.</p><p>iPhone / iPad: mở bằng Safari, chọn <b>Chia sẻ → Thêm vào Màn hình chính → Thêm</b>.</p><h3><MonitorPlay size={21} />Xem video</h3><p>Chạm vào ảnh hoặc tên video để phát bằng trình phát nhúng chính thức của YouTube.</p><h3><Headphones size={21} />Thử nghe khi khóa màn hình</h3><p>Chọn nút tai nghe cạnh video hoặc nút <b>Nghe trong nền</b>. DuongTube sẽ điều khiển một YouTube IFrame ẩn và đưa nút phát, tạm dừng, tua, chuyển bài vào Media Session.</p><p>Đây là chế độ thử nghiệm. Trình duyệt hoặc hệ điều hành vẫn có thể dừng iframe khi khóa màn hình.</p><h3><Heart size={21} />Thư viện của riêng bạn</h3><p>Yêu thích và lịch sử được lưu trên thiết bị này. Bạn không cần đăng nhập.</p>{pwa.error && <p role="status">{pwa.error}</p>}{pwa.canInstall && <button className="yt-primary" onClick={pwa.install}><ArrowDownToLine size={18} />Cài DuongTube</button>}</div></dialog>
    </div>
  );
}

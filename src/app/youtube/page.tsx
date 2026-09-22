"use client";

/* eslint-disable @next/next/no-img-element -- Thumbnails are external media artwork. */
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowDownToLine, ChevronLeft, CircleHelp, Clock3, ExternalLink, Headphones, Heart, History, House, ListMusic, LoaderCircle, Menu, Mic, MicOff, MonitorPlay, Music2, Pause, Play, Radio, RefreshCw, Repeat2, Search, SkipBack, SkipForward, Volume2, VolumeX, WifiOff, X } from "lucide-react";
import { useYouTubePlayer } from "@/components/youtube/use-youtube-player";
import type { Video } from "@/components/youtube/types";
import { usePwa } from "@/components/youtube/use-pwa";
import { useVoiceSearch } from "@/components/youtube/use-voice-search";
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
function shuffled<T>(values: T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export default function DuongTube() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [items, setItems] = useState<Video[]>([]);
  const [liked, setLiked] = useState<Video[]>([]);
  const [history, setHistory] = useState<Video[]>([]);
  const [recommendationSeed, setRecommendationSeed] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [sidebar, setSidebar] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [help, setHelp] = useState(false);
  const [offline, setOffline] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resumeAfterVoiceRef = useRef(false);
  const pwa = usePwa();
  const submitSearch = useCallback((rawQuery: string) => {
    const nextQuery = rawQuery.trim();
    setQuery(nextQuery);
    setSubmitted(nextQuery); setView("home"); setCategory("Tất cả"); setExpanded(false);
    if (nextQuery) {
      let searches: string[] = [];
      try {
        searches = JSON.parse(localStorage.getItem("duongtube-searches") || "[]");
        const nextSearches = [nextQuery, ...searches.filter(value => value !== nextQuery)].slice(0, 12);
        localStorage.setItem("duongtube-searches", JSON.stringify(nextSearches));
      } catch { /* Storage may be unavailable in private mode. */ }
      setRecommendationSeed(nextQuery);
    }
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set("q", nextQuery); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
    searchRef.current?.blur();
  }, []);
  const onStarted = useCallback((video: Video) => {
    setRecommendationSeed(video.channel);
    setHistory(previous => {
      const next = [video, ...previous.filter(v => v.id !== video.id)].slice(0, 100);
      saveLibrary("duongtube-history", next);
      return next;
    });
  }, []);
  const player = useYouTubePlayer({ onStarted });
  const pauseForVoiceSearch = useCallback(() => {
    resumeAfterVoiceRef.current = player.isPlaying;
    if (player.isPlaying) player.pause();
  }, [player.isPlaying, player.pause]);
  const restoreAfterVoiceSearch = useCallback(() => {
    player.restoreAfterVoiceSearch(resumeAfterVoiceRef.current);
    resumeAfterVoiceRef.current = false;
  }, [player.restoreAfterVoiceSearch]);
  const voice = useVoiceSearch(submitSearch, {
    onCaptureStart: pauseForVoiceSearch,
    onCaptureEnd: restoreAfterVoiceSearch,
  });
  const microphoneSaved = voice.permission === "granted" || voice.permission === "remembered";

  useEffect(() => {
    const storedHistory = readLibrary("duongtube-history");
    setLiked(readLibrary("duongtube-liked"));
    setHistory(storedHistory);
    let searches: string[] = [];
    try { searches = JSON.parse(localStorage.getItem("duongtube-searches") || "[]"); } catch { /* Ignore invalid local preferences. */ }
    setRecommendationSeed(searches[0] || storedHistory[0]?.channel || "");
    const q = new URL(window.location.href).searchParams.get("q") || "";
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
    const urls = [`/api/youtube/search${term ? `?q=${encodeURIComponent(term)}` : ""}`];
    if (!term && recommendationSeed) urls.push(`/api/youtube/search?q=${encodeURIComponent(recommendationSeed)}`);
    Promise.all(urls.map(async url => {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.loi || "Không thể tải video lúc này.");
      return (data.items || []) as Video[];
    }))
      .then(responseGroups => {
        const groups = submitted ? responseGroups : responseGroups.map(shuffled);
        const mixed: Video[] = [];
        const seen = new Set<string>();
        const channelCounts = new Map<string, number>();
        const longest = Math.max(...groups.map(group => group.length));
        for (let index = 0; index < longest; index++) for (const group of groups) {
          const video = group[index];
          if (!video || seen.has(video.id)) continue;
          const channelKey = video.channel.trim().toLocaleLowerCase("vi");
          const channelCount = channelCounts.get(channelKey) || 0;
          if (channelCount >= 2) continue;
          seen.add(video.id);
          channelCounts.set(channelKey, channelCount + 1);
          mixed.push(video);
        }
        setItems(mixed.slice(0, 36));
      })
      .catch(error => { if (!controller.signal.aborted) { setItems([]); setLoadError(error instanceof Error ? error.message : "Không thể kết nối. Vui lòng thử lại."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [submitted, category, view, reload, recommendationSeed]);

  useEffect(() => {
    if (help) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [help]);

  function navigate(next: View) {
    setView(next); setSidebar(false); setExpanded(false);
    setSubmitted(""); setQuery(""); setCategory(next === "music" ? "Âm nhạc" : "Tất cả");
    const url = new URL(window.location.href); url.searchParams.delete("q"); window.history.replaceState(null, "", url);
  }
  function search(event: FormEvent) {
    event.preventDefault();
    submitSearch(query);
  }
  function toggleLike(video: Video) {
    setLiked(previous => {
      const next = previous.some(v => v.id === video.id) ? previous.filter(v => v.id !== video.id) : [video, ...previous].slice(0, 100);
      saveLibrary("duongtube-liked", next); return next;
    });
  }
  const visible = view === "liked" ? liked : view === "history" ? history : items;
  useEffect(() => {
    if (visible[0]) player.prepare(visible[0]);
  }, [player.prepare, visible]);
  const loadingVideos = loading && view !== "liked" && view !== "history";
  const preparingPlayer = visible.length > 0 && !player.isReady && !player.error;
  const busy = loadingVideos || preparingPlayer;
  const error = view === "liked" || view === "history" ? "" : loadError;
  const activeVideo = player.current || selectedVideo;
  const playerMode = activeVideo ? (expanded ? "yt-video-expanded" : "yt-video-mini") : player.isReady ? "yt-video-idle" : "yt-video-preparing";
  const currentLiked = !!activeVideo && liked.some(v => v.id === activeVideo.id);
  const relatedVideos = activeVideo ? player.queue.filter(video => video.id !== activeVideo.id).slice(0, 18) : [];
  function watch(video: Video, videos: Video[] = visible) {
    flushSync(() => {
      setSelectedVideo(video);
      setShowQueue(false);
      setExpanded(true);
    });
    player.play(video, videos);
  }
  function closePlayer() {
    player.close(); setSelectedVideo(null); setExpanded(false); setShowQueue(false);
  }
  const heading = view === "liked" ? "Video bạn yêu thích" : view === "history" ? "Video đã xem" : submitted ? `Kết quả cho “${submitted}”` : "Dành cho bạn";

  return (
    <div className={`yt-app ${sidebar ? "yt-sidebar-open" : ""} ${player.current ? "yt-has-player" : ""}`}>
      <a className="yt-skip" href="#youtube-content">Đi đến nội dung</a>
      <header className="yt-header">
        <div className="yt-brand-group">
          <button className="yt-icon-button yt-menu" aria-label="Mở menu" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Menu /></button>
          <button className="yt-brand" onClick={() => navigate("home")} aria-label="DuongTube — Trang chủ"><span className="yt-logo"><Play size={20} fill="currentColor" strokeWidth={0} /></span><span>DuongTube</span><sup>VN</sup></button>
        </div>
        <form className={`yt-search ${voice.supported ? "yt-has-voice" : ""}`} onSubmit={search} role="search">
          <input ref={searchRef} aria-label="Tìm kiếm YouTube" placeholder="Tìm kiếm hoặc dán liên kết YouTube" value={query} onChange={e => setQuery(e.target.value)} maxLength={500} />
          {query && <button type="button" className="yt-clear-search" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={19} /></button>}
          {voice.supported && <button type="button" className={`yt-voice-search ${voice.listening ? "listening" : ""} ${microphoneSaved ? "permission-saved" : ""}`} aria-label={voice.listening ? "Dừng nghe" : microphoneSaved ? "Tìm kiếm bằng giọng nói, quyền micro đã lưu" : "Tìm kiếm bằng giọng nói"} aria-pressed={voice.listening} title={voice.listening ? "Dừng nghe" : microphoneSaved ? "Tìm kiếm bằng giọng nói · quyền micro đã lưu" : "Tìm kiếm bằng giọng nói"} onClick={voice.toggle}>{voice.listening ? <MicOff size={21} /> : <Mic size={21} />}</button>}
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
        <div className="yt-sidebar-note"><MonitorPlay size={26} /><strong>Xem không gián đoạn</strong><p>Video tiếp tục chạy khi bạn tìm kiếm nội dung khác.</p><button onClick={() => setHelp(true)}>Tìm hiểu trình phát</button></div>
        <footer className="yt-sidebar-footer">DuongTube · Cá nhân hóa âm nhạc<p>Ứng dụng độc lập, sử dụng nội dung từ YouTube.</p></footer>
      </aside>
      <main className="yt-content" id="youtube-content">
        {offline && <div className="yt-notice" role="status"><WifiOff size={18} />Bạn đang ngoại tuyến. Kết nối mạng để tìm và phát nhạc.</div>}
        {voice.error && <div className="yt-notice" role="alert"><MicOff size={18} />{voice.error}<button onClick={voice.clearError}>Đóng</button></div>}
        {pwa.updateAvailable && <div className="yt-notice" role="status"><RefreshCw size={18} />Có phiên bản mới.<button onClick={() => { player.close(); pwa.update(); }}>Cập nhật ứng dụng</button></div>}
        <section className={`yt-watch yt-video-session ${playerMode}`} aria-label={activeVideo ? `Đang phát ${activeVideo.title}` : "Trình phát YouTube"} aria-hidden={!activeVideo && player.isReady}>
          {activeVideo && expanded && <button className="yt-text-button" onClick={() => setExpanded(false)}><ChevronLeft size={18} /> Quay lại danh sách</button>}
          <div className="yt-watch-columns"><div>
            <div className="yt-stage">
              <div className="yt-player-host"><div ref={player.hostRef} /></div>
              {activeVideo && !expanded && <div className="yt-pip-actions"><button onClick={() => setExpanded(true)} aria-label="Mở rộng video"><MonitorPlay size={17} /></button><button onClick={closePlayer} aria-label="Đóng video"><X size={17} /></button></div>}
            </div>
            {activeVideo && expanded && <><h1>{activeVideo.title}</h1><div className="yt-watch-meta"><div className="yt-channel"><span className="yt-channel-avatar">{activeVideo.channel[0] || "♪"}</span><strong>{activeVideo.channel}</strong></div><div className="yt-watch-actions"><button className={currentLiked ? "selected" : ""} aria-pressed={currentLiked} onClick={() => toggleLike(activeVideo)}><Heart size={18} fill={currentLiked ? "currentColor" : "none"} />{currentLiked ? "Đã thích" : "Yêu thích"}</button></div></div><p className="yt-watch-note">Video đang phát bằng trình phát nhúng chính thức của YouTube. Khi bạn quay lại danh sách hoặc tìm kiếm, video sẽ thu nhỏ và tiếp tục từ đúng vị trí hiện tại.</p></>}
          </div>{activeVideo && expanded && <div className="yt-watch-queue"><h2><ListMusic size={20} />Tiếp theo</h2>{player.queue.filter(v => v.id !== activeVideo.id).slice(0, 8).map(v => <button key={v.id} className="yt-queue-item" onClick={() => watch(v, player.queue)}><img src={v.thumbnail} alt="" /><span><strong>{v.title}</strong><small>{v.channel}</small></span></button>)}</div>}</div>
        </section>
        {expanded && activeVideo && relatedVideos.length > 0 && <section className="yt-related" aria-label="Video gợi ý">
          <div className="yt-section-heading"><div><h2>Video gợi ý</h2><p>Cuộn xuống để tiếp tục khám phá</p></div></div>
          <div className="yt-grid">{relatedVideos.map(video => <article className="yt-card" key={video.id}>
            <button className="yt-thumbnail" onClick={() => watch(video, player.queue)} aria-label={`Phát ${video.title}`}><img src={video.thumbnail || "/youtube-assets/icon.svg"} alt="" loading="lazy" /><span className="yt-card-play"><Play fill="currentColor" size={24} /></span>{!!video.duration && <span className="yt-duration">{time(video.duration)}</span>}</button>
            <div className="yt-card-info"><span className="yt-channel-avatar">{video.channel[0] || "♪"}</span><div><button className="yt-video-title" onClick={() => watch(video, player.queue)}>{video.title}</button><p>{video.channel}</p>{video.views != null && <p>{views(video.views)}</p>}</div><div className="yt-card-actions"><button className={`yt-like ${liked.some(v => v.id === video.id) ? "selected" : ""}`} onClick={() => toggleLike(video)} aria-label={`${liked.some(v => v.id === video.id) ? "Bỏ thích" : "Yêu thích"} ${video.title}`} aria-pressed={liked.some(v => v.id === video.id)}><Heart size={18} fill={liked.some(v => v.id === video.id) ? "currentColor" : "none"} /></button></div></div>
          </article>)}</div>
        </section>}
        {!expanded && (view === "home" || view === "music") && <div className="yt-categories" aria-label="Chủ đề">{categories.map(label => <button key={label} className={category === label && !submitted ? "active" : ""} onClick={() => { setCategory(label); setSubmitted(""); setQuery(""); setExpanded(false); setReload(value => value + 1); const url = new URL(window.location.href); url.searchParams.delete("q"); window.history.replaceState(null, "", url); }}>{label}</button>)}</div>}
        {!expanded && <><div className="yt-section-heading"><div><h1>{heading}</h1>{view === "liked" || view === "history" ? <p>{visible.length} video · Lưu trên thiết bị này</p> : <p>{submitted ? "Khám phá video theo cách của bạn" : "Video mới và thịnh hành dành cho bạn"}</p>}</div>{!submitted && view === "home" && <span className="yt-listening-label"><span />Sẵn sàng để xem</span>}</div>
          {busy ? <div className="yt-grid" aria-label="Đang tải video" aria-busy="true">{Array.from({ length: 9 }, (_, i) => <div className="yt-skeleton" key={i}><div /><span /><span /></div>)}</div> : error ? <div className="yt-empty" role="alert"><WifiOff /><h2>Chưa thể tải video</h2><p>{error}</p><button className="yt-primary" onClick={() => setReload(x => x + 1)}><RefreshCw size={18} />Thử lại</button></div> : !visible.length ? <div className="yt-empty">{view === "liked" ? <Heart /> : view === "history" ? <Clock3 /> : <Search />}<h2>{view === "liked" ? "Những giai điệu bạn muốn giữ lại" : view === "history" ? "Bắt đầu hành trình âm nhạc" : "Không tìm thấy video"}</h2><p>{view === "liked" ? "Nhấn trái tim trên một video để lưu vào thư viện của bạn." : view === "history" ? "Các video bạn nghe sẽ xuất hiện tại đây." : "Thử một từ khóa khác hoặc dán liên kết YouTube."}</p>{(view === "liked" || view === "history") && <button className="yt-primary" onClick={() => navigate("home")}>Khám phá âm nhạc</button>}</div> : <div className="yt-grid">{visible.map(video => <article className={`yt-card ${player.current?.id === video.id ? "yt-card-playing" : ""}`} key={video.id}>
            <button className="yt-thumbnail" onClick={() => watch(video)} aria-label={`Phát ${video.title}`}><img src={video.thumbnail || "/youtube-assets/icon.svg"} alt="" loading="lazy" /><span className="yt-card-play"><Play fill="currentColor" size={24} /></span>{player.current?.id === video.id ? <span className="yt-duration yt-now"><Play size={13} fill="currentColor" />{player.isPlaying ? "Đang phát" : "Tạm dừng"}</span> : !!video.duration && <span className="yt-duration">{time(video.duration)}</span>}</button>
            <div className="yt-card-info"><span className="yt-channel-avatar">{video.channel[0] || "♪"}</span><div><button className="yt-video-title" onClick={() => watch(video)}>{video.title}</button><p>{video.channel}</p>{video.views != null && <p>{views(video.views)}</p>}</div><div className="yt-card-actions"><button className={`yt-like ${liked.some(v => v.id === video.id) ? "selected" : ""}`} onClick={() => toggleLike(video)} aria-label={`${liked.some(v => v.id === video.id) ? "Bỏ thích" : "Yêu thích"} ${video.title}`} aria-pressed={liked.some(v => v.id === video.id)}><Heart size={18} fill={liked.some(v => v.id === video.id) ? "currentColor" : "none"} /></button></div></div>
          </article>)}</div>}
        </>}
      </main>
      {player.current && <section className="yt-player" aria-label="Trình phát video">
        {player.error && <div className="yt-player-error" role="alert"><span>{player.error}</span><button onClick={player.retry}>Thử lại</button><a href={`https://www.youtube.com/watch?v=${player.current.id}`} target="_blank" rel="noopener noreferrer">Mở YouTube <ExternalLink size={13} /></a></div>}
        <input className="yt-progress" type="range" min={0} max={player.duration || 1} step={0.1} value={Math.min(player.position, player.duration || 1)} disabled={!player.duration} onChange={e => player.seek(Number(e.target.value))} aria-label="Tua video" style={{ "--progress": `${player.duration ? player.position / player.duration * 100 : 0}%` } as React.CSSProperties} />
        <div className="yt-player-body"><button className="yt-track" onClick={() => setExpanded(!expanded)} aria-label="Mở video đang phát"><img src={player.current.thumbnail} alt="" /><span><strong>{player.current.title}</strong><small>{player.current.channel}</small></span></button>
          <div className="yt-player-controls"><button className="yt-icon-button yt-previous" onClick={player.previous} aria-label="Video trước"><SkipBack fill="currentColor" size={21} /></button><button className="yt-main-play" onClick={player.toggle} aria-label={player.isPlaying ? "Tạm dừng" : "Phát video"}>{player.isLoading ? <LoaderCircle className="yt-spin" /> : player.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button><button className="yt-icon-button" onClick={player.next} disabled={player.queue.length < 2} aria-label="Video tiếp theo"><SkipForward fill="currentColor" size={21} /></button><span className="yt-time">{time(player.position)} <span>/ {time(player.duration)}</span></span></div>
          <div className="yt-player-tools"><button className={`yt-icon-button ${currentLiked ? "selected" : ""}`} onClick={() => player.current && toggleLike(player.current)} aria-label={currentLiked ? "Bỏ thích video đang phát" : "Thích video đang phát"}><Heart size={20} fill={currentLiked ? "currentColor" : "none"} /></button><button className={`yt-icon-button ${player.repeat ? "selected" : ""}`} aria-label="Lặp lại video" aria-pressed={player.repeat} onClick={() => player.setRepeat(!player.repeat)}><Repeat2 size={20} /></button><div className="yt-volume"><button className="yt-icon-button" aria-label={player.volume ? "Tắt âm" : "Bật âm"} onClick={() => player.setVolume(player.volume ? 0 : 1)}>{player.volume ? <Volume2 size={21} /> : <VolumeX size={21} />}</button><input type="range" min={0} max={1} step={0.05} value={player.volume} onChange={e => player.setVolume(Number(e.target.value))} aria-label="Âm lượng" /></div><button className={`yt-icon-button ${showQueue ? "selected" : ""}`} aria-label="Danh sách phát" aria-expanded={showQueue} onClick={() => setShowQueue(!showQueue)}><ListMusic size={22} /></button><button className="yt-icon-button yt-close-player" aria-label="Đóng trình phát" onClick={closePlayer}><X size={20} /></button></div>
        </div>
      </section>}
      {showQueue && player.current && <aside className="yt-queue-panel" aria-label="Danh sách phát"><header><h2>Danh sách phát <small>{player.queue.length} video</small></h2><button className="yt-icon-button" aria-label="Đóng danh sách phát" onClick={() => setShowQueue(false)}><X /></button></header><div>{player.queue.map((v, i) => <button key={v.id} className={`yt-queue-item ${v.id === player.current?.id ? "active" : ""}`} onClick={() => watch(v, player.queue)}><small>{i + 1}</small><img src={v.thumbnail} alt="" /><span><strong>{v.title}</strong><small>{v.channel}</small></span></button>)}</div></aside>}
      <nav className="yt-mobile-nav" aria-label="Điều hướng di động">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><Icon size={22} /><span>{label}</span></button>)}</nav>
      <dialog ref={dialogRef} className="yt-help" onClose={() => setHelp(false)} onClick={event => { if (event.target === dialogRef.current) setHelp(false); }}><div className="yt-help-heading"><span className="yt-logo"><Play fill="currentColor" size={20} /></span><h2>DuongTube, luôn bên bạn</h2><button className="yt-icon-button" aria-label="Đóng hướng dẫn" onClick={() => setHelp(false)}><X /></button></div><div className="yt-help-body"><h3><ArrowDownToLine size={21} />Cài đặt ứng dụng</h3><p>Android / máy tính: chọn <b>Cài ứng dụng</b> hoặc mục cài đặt trong menu trình duyệt.</p><p>iPhone / iPad: mở bằng Safari, chọn <b>Chia sẻ → Thêm vào Màn hình chính → Thêm</b>.</p><h3><Mic size={21} />Tìm kiếm bằng giọng nói</h3><p>Chạm nút micro rồi nói tên bài hát hoặc video. Nếu đang phát video, DuongTube sẽ tạm dừng trong lúc nghe và tự phát tiếp ở đúng vị trí sau khi micro đóng.</p>{voice.permission === "denied" ? <p role="status">Quyền micro đang bị chặn. Hãy mở cài đặt của DuongTube trên iPhone và đặt Micro thành <b>Cho phép</b>.</p> : voice.permission === "granted" || voice.permission === "remembered" ? <p role="status">DuongTube đã lưu lựa chọn dùng micro. iOS sẽ dùng lại quyền này khi quyền vẫn còn hiệu lực.</p> : <p>Lần đầu sử dụng, hãy chọn <b>Cho phép</b> để iOS có thể ghi nhớ quyền micro cho DuongTube.</p>}<h3><MonitorPlay size={21} />Trình phát video</h3><p>Chạm vào ảnh hoặc tên video để phát ngay bằng trình phát nhúng chính thức của YouTube.</p><p>Khi quay lại danh sách hoặc tìm kiếm video khác, trình phát hiện tại thu nhỏ ở góc và tiếp tục từ đúng vị trí. Chạm nút mở rộng trên video để quay lại màn hình xem.</p><h3><Heart size={21} />Thư viện của riêng bạn</h3><p>Yêu thích và lịch sử được lưu trên thiết bị này. Bạn không cần đăng nhập.</p>{pwa.error && <p role="status">{pwa.error}</p>}{pwa.canInstall && <button className="yt-primary" onClick={pwa.install}><ArrowDownToLine size={18} />Cài DuongTube</button>}</div></dialog>
    </div>
  );
}

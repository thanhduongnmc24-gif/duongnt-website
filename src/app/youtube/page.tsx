"use client";
import { FormEvent, useEffect, useState, useRef } from "react";

type Video = { id:string; title:string; channel:string; thumbnail:string };

export default function DuongTube() {
  const [q, setQ] = useState(""); 
  const [items, setItems] = useState<Video[]>([]); 
  const [video, setVideo] = useState<Video|null>(null); 
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [loading, setLoading] = useState(false); 
  const [msg, setMsg] = useState("Tìm video để bắt đầu xem.");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(()=>{ 
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/youtube-sw.js").catch(console.error); 
  },[]);

  useEffect(() => {
    if(video && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: video.channel,
        artwork: [{ src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
    }
  }, [video]);

  async function playVideo(v: Video) {
    setVideo(v);
    setStreamUrl("");
    setMsg("Đang bóc luồng âm thanh, anh hai đợi chút...");
    try {
      const res = await fetch(`/api/youtube/stream?id=${v.id}`);
      const data = await res.json();
      if(!res.ok) throw new Error(data.loi || "Không thể lấy link stream");
      setStreamUrl(data.url);
      setMsg("");
    } catch (err: any) {
      setMsg(err.message);
    }
  }

  async function search(e:FormEvent){
    e.preventDefault();
    if(!q.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`/api/youtube/search?q=${encodeURIComponent(q.trim())}`);
      const k = await r.json();
      if(!r.ok) throw new Error(k.loi || "Không thể tìm kiếm");
      setItems(k.items || []);
      if(!k.items?.length) setMsg("Không tìm thấy video.");
    } catch(error) {
      setMsg(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <b className="text-xl text-red-500">DuongTube</b>
          <form onSubmit={search} className="flex min-w-0 flex-1">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm kiếm YouTube..." className="h-11 min-w-0 flex-1 rounded-l-full border border-slate-600 bg-slate-900 px-5 outline-none focus:border-blue-500"/>
            <button disabled={loading} className="rounded-r-full bg-slate-700 px-5 font-bold disabled:opacity-50">{loading ? "..." : "Tìm"}</button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900 relative">
            {video ? (
              <>
                <img src={video.thumbnail} alt="thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-md" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <img src={video.thumbnail} alt="cover" className="h-32 w-32 rounded-2xl object-cover shadow-2xl mb-6 border-2 border-slate-700" />
                  {streamUrl ? (
                    <audio ref={audioRef} controls autoPlay src={streamUrl} playsInline className="w-full max-w-md" />
                  ) : (
                    <div className="text-white animate-pulse font-medium">{msg || "Đang kết nối..."}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">Chọn video từ kết quả tìm kiếm</div>
            )}
          </div>
          {video ? <div className="py-4"><h1 className="text-xl font-black">{video.title}</h1><p className="text-slate-400">{video.channel}</p></div> : null}
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
            Trình phát Audio thuần. Anh hai cứ thoải mái tắt màn hình, chuyển tab hoặc khóa máy vô tư nhé!
          </p>
        </section>
        <aside className="space-y-2">
          {msg && !video ? <p className="rounded-xl bg-slate-900 p-4 text-slate-300">{msg}</p> : null}
          {items.map(v => (
            <button key={v.id} onClick={()=>playVideo(v)} className="grid w-full grid-cols-[150px_1fr] gap-3 rounded-xl p-2 text-left hover:bg-white/10 transition-colors">
              <img src={v.thumbnail} alt="" className="aspect-video rounded-lg object-cover"/>
              <span><strong className="line-clamp-2 text-sm">{v.title}</strong><small className="mt-2 block text-slate-400">{v.channel}</small></span>
            </button>
          ))}
        </aside>
      </div>
    </main>
  );
}
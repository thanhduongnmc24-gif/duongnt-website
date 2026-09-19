import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function full(relative) { return path.join(root, relative); }
function backup(relative) {
  const file = full(relative);
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-${stamp}`);
}
function write(relative, content) {
  const file = full(relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  backup(relative);
  fs.writeFileSync(file, content, "utf8");
  console.log(`Da tao/cap nhat: ${relative}`);
}
function read(relative) { return fs.readFileSync(full(relative), "utf8"); }
function exists(relative) { return fs.existsSync(full(relative)); }

if (!exists("src/app/layout.tsx")) {
  console.error("Khong tim thay src/app/layout.tsx");
  process.exit(1);
}

const routingCandidates = ["src/middleware.ts", "middleware.ts", "src/proxy.ts", "proxy.ts"];
const existingRouting = routingCandidates.find(exists);
if (existingRouting) {
  const routingSource = read(existingRouting);
  const isOurOldInstaller = routingSource.includes("youtube.duongnt.io.vn") || routingSource.includes("isYouTubeSubdomain");
  if (!isOurOldInstaller) {
    console.error(`Phat hien ${existingRouting} co logic rieng. Dung de tranh ghi de.`);
    console.error("Hay gui noi dung file nay cho Ti de ghep an toan.");
    process.exit(1);
  }
  backup(existingRouting);
  fs.rmSync(full(existingRouting));
  console.log(`Da thay the dinh tuyen cu: ${existingRouting}`);
}

write("src/middleware.ts", `import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const laYoutube =
    host === "youtube.duongnt.io.vn" ||
    host === "youtube.localhost" ||
    host.startsWith("youtube.localhost.");

  if (!laYoutube) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-duongtube-app", "1");

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/youtube/") ||
    pathname.startsWith("/youtube-assets/") ||
    pathname === "/youtube-manifest.webmanifest" ||
    pathname === "/youtube-sw.js"
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname.startsWith("/youtube")
    ? pathname
    : pathname === "/"
      ? "/youtube"
      : \`/youtube\${pathname}\`;

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
};
`);

let layout = read("src/app/layout.tsx");
backup("src/app/layout.tsx");

if (!layout.includes('from "next/headers"')) {
  layout = `import { headers } from "next/headers";\n${layout}`;
}
if (!layout.includes("const laDuongTube")) {
  layout = layout.replace(
    /const theme = await layThemeWebsite\(\);/,
    `const theme = await layThemeWebsite();\n  const headerStore = await headers();\n  const laDuongTube = headerStore.get("x-duongtube-app") === "1";`
  );
}
layout = layout.replace(/<ThemeCss\s*\/>/g, `{!laDuongTube ? <ThemeCss /> : null}`);
layout = layout.replace(/<ThanhDieuHuong\s*\/>/g, `{!laDuongTube ? <ThanhDieuHuong /> : null}`);
layout = layout.replace(/<ChanTrang\s*\/>/g, `{!laDuongTube ? <ChanTrang /> : null}`);
layout = layout.replace(/<NutLenDau\s*\/>/g, `{!laDuongTube ? <NutLenDau /> : null}`);
layout = layout.replace(
  /<body className=\{`\$\{inter\.className\} min-h-screen bg-slate-100 text-slate-900`\}>/,
  '<body className={`${inter.className} min-h-screen ${laDuongTube ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>'
);

if (!layout.includes("const laDuongTube") || !layout.includes("x-duongtube-app")) {
  console.error("Khong the chen logic tach giao dien vao layout.tsx.");
  fs.copyFileSync(full(`src/app/layout.tsx.bak-${stamp}`), full("src/app/layout.tsx"));
  process.exit(1);
}
fs.writeFileSync(full("src/app/layout.tsx"), layout, "utf8");
console.log("Da tach menu, footer va theme khoi subdomain YouTube.");

write("src/app/youtube/layout.tsx", `import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "DuongTube",
  description: "PWA xem YouTube bằng trình phát chính thức.",
  manifest: "/youtube-manifest.webmanifest",
  appleWebApp: { capable: true, title: "DuongTube", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#020617" };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
`);

write("src/app/youtube/page.tsx", `"use client";
import { FormEvent, useEffect, useState, useRef } from "react";
type Video = { id:string; title:string; channel:string; thumbnail:string };

export default function DuongTube() {
  const [q,setQ]=useState(""); const [items,setItems]=useState<Video[]>([]); const [video,setVideo]=useState<Video|null>(null); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState("Tìm video để bắt đầu xem.");
  const audioCtxRef = useRef<any>(null);

  useEffect(()=>{ if("serviceWorker" in navigator) navigator.serviceWorker.register("/youtube-sw.js").catch(console.error); },[]);

  useEffect(() => {
    if(video && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: video.channel,
        artwork: [{ src: video.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
    }
  }, [video]);

  const startSilentAudio = () => {
    if(!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if(AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0; // Im lặng
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        audioCtxRef.current = ctx;
      }
    }
  };

  async function search(e:FormEvent){
    e.preventDefault();if(!q.trim())return;setLoading(true);setMsg("");
    try{
      const r=await fetch(\`/api/youtube/search?q=\\$\\{encodeURIComponent(q.trim())\\}\`);
      const k=await r.json();
      if(!r.ok)throw new Error(k.loi||"Không thể tìm kiếm");
      setItems(k.items||[]);
      if(!k.items?.length)setMsg("Không tìm thấy video.")
    }catch(error){
      setMsg(error instanceof Error?error.message:"Có lỗi xảy ra")
    }finally{
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <b className="text-xl text-red-500">DuongTube</b>
          <form onSubmit={search} className="flex min-w-0 flex-1">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm kiếm YouTube..." className="h-11 min-w-0 flex-1 rounded-l-full border border-slate-600 bg-slate-900 px-5 outline-none focus:border-blue-500"/>
            <button disabled={loading} className="rounded-r-full bg-slate-700 px-5 font-bold disabled:opacity-50">{loading?"...":"Tìm"}</button>
          </form>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            {video?
              <iframe key={video.id} src={\`https://www.youtube.com/embed/\\$\\{video.id\\}?autoplay=1&playsinline=1&enablejsapi=1&origin=\\$\\{encodeURIComponent(location.origin)\\}\`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" onLoad={startSilentAudio} />
              :<div className="flex h-full items-center justify-center text-slate-400">Chọn video từ kết quả tìm kiếm</div>
            }
          </div>
          {video?<div className="py-4"><h1 className="text-xl font-black">{video.title}</h1><p className="text-slate-400">{video.channel}</p></div>:null}
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
            [Hack Background: KÍCH HOẠT] Tèo đã cài Media Session & Silent Audio. Anh hai thử phát video rồi khóa màn hình nhé!
          </p>
        </section>
        <aside className="space-y-2">
          {msg?<p className="rounded-xl bg-slate-900 p-4 text-slate-300">{msg}</p>:null}
          {items.map(v=><button key={v.id} onClick={()=>{setVideo(v); startSilentAudio();}} className="grid w-full grid-cols-[150px_1fr] gap-3 rounded-xl p-2 text-left hover:bg-white/10">
            <img src={v.thumbnail} alt="" className="aspect-video rounded-lg object-cover"/>
            <span><strong className="line-clamp-2 text-sm">{v.title}</strong><small className="mt-2 block text-slate-400">{v.channel}</small></span>
          </button>)}
        </aside>
      </div>
    </main>
  );
}
`);

write("src/app/api/youtube/search/route.ts", `import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request:Request){const q=new URL(request.url).searchParams.get("q")?.trim();const key=process.env.YOUTUBE_API_KEY;if(!q)return NextResponse.json({loi:"Thiếu từ khóa"},{status:400});if(!key)return NextResponse.json({loi:"Chưa cấu hình YOUTUBE_API_KEY"},{status:503});const p=new URLSearchParams({part:"snippet",type:"video",maxResults:"20",q,key,safeSearch:"moderate",relevanceLanguage:"vi"});const r=await fetch(\`https://www.googleapis.com/youtube/v3/search?\${p}\`,{next:{revalidate:300}});const k=await r.json();if(!r.ok)return NextResponse.json({loi:k.error?.message||"YouTube API từ chối yêu cầu"},{status:r.status});return NextResponse.json({items:(k.items||[]).map((x:any)=>({id:x.id.videoId,title:x.snippet.title,channel:x.snippet.channelTitle,thumbnail:x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url||""}))});}
`);

write("src/app/youtube-manifest.webmanifest/route.ts", `import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({name:"DuongTube",short_name:"DuongTube",start_url:"/",scope:"/",display:"standalone",background_color:"#020617",theme_color:"#020617",icons:[{src:"/youtube-assets/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]},{headers:{"Content-Type":"application/manifest+json"}})}
`);
write("src/app/youtube-sw.js/route.ts", `export function GET(){const code='const C="duongtube-v2";self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["/"])))});self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))})';return new Response(code,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache"}})}
`);
write("public/youtube-assets/icon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#020617"/><rect x="68" y="150" width="376" height="212" rx="64" fill="#ef4444"/><path d="M220 200v112l108-56z" fill="#fff"/></svg>`);

const envExample = full(".env.example");
if (!exists(".env.example")) fs.writeFileSync(envExample, "YOUTUBE_API_KEY=\n");
else if (!read(".env.example").includes("YOUTUBE_API_KEY=")) fs.appendFileSync(envExample, "\nYOUTUBE_API_KEY=\n");

console.log("\nHOAN THANH DuongTube PWA V2 - KICH HOAT HACK BACKGROUND AUDIO");
console.log("1. Them YOUTUBE_API_KEY vao .env.local va Render Environment.");
console.log("2. Local: mo http://youtube.localhost:3000");
console.log("3. Render: them youtube.duongnt.io.vn vao Custom Domains.");
console.log("4. Tino DNS: CNAME youtube -> ten-dich-vu.onrender.com");
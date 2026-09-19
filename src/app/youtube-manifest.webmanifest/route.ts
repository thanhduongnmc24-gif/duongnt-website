import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({name:"DuongTube",short_name:"DuongTube",start_url:"/",scope:"/",display:"standalone",background_color:"#020617",theme_color:"#020617",icons:[{src:"/youtube-assets/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any maskable"}]},{headers:{"Content-Type":"application/manifest+json"}})}

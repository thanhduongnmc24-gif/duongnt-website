import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{const url=process.env.NEXT_PUBLIC_DIA_CHI_WEBSITE||"http://localhost:3000";return{rules:{userAgent:"*",allow:"/",disallow:["/quan-tri/","/api/"]},sitemap:`${url}/sitemap.xml`}}

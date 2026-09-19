import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "DuongTube",
  description: "PWA xem YouTube bằng trình phát chính thức.",
  manifest: "/youtube-manifest.webmanifest",
  appleWebApp: { capable: true, title: "DuongTube", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#020617" };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }

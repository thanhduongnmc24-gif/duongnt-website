import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "DuongTube" },
  description: "Khám phá video, tạo hàng đợi và nghe nhạc cùng DuongTube.",
  manifest: "/youtube-manifest.webmanifest",
  appleWebApp: { capable: true, title: "DuongTube", statusBarStyle: "black-translucent" },
  applicationName: "DuongTube",
  icons: {
    icon: [
      { url: "/youtube-assets/icon.svg", type: "image/svg+xml" },
      { url: "/youtube-assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/youtube-assets/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/youtube-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
  colorScheme: "dark",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

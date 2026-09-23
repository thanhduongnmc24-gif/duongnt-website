import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Công đoạn & sản lượng" },
  description: "Ghi công đoạn, theo dõi sản lượng và phần trăm hoàn thành mỗi ngày.",
  manifest: "/congdoan-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Công đoạn",
    statusBarStyle: "default",
  },
  applicationName: "Công đoạn",
  icons: {
    icon: [
      { url: "/congdoan-assets/icon.svg", type: "image/svg+xml" },
      { url: "/congdoan-assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/congdoan-assets/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/congdoan-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8fc",
  colorScheme: "light",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

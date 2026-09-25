import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Lịch làm việc" },
  description: "Theo dõi ca làm việc và ngày nghỉ luân phiên của nhân viên.",
  manifest: "/lichlamviec-manifest.webmanifest",
  appleWebApp: { capable: true, title: "Lịch làm việc", statusBarStyle: "default" },
  applicationName: "Lịch làm việc",
  icons: {
    icon: [
      { url: "/lichlamviec-assets/icon.svg", type: "image/svg+xml" },
      { url: "/lichlamviec-assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/lichlamviec-assets/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/lichlamviec-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#f5f7fb", colorScheme: "light" };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }

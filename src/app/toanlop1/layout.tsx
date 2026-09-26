import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Vương quốc Toán lớp 1" },
  description: "Vở Toán lớp 1 tương tác: viết trực tiếp trên đề gốc, tự lưu và chấm bài thông minh.",
  applicationName: "Toán lớp 1",
  manifest: "/toanlop1-manifest.webmanifest",
  icons: {
    icon: [{ url: "/toanlop1-assets/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/toanlop1-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Toán lớp 1", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#674fc1",
  colorScheme: "light",
};

export default function ToanLop1Layout({ children }: { children: React.ReactNode }) {
  return children;
}

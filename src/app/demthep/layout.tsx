import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Đếm thép" },
  description: "Ứng dụng đếm cây thép tự động qua Camera và Thư viện ảnh.",
  manifest: "/demthep-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Đếm thép",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Đếm thép",
  icons: {
    icon: [
      { url: "/demthep-assets/icon.svg", type: "image/svg+xml" },
      { url: "/demthep-assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/demthep-assets/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/demthep-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export default function DemThepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

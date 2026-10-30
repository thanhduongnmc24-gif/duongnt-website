import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Tổng hợp số liệu ĐMX" },
  description: "Đọc ảnh báo cáo ĐMX bằng Gemini và chuyển thành bảng số liệu có thể kiểm tra, chỉnh sửa, xuất CSV.",
  applicationName: "Số liệu ĐMX",
  manifest: "/dmx-manifest.webmanifest",
  icons: {
    icon: [{ url: "/dmx-assets/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/dmx-assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Số liệu ĐMX", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#2f5bea", colorScheme: "light" };

export default function DmxLayout({ children }: { children: React.ReactNode }) { return children; }

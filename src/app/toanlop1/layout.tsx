import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { absolute: "Vương quốc Toán lớp 1" },
  description: "Không gian học Toán lớp 1 tương tác, vui nhộn và an toàn cho trẻ nhỏ.",
  applicationName: "Toán lớp 1",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fff8e8",
  colorScheme: "light",
};

export default function ToanLop1Layout({ children }: { children: React.ReactNode }) {
  return children;
}

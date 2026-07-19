import type { Metadata } from "next";
import "./globals.css";
import { ThanhDieuHuong } from "@/components/menu/thanh-dieu-huong";

export const metadata: Metadata = {
  title: {
    default: "duongnt.io.vn",
    template: "%s | duongnt.io.vn",
  },
  description: "Website chia sẻ bài viết và kiến thức.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <ThanhDieuHuong />
        {children}
      </body>
    </html>
  );
}

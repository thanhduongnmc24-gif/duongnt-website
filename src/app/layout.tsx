import { headers } from "next/headers";
import { layThemeWebsite } from "@/lib/theme/theme";
import { ChanTrang } from "@/components/giao-dien/chan-trang";
import { NutLenDau } from "@/components/giao-dien/nut-len-dau";
import { ThemeCss } from "@/components/theme/theme-css";
import type { Metadata } from "next";
import "./globals.css";
import { ThanhDieuHuong } from "@/components/menu/thanh-dieu-huong";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "duongnt.io.vn",
    template: "%s | duongnt.io.vn",
  },
  description: "Website chia sẻ bài viết và kiến thức.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await layThemeWebsite();
  const headerStore = await headers();
  const laDuongTube = headerStore.get("x-duongtube-app") === "1";

  return (
    <html lang="vi" data-theme={theme.ma}>
      <body className={`${inter.className} min-h-screen ${laDuongTube ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
        {!laDuongTube ? <ThemeCss /> : null}
        {!laDuongTube ? <ThanhDieuHuong /> : null}
        {children}
        {!laDuongTube ? <ChanTrang /> : null}
        {!laDuongTube ? <NutLenDau /> : null}
      </body>
    </html>
  );
}

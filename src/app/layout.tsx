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
  const headerStore = await headers();
  const laDuongTube = headerStore.get("x-duongtube-app") === "1";
  const laCongDoan = headerStore.get("x-congdoan-app") === "1";
  const laLichLamViec = headerStore.get("x-lichlamviec-app") === "1";
  const laToanLop1 = headerStore.get("x-toanlop1-app") === "1";
  const laUngDung = laDuongTube || laCongDoan || laLichLamViec || laToanLop1;
  const theme = laUngDung ? null : await layThemeWebsite();

  return (
    <html lang="vi" data-theme={laDuongTube ? "duongtube" : laCongDoan ? "congdoan" : laLichLamViec ? "lichlamviec" : laToanLop1 ? "toanlop1" : theme?.ma}>
      <body
        className={`${inter.className} min-h-screen ${laDuongTube ? "bg-[#0f0f0f] text-[#f1f1f1]" : laToanLop1 ? "bg-[#fff8e8] text-[#24324a]" : laCongDoan || laLichLamViec ? "bg-[#f5f7fb] text-[#172033]" : "bg-slate-100 text-slate-900"}`}
        style={laDuongTube ? { backgroundColor: "#0f0f0f", color: "#f1f1f1", colorScheme: "dark" } : laToanLop1 ? { backgroundColor: "#fff8e8", color: "#24324a", colorScheme: "light" } : laCongDoan || laLichLamViec ? { backgroundColor: "#f5f7fb", color: "#172033", colorScheme: "light" } : undefined}
      >
        {!laUngDung ? <ThemeCss /> : null}
        {!laUngDung ? <ThanhDieuHuong /> : null}
        {children}
        {!laUngDung ? <ChanTrang /> : null}
        {!laUngDung ? <NutLenDau /> : null}
      </body>
    </html>
  );
}

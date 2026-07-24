import type { DuLieuTrangChuTheme } from "@/themes/types";
import { TrangChuDarkX } from "@/themes/dark-x/trang-chu";
import { TrangChuOrganicGreen } from "@/themes/organic-green/trang-chu";
import { TrangChuNewsPortal } from "@/themes/news-portal/trang-chu";

export function TrangChuTheoTheme({ maTheme, duLieu }: { maTheme: string; duLieu: DuLieuTrangChuTheme }) {
  if (maTheme === "dark-tech" || maTheme === "dark-x") return <TrangChuDarkX duLieu={duLieu}/>;
  if (maTheme === "minimal-light" || maTheme === "news-portal") return <TrangChuNewsPortal duLieu={duLieu}/>;
  return <TrangChuOrganicGreen duLieu={duLieu}/>;
}

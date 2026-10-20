"use client";

import Link from "next/link";
import { CalendarDays, Gauge } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./xuong-can-nav.module.css";

export function XuongCanNav() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="Khu vực xưởng cán">
    <Link href="/thongso" className={pathname.startsWith("/thongso") ? styles.active : undefined}><Gauge />Thông số cán</Link>
    <Link href="/lichlamviec" className={pathname.startsWith("/lichlamviec") ? styles.active : undefined}><CalendarDays />Lịch làm việc</Link>
  </nav>;
}

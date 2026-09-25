"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Coffee, Download, LoaderCircle, LogOut, Minus, Moon, Plus, Settings2, Sun, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { taoEmailLichLamViec, taoSupabaseLichLamViec } from "@/lib/supabase/lich-lam-viec";
import { useLichLamViecPwa } from "@/components/lich-lam-viec/use-lich-lam-viec-pwa";
import "./lichlamviec.css";

type HoSo = { ten_dang_nhap: string; ngay_bat_dau_chu_ky: string };
type DuLieuNgay = { id: string; ngay: string; danh_sach_ten: string[] };
type KieuCa = "ngay" | "dem" | "nghi";
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dinhDangThang = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const dinhDangNgay = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const sapXepTen = new Intl.Collator("vi", { sensitivity: "base" });

function haiChuSo(value: number) { return String(value).padStart(2, "0"); }
function khoaNgay(year: number, month: number, day: number) { return `${year}-${haiChuSo(month + 1)}-${haiChuSo(day)}`; }
function docNgay(key: string) { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day, 12); }
function ngayAm(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("vi-VN-u-ca-chinese", { day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).formatToParts(date);
    const day = parts.find(part => part.type === "day")?.value || "";
    const month = parts.find(part => part.type === "month")?.value?.replace(/\D/g, "") || "";
    return day === "1" && month ? `${day}/${month}` : day;
  } catch { return ""; }
}
function khoangCachNgay(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
function caTrongNgay(start: string, current: string): KieuCa {
  const index = ((khoangCachNgay(start, current) % 3) + 3) % 3;
  return (["ngay", "dem", "nghi"] as KieuCa[])[index];
}
function thongBaoAuth(message: string) {
  if (/invalid login credentials/i.test(message)) return "Tên đăng nhập hoặc mật khẩu chưa đúng.";
  if (/password should be at least/i.test(message)) return "Mật khẩu cần có ít nhất 6 ký tự.";
  return message || "Chưa thể hoàn thành. Hãy thử lại.";
}

export default function LichLamViecPage() {
  const supabase = useMemo(() => taoSupabaseLichLamViec(), []);
  const pwa = useLichLamViecPwa();
  const today = useMemo(() => new Date(), []);
  const todayKey = khoaNgay(today.getFullYear(), today.getMonth(), today.getDate());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HoSo | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState<Record<string, DuLieuNgay>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"name" | "date">("name");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cycleStart, setCycleStart] = useState(todayKey);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const valid = data.user?.user_metadata?.ung_dung === "lich_lam_viec";
      setUser(valid ? data.user : null);
      if (data.user && !valid) void supabase.auth.signOut();
      setLoadingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const next = session?.user?.user_metadata?.ung_dung === "lich_lam_viec" ? session.user : null;
      setUser(next);
      setLoadingSession(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let active = true;
    void supabase.from("lich_lam_viec_ho_so").select("ten_dang_nhap,ngay_bat_dau_chu_ky").eq("nguoi_dung_id", user.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error || !data) setMessage("Chưa tải được hồ sơ Lịch làm việc.");
      else { const next = data as HoSo; setProfile(next); setCycleStart(next.ngay_bat_dau_chu_ky); }
    });
    return () => { active = false; };
  }, [supabase, user]);

  const loadMonth = useCallback(async () => {
    if (!user) return;
    setLoadingData(true); setMessage("");
    const year = monthDate.getFullYear(); const month = monthDate.getMonth();
    const from = khoaNgay(year, month, 1); const to = khoaNgay(year, month, new Date(year, month + 1, 0).getDate());
    const { data, error } = await supabase.from("lich_lam_viec_nghi_luan_phien").select("id,ngay,danh_sach_ten").gte("ngay", from).lte("ngay", to).order("ngay");
    if (error) setMessage("Chưa tải được lịch tháng này.");
    else {
      const next: Record<string, DuLieuNgay> = {};
      for (const row of data || []) next[row.ngay] = { id: row.id, ngay: row.ngay, danh_sach_ten: Array.isArray(row.danh_sach_ten) ? row.danh_sach_ten : [] };
      setEntries(next);
    }
    setLoadingData(false);
  }, [monthDate, supabase, user]);
  useEffect(() => { void loadMonth(); }, [loadMonth]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (authMode === "signup") {
      const response = await fetch("/api/lichlamviec/dang-ky", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ten_dang_nhap: username, mat_khau: password }) });
      const result = await response.json();
      if (!response.ok) { setAuthMessage(result.loi || "Chưa tạo được tài khoản."); setAuthBusy(false); return; }
    }
    const { error } = await supabase.auth.signInWithPassword({ email: taoEmailLichLamViec(username), password });
    if (error) setAuthMessage(thongBaoAuth(error.message));
    setAuthBusy(false);
  }

  const calendarCells = useMemo(() => {
    const year = monthDate.getFullYear(); const month = monthDate.getMonth();
    const first = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
    return [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [monthDate]);

  function openDay(key: string) { setSelectedDate(key); setNames(entries[key]?.danh_sach_ten.length ? entries[key].danh_sach_ten : [""]); setMessage(""); }
  async function saveDay() {
    if (!user || !selectedDate) return;
    const unique = new Map<string, string>();
    for (const value of names) { const clean = value.trim().replace(/\s+/g, " ").slice(0, 80); if (clean) unique.set(clean.toLocaleLowerCase("vi"), clean); }
    const cleaned = [...unique.values()].sort(sapXepTen.compare);
    setSaving(true); setMessage("");
    if (!cleaned.length) {
      const { error } = await supabase.from("lich_lam_viec_nghi_luan_phien").delete().eq("nguoi_dung_id", user.id).eq("ngay", selectedDate);
      if (error) setMessage("Chưa xóa được danh sách ngày này.");
      else { setEntries(previous => { const next = { ...previous }; delete next[selectedDate]; return next; }); setSelectedDate(null); }
    } else {
      const { data, error } = await supabase.from("lich_lam_viec_nghi_luan_phien").upsert({ nguoi_dung_id: user.id, ngay: selectedDate, danh_sach_ten: cleaned, ngay_cap_nhat: new Date().toISOString() }, { onConflict: "nguoi_dung_id,ngay" }).select("id,ngay,danh_sach_ten").single();
      if (error || !data) setMessage("Chưa lưu được danh sách nghỉ luân phiên.");
      else { setEntries(previous => ({ ...previous, [data.ngay]: data as DuLieuNgay })); setSelectedDate(null); }
    }
    setSaving(false);
  }

  const summaryByName = useMemo(() => {
    const grouped = new Map<string, { name: string; days: number[] }>();
    Object.values(entries).forEach(entry => entry.danh_sach_ten.forEach(name => {
      const key = name.toLocaleLowerCase("vi"); const item = grouped.get(key) || { name, days: [] }; item.days.push(docNgay(entry.ngay).getDate()); grouped.set(key, item);
    }));
    return [...grouped.values()].sort((a, b) => sapXepTen.compare(a.name, b.name));
  }, [entries]);
  const summaryByDate = useMemo(() => Object.values(entries).filter(entry => entry.danh_sach_ten.length).sort((a, b) => a.ngay.localeCompare(b.ngay)), [entries]);
  const totalAssignments = Object.values(entries).reduce((total, entry) => total + entry.danh_sach_ten.length, 0);

  function openSettings() { setCycleStart(profile?.ngay_bat_dau_chu_ky || todayKey); setNewPassword(""); setConfirmPassword(""); setSettingsMessage(""); setSettingsOpen(true); }
  async function saveCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return; setSettingsBusy(true); setSettingsMessage("");
    const { data, error } = await supabase.from("lich_lam_viec_ho_so").update({ ngay_bat_dau_chu_ky: cycleStart, ngay_cap_nhat: new Date().toISOString() }).eq("nguoi_dung_id", user.id).select("ten_dang_nhap,ngay_bat_dau_chu_ky").single();
    if (error || !data) setSettingsMessage("Chưa lưu được ngày bắt đầu chu kỳ."); else { setProfile(data as HoSo); setSettingsMessage("Đã lưu chu kỳ Ngày → Đêm → Nghỉ."); }
    setSettingsBusy(false);
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 6) { setSettingsMessage("Mật khẩu mới cần ít nhất 6 ký tự."); return; }
    if (newPassword !== confirmPassword) { setSettingsMessage("Hai mật khẩu mới chưa giống nhau."); return; }
    setSettingsBusy(true); setSettingsMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setSettingsMessage(thongBaoAuth(error.message)); else { setNewPassword(""); setConfirmPassword(""); setSettingsMessage("Đã đổi mật khẩu."); }
    setSettingsBusy(false);
  }

  function ShiftIcon({ shift }: { shift: KieuCa }) { return shift === "ngay" ? <Sun /> : shift === "dem" ? <Moon /> : <Coffee />; }
  if (loadingSession) return <main className="llv-loading"><LoaderCircle className="llv-spin" /> Đang mở lịch…</main>;
  if (!user) return <main className="llv-auth-shell"><section className="llv-auth-card">
    <div className="llv-brand"><span><CalendarDays /></span><div><strong>Lịch làm việc</strong><small>Ca làm & nghỉ luân phiên</small></div></div>
    <h1>{authMode === "login" ? "Đăng nhập lịch riêng" : "Tạo tài khoản lịch"}</h1><p>Tài khoản này tách riêng khỏi Công đoạn và các khu vực khác.</p>
    <div className="llv-auth-tabs"><button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthMessage(""); }}>Đăng nhập</button><button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>Đăng ký</button></div>
    <form onSubmit={submitAuth}><label>Tên đăng nhập<input name="username" autoComplete="username" minLength={3} maxLength={40} pattern="[a-z0-9._-]+" placeholder="vi-du: duong24" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} maxLength={72} required /></label>{authMessage && <p className="llv-form-message error" role="alert">{authMessage}</p>}<button className="llv-primary" disabled={authBusy}>{authBusy ? <LoaderCircle className="llv-spin" /> : <UserRound />}{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button></form>
    <small className="llv-auth-foot">duongnt.io.vn/lichlamviec · Tài khoản riêng</small>
  </section></main>;

  return <main className="llv-app">
    <header className="llv-header"><div className="llv-title"><span><CalendarDays /></span><div><h1>Lịch làm việc</h1><p>@{profile?.ten_dang_nhap || "đang tải"}</p></div></div><button aria-label="Mở cài đặt" onClick={openSettings}><Settings2 /></button></header>
    {pwa.updateAvailable && <div className="llv-update">Có phiên bản mới.<button onClick={pwa.update}>Cập nhật</button></div>}
    {message && <div className="llv-alert" role="alert">{message}<button onClick={() => setMessage("")}><X /></button></div>}
    <section className="llv-calendar-card">
      <div className="llv-month-nav"><button aria-label="Tháng trước" onClick={() => setMonthDate(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft /></button><button className="llv-month-title" onClick={() => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))}>{dinhDangThang.format(monthDate)}</button><button aria-label="Tháng sau" onClick={() => setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight /></button></div>
      <div className="llv-weekdays">{THU.map((day, index) => <span className={index === 0 ? "sunday" : ""} key={day}>{day}</span>)}</div>
      <div className={`llv-calendar ${loadingData ? "loading" : ""}`} aria-busy={loadingData}>{calendarCells.map((day, index) => {
        if (!day) return <span className="llv-empty" key={`empty-${index}`} />;
        const key = khoaNgay(monthDate.getFullYear(), monthDate.getMonth(), day); const date = docNgay(key); const entry = entries[key]; const shift = caTrongNgay(profile?.ngay_bat_dau_chu_ky || todayKey, key);
        return <button key={key} className={`llv-day ${date.getDay() === 0 ? "sunday" : ""} ${key === todayKey ? "today" : ""} shift-${shift}`} onClick={() => openDay(key)}><span className="llv-day-top"><strong>{day}</strong><i title={shift === "ngay" ? "Ca ngày" : shift === "dem" ? "Ca đêm" : "Ngày nghỉ"}><ShiftIcon shift={shift} /></i></span><small>{ngayAm(date)}</small>{entry?.danh_sach_ten.length ? <span className="llv-names">{entry.danh_sach_ten.map(name => <b key={name}>{name}</b>)}</span> : null}</button>;
      })}</div>
      <div className="llv-legend"><span><i className="sun"><Sun /></i>Ca ngày</span><span><i className="moon"><Moon /></i>Ca đêm</span><span><i className="coffee"><Coffee /></i>Nghỉ</span></div>
    </section>

    <section className="llv-summary"><header><div><span>Tổng hợp nghỉ luân phiên</span><strong>{totalAssignments} lượt · {Object.keys(entries).length} ngày</strong></div><div className="llv-filter"><button className={summaryMode === "name" ? "active" : ""} onClick={() => setSummaryMode("name")}>Theo tên A–Z</button><button className={summaryMode === "date" ? "active" : ""} onClick={() => setSummaryMode("date")}>Theo ngày</button></div></header>
      <div className="llv-summary-list">{summaryMode === "name" ? summaryByName.map(item => <article key={item.name}><strong>{item.name}</strong><span>{item.days.join(", ")}</span></article>) : summaryByDate.map(item => <article key={item.ngay}><strong>Ngày {docNgay(item.ngay).getDate()}</strong><span>{[...item.danh_sach_ten].sort(sapXepTen.compare).join(", ")}</span></article>)}{!(summaryMode === "name" ? summaryByName.length : summaryByDate.length) && <p>Tháng này chưa có ngày nghỉ luân phiên.</p>}</div>
    </section>
    <button className="llv-fab" onClick={() => openDay(todayKey)}><Plus />Nhập hôm nay</button>

    {selectedDate && <div className="llv-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setSelectedDate(null); }}><section className="llv-editor" role="dialog" aria-modal="true" aria-label="Nhập người nghỉ luân phiên"><header><button onClick={() => setSelectedDate(null)} disabled={saving}>Hủy</button><div><strong>{dinhDangNgay.format(docNgay(selectedDate))}</strong><small>Nhập mỗi người một hàng</small></div><button onClick={saveDay} disabled={saving}>{saving ? "Đang lưu" : "Lưu"}</button></header><div className="llv-editor-body">{names.map((name, index) => <div className="llv-name-row" key={index}><span>{index + 1}</span><input autoFocus={index === 0} aria-label={`Tên nhân viên ${index + 1}`} value={name} maxLength={80} placeholder="Tên nhân viên" onChange={event => setNames(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><button aria-label="Xóa tên" onClick={() => setNames(current => current.length === 1 ? [""] : current.filter((_, itemIndex) => itemIndex !== index))}><Minus /></button></div>)}<button className="llv-add-name" onClick={() => setNames(current => [...current, ""])}><Plus />Thêm người</button><p>Để trống toàn bộ rồi bấm Lưu để xóa danh sách của ngày này.</p></div></section></div>}

    {settingsOpen && <div className="llv-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !settingsBusy) setSettingsOpen(false); }}><section className="llv-settings" role="dialog" aria-modal="true" aria-label="Cài đặt lịch làm việc"><header><div><span><Settings2 /></span><div><strong>Cài đặt</strong><small>@{profile?.ten_dang_nhap}</small></div></div><button aria-label="Đóng cài đặt" onClick={() => setSettingsOpen(false)}><X /></button></header><div className="llv-settings-scroll"><form onSubmit={saveCycle}><h2>Chu kỳ ca làm việc</h2><p>Chu kỳ lặp lại: Ngày → Đêm → Nghỉ.</p><label>Ngày bắt đầu ca Ngày<input type="date" required value={cycleStart} onChange={event => setCycleStart(event.target.value)} /></label><div className="llv-cycle-preview"><span><Sun />Ngày</span><span><Moon />Đêm</span><span><Coffee />Nghỉ</span></div><button className="llv-save" disabled={settingsBusy}><Check />Lưu chu kỳ</button></form><form onSubmit={changePassword}><h2>Đổi mật khẩu</h2><label>Mật khẩu mới<input type="password" minLength={6} maxLength={72} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required /></label><label>Nhập lại mật khẩu<input type="password" minLength={6} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required /></label><button className="llv-save secondary" disabled={settingsBusy}><Check />Đổi mật khẩu</button></form>{settingsMessage && <p className="llv-form-message" role="status">{settingsMessage}</p>}<div className="llv-settings-actions"><button disabled={!pwa.canInstall || pwa.installed} onClick={() => pwa.canInstall ? void pwa.install() : undefined}><Download />{pwa.installed ? "Ứng dụng đã được cài" : pwa.canInstall ? "Cài ứng dụng" : "Cài từ menu trình duyệt"}</button><button className="danger" onClick={() => void supabase.auth.signOut()}><LogOut />Đăng xuất</button></div></div></section></div>}
  </main>;
}

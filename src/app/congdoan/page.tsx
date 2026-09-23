"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  LogOut,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { taoSupabaseTrinhDuyet } from "@/lib/supabase/trinh-duyet";
import { useCongDoanPwa } from "@/components/congdoan/use-congdoan-pwa";
import "./congdoan.css";

type CongDoan = { id: string; so_to: string; he_so: string };
type CongDoanDaLuu = { so_to: number; he_so: number };
type DuLieuNgay = {
  id: string;
  ngay: string;
  gio_vao: string;
  gio_ve: string;
  nghi_lam: boolean;
  phut_chuan: number;
  cong_doan: CongDoanDaLuu[];
  tong_ket_qua: number;
  phan_tram: number;
};
type HoSo = { ten_hien_thi: string; email: string | null };

const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dinhDangThang = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const dinhDangNgay = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" });

function taoId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function haiChuSo(value: number) {
  return String(value).padStart(2, "0");
}

function khoaNgay(year: number, month: number, day: number) {
  return `${year}-${haiChuSo(month + 1)}-${haiChuSo(day)}`;
}

function docNgay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function ngayAm(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("vi-VN-u-ca-chinese", {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).formatToParts(date);
    const day = parts.find(part => part.type === "day")?.value || "";
    const month = parts.find(part => part.type === "month")?.value?.replace(/\D/g, "") || "";
    return day === "1" && month ? `${day}/${month}` : day;
  } catch {
    return "";
  }
}

function so(value: string | number | null | undefined) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function congDoanRong(): CongDoan {
  return { id: taoId(), so_to: "", he_so: "" };
}

function thongBaoDangNhap(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email hoặc mật khẩu chưa đúng.";
  if (/user already registered/i.test(message)) return "Email này đã được đăng ký.";
  if (/password should be at least/i.test(message)) return "Mật khẩu cần có ít nhất 6 ký tự.";
  if (/email rate limit/i.test(message)) return "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.";
  return message || "Chưa thể hoàn thành. Hãy thử lại.";
}

export default function CongDoanPage() {
  const supabase = useMemo(() => taoSupabaseTrinhDuyet(), []);
  const pwa = useCongDoanPwa();
  const today = useMemo(() => new Date(), []);
  const todayKey = khoaNgay(today.getFullYear(), today.getMonth(), today.getDate());
  const [user, setUser] = useState<User | null>(null);
  const [hoSo, setHoSo] = useState<HoSo | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [entries, setEntries] = useState<Record<string, DuLieuNgay>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("16:30");
  const [offWork, setOffWork] = useState(false);
  const [standardMinutes, setStandardMinutes] = useState("510");
  const [stages, setStages] = useState<CongDoan[]>([congDoanRong(), congDoanRong()]);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoadingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      setLoadingSession(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!user) { setHoSo(null); return; }
    let active = true;
    void supabase.from("cong_doan_ho_so").select("ten_hien_thi,email").eq("nguoi_dung_id", user.id).maybeSingle()
      .then(({ data }) => { if (active) setHoSo(data as HoSo | null); });
    return () => { active = false; };
  }, [supabase, user]);

  const loadMonth = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDataError("");
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const from = khoaNgay(year, month, 1);
    const to = khoaNgay(year, month, new Date(year, month + 1, 0).getDate());
    const { data, error } = await supabase.from("cong_doan_ngay").select("id,ngay,gio_vao,gio_ve,nghi_lam,phut_chuan,cong_doan,tong_ket_qua,phan_tram")
      .gte("ngay", from).lte("ngay", to).order("ngay");
    if (error) {
      setDataError("Chưa tải được dữ liệu tháng này. Hãy kiểm tra kết nối rồi thử lại.");
    } else {
      const next: Record<string, DuLieuNgay> = {};
      for (const row of data || []) {
        next[row.ngay] = {
          ...row,
          gio_vao: String(row.gio_vao).slice(0, 5),
          gio_ve: String(row.gio_ve).slice(0, 5),
          phut_chuan: so(row.phut_chuan),
          cong_doan: Array.isArray(row.cong_doan) ? row.cong_doan as CongDoanDaLuu[] : [],
          tong_ket_qua: so(row.tong_ket_qua),
          phan_tram: so(row.phan_tram),
        };
      }
      setEntries(next);
    }
    setLoadingData(false);
  }, [monthDate, supabase, user]);

  useEffect(() => { void loadMonth(); }, [loadMonth]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const name = String(form.get("name") || "").trim();
    if (authMode === "signup" && name.length < 2) {
      setAuthMessage("Hãy nhập tên hiển thị có ít nhất 2 ký tự.");
      setAuthBusy(false);
      return;
    }
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { ten_hien_thi: name }, emailRedirectTo: window.location.origin } });
    if (result.error) setAuthMessage(thongBaoDangNhap(result.error.message));
    else if (authMode === "signup" && !result.data.session) setAuthMessage("Tài khoản đã được tạo. Hãy mở email xác nhận rồi đăng nhập.");
    setAuthBusy(false);
  }

  function changeMonth(offset: number) {
    setSelectedDate(null);
    setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openDay(key: string) {
    const entry = entries[key];
    setSelectedDate(key);
    setStartTime(entry?.gio_vao || "07:30");
    setEndTime(entry?.gio_ve || "16:30");
    setOffWork(entry?.nghi_lam || false);
    setStandardMinutes(String(entry?.phut_chuan || 510));
    setStages(entry?.cong_doan?.length
      ? entry.cong_doan.map(item => ({ id: taoId(), so_to: String(item.so_to), he_so: String(item.he_so) }))
      : [congDoanRong(), congDoanRong()]);
    setDataError("");
  }

  const totalResult = offWork ? 0 : stages.reduce((total, stage) => total + so(stage.so_to) * so(stage.he_so), 0);
  const percentage = offWork ? 0 : standardMinutes && so(standardMinutes) > 0 ? totalResult * 100 / so(standardMinutes) : 0;

  async function saveDay() {
    if (!user || !selectedDate) return;
    setSaving(true);
    setDataError("");
    const stageData = stages.map(stage => ({ so_to: so(stage.so_to), he_so: so(stage.he_so) })).filter(stage => stage.so_to > 0 || stage.he_so > 0);
    const { data, error } = await supabase.from("cong_doan_ngay").upsert({
      nguoi_dung_id: user.id,
      ngay: selectedDate,
      gio_vao: startTime,
      gio_ve: endTime,
      nghi_lam: offWork,
      phut_chuan: Math.max(1, Math.min(1440, Math.round(so(standardMinutes) || 510))),
      cong_doan: stageData,
    }, { onConflict: "nguoi_dung_id,ngay" }).select("id,ngay,gio_vao,gio_ve,nghi_lam,phut_chuan,cong_doan,tong_ket_qua,phan_tram").single();
    if (error || !data) {
      setDataError(error?.message || "Chưa lưu được dữ liệu.");
    } else {
      setEntries(previous => ({ ...previous, [data.ngay]: {
        ...data,
        gio_vao: String(data.gio_vao).slice(0, 5),
        gio_ve: String(data.gio_ve).slice(0, 5),
        phut_chuan: so(data.phut_chuan),
        cong_doan: Array.isArray(data.cong_doan) ? data.cong_doan as CongDoanDaLuu[] : [],
        tong_ket_qua: so(data.tong_ket_qua),
        phan_tram: so(data.phan_tram),
      } }));
      setSelectedDate(null);
    }
    setSaving(false);
  }

  async function deleteDay() {
    if (!user || !selectedDate || !entries[selectedDate]) return;
    setSaving(true);
    const { error } = await supabase.from("cong_doan_ngay").delete().eq("nguoi_dung_id", user.id).eq("ngay", selectedDate);
    if (error) setDataError("Chưa xóa được dữ liệu ngày này.");
    else {
      setEntries(previous => { const next = { ...previous }; delete next[selectedDate]; return next; });
      setSelectedDate(null);
    }
    setSaving(false);
  }

  const calendarCells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [monthDate]);

  const monthEntries = Object.values(entries);
  const monthTotal = monthEntries.reduce((total, entry) => total + entry.tong_ket_qua, 0);
  const workDays = monthEntries.filter(entry => !entry.nghi_lam).length;
  const averagePercent = workDays ? monthEntries.reduce((total, entry) => total + entry.phan_tram, 0) / workDays : 0;

  if (loadingSession) return <main className="cd-loading"><LoaderCircle /><span>Đang mở sổ công đoạn…</span></main>;

  if (!user) return <main className="cd-auth-shell">
    <section className="cd-auth-card">
      <div className="cd-auth-brand"><span><BarChart3 /></span><div><strong>Công đoạn</strong><small>Tính công & sản lượng</small></div></div>
      <div className="cd-auth-copy"><span className="cd-eyebrow"><Sparkles size={15} /> Sổ sản lượng cá nhân</span><h1>{authMode === "login" ? "Chào bạn trở lại" : "Tạo tài khoản mới"}</h1><p>Dữ liệu được lưu riêng cho từng tài khoản và đồng bộ trên các thiết bị.</p></div>
      <div className="cd-auth-tabs"><button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthMessage(""); }}>Đăng nhập</button><button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>Đăng ký</button></div>
      <form onSubmit={submitAuth}>
        {authMode === "signup" && <label>Họ và tên<input name="name" autoComplete="name" placeholder="Nguyễn Văn A" required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" placeholder="ban@example.com" required /></label>
        <label>Mật khẩu<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} placeholder="Ít nhất 6 ký tự" required /></label>
        {authMessage && <p className="cd-auth-message" role="status">{authMessage}</p>}
        <button className="cd-primary" disabled={authBusy}>{authBusy ? <LoaderCircle className="cd-spin" /> : authMode === "login" ? <UserRound /> : <Check />}{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button>
      </form>
      <small className="cd-auth-foot">duongnt.io.vn/congdoan · PWA riêng tư</small>
    </section>
  </main>;

  return <main className="cd-app">
    <header className="cd-header">
      <div className="cd-header-title"><span className="cd-app-icon"><BarChart3 /></span><div><h1>Tính công & sản lượng</h1><p>{hoSo?.ten_hien_thi || user.email}</p></div></div>
      <button className="cd-icon-button" aria-label="Mở cài đặt" onClick={() => setSettingsOpen(true)}><Settings2 /></button>
    </header>

    {pwa.updateAvailable && <div className="cd-update">Có phiên bản mới.<button onClick={pwa.update}>Cập nhật</button></div>}
    {dataError && <div className="cd-error" role="alert">{dataError}<button onClick={() => setDataError("")}><X /></button></div>}

    <section className="cd-calendar-card">
      <div className="cd-month-nav"><button aria-label="Tháng trước" onClick={() => changeMonth(-1)}><ChevronLeft /></button><button className="cd-month-label" onClick={() => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))}>{dinhDangThang.format(monthDate)}</button><button aria-label="Tháng sau" onClick={() => changeMonth(1)}><ChevronRight /></button></div>
      <div className="cd-weekdays">{THU.map((day, index) => <span className={index === 0 ? "sunday" : ""} key={day}>{day}</span>)}</div>
      <div className={`cd-calendar ${loadingData ? "loading" : ""}`} aria-busy={loadingData}>
        {calendarCells.map((day, index) => {
          if (!day) return <span className="cd-day-empty" key={`empty-${index}`} />;
          const key = khoaNgay(monthDate.getFullYear(), monthDate.getMonth(), day);
          const date = docNgay(key);
          const entry = entries[key];
          return <button key={key} className={`cd-day ${date.getDay() === 0 ? "sunday" : ""} ${key === todayKey ? "today" : ""} ${entry ? "has-data" : ""}`} onClick={() => openDay(key)}>
            <span className="cd-solar">{day}</span><span className="cd-lunar">{ngayAm(date)}</span>
            {entry?.nghi_lam ? <span className="cd-off">Nghỉ</span> : entry ? <span className="cd-percent">{entry.phan_tram.toFixed(2)}%</span> : null}
          </button>;
        })}
      </div>
    </section>

    <section className="cd-summary">
      <div className="cd-section-heading"><div><span>Thống kê tháng</span><h2>{dinhDangThang.format(monthDate)}</h2></div><BarChart3 /></div>
      <div className="cd-summary-grid"><article><span>Ngày đã nhập</span><strong>{monthEntries.length}</strong></article><article><span>Ngày làm việc</span><strong>{workDays}</strong></article><article><span>Tổng kết quả</span><strong>{monthTotal.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</strong></article><article><span>Trung bình</span><strong>{averagePercent.toFixed(2)}%</strong></article></div>
    </section>

    <button className="cd-fab" onClick={() => openDay(todayKey)}><Plus /><span>Nhập hôm nay</span></button>

    {selectedDate && <div className="cd-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setSelectedDate(null); }}>
      <section className="cd-editor" role="dialog" aria-modal="true" aria-label="Nhập công đoạn">
        <header><button onClick={() => setSelectedDate(null)} disabled={saving}>Hủy</button><strong>{dinhDangNgay.format(docNgay(selectedDate))}</strong><button onClick={saveDay} disabled={saving}>{saving ? "Đang lưu" : "Đóng & lưu"}</button></header>
        <div className="cd-editor-body">
          <div className="cd-time-row"><label>Giờ vào<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} disabled={offWork} /></label><label>Giờ về<input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} disabled={offWork} /></label></div>
          <label className="cd-switch-row"><span>Nghỉ làm<small>Ngày này không tính sản lượng</small></span><input type="checkbox" checked={offWork} onChange={event => setOffWork(event.target.checked)} /><i /></label>
          <label className="cd-standard"><span>Phút chuẩn</span><input type="number" min="1" max="1440" inputMode="numeric" value={standardMinutes} onChange={event => setStandardMinutes(event.target.value)} disabled={offWork} /></label>
          {!offWork && <div className="cd-stage-list">
            <div className="cd-stage-head"><span>Số tờ</span><span>Hệ số %</span><span>Kết quả</span><span /></div>
            {stages.map(stage => {
              const result = so(stage.so_to) * so(stage.he_so);
              return <div className="cd-stage-row" key={stage.id}><input aria-label="Số tờ" type="number" min="0" step="any" inputMode="decimal" value={stage.so_to} onChange={event => setStages(current => current.map(item => item.id === stage.id ? { ...item, so_to: event.target.value } : item))} /><input aria-label="Hệ số phần trăm" type="number" min="0" step="any" inputMode="decimal" value={stage.he_so} onChange={event => setStages(current => current.map(item => item.id === stage.id ? { ...item, he_so: event.target.value } : item))} /><output>{result.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}</output><button aria-label="Xóa công đoạn" onClick={() => setStages(current => current.length > 1 ? current.filter(item => item.id !== stage.id) : [congDoanRong()])}><Minus /></button></div>;
            })}
            <button className="cd-add-stage" onClick={() => setStages(current => [...current, congDoanRong()])}><Plus /> Thêm công đoạn</button>
          </div>}
          <div className="cd-total"><span>Tổng kết quả<strong>{totalResult.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}</strong></span><div><small>Hiệu suất ngày</small><strong>{percentage.toFixed(2)}%</strong></div></div>
          {entries[selectedDate] && <button className="cd-delete" onClick={deleteDay} disabled={saving}>Xóa dữ liệu ngày này</button>}
        </div>
      </section>
    </div>}

    {settingsOpen && <div className="cd-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="cd-settings" role="dialog" aria-modal="true"><header><div><span><UserRound /></span><div><strong>{hoSo?.ten_hien_thi || "Tài khoản"}</strong><small>{user.email}</small></div></div><button onClick={() => setSettingsOpen(false)}><X /></button></header><div className="cd-settings-body"><button onClick={() => pwa.canInstall ? void pwa.install() : undefined} disabled={!pwa.canInstall || pwa.installed}><Download />{pwa.installed ? "Ứng dụng đã được cài" : pwa.canInstall ? "Cài ứng dụng vào thiết bị" : "Cài từ menu trình duyệt"}</button><button className="danger" onClick={() => void supabase.auth.signOut()}><LogOut />Đăng xuất</button></div></section></div>}
  </main>;
}

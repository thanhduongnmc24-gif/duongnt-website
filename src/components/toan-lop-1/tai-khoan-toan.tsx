"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Award, Flame, LogIn, LogOut, ShieldCheck, Star, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { taoEmailToanLop1, taoSupabaseToanLop1 } from "@/lib/supabase/toan-lop-1";

type HoSo = { ten_dang_nhap: string; ten_hien_thi: string; ma_phu_huynh: string; tong_sao: number; chuoi_ngay: number };
type TienDo = { bai_hoc_id: string; so_cau_dung: number; tong_so_cau: number; da_hoan_thanh: boolean; ngay_cap_nhat: string; du_lieu_net_ve?: unknown[]; diem?: number; quyen?: number; trang?: number };

export function TaiKhoanToan() {
  const supabase = useMemo(() => taoSupabaseToanLop1(), []);
  const [user, setUser] = useState<User | null>(null); const [profile, setProfile] = useState<HoSo | null>(null); const [progress, setProgress] = useState<TienDo[]>([]);
  const [open, setOpen] = useState(false); const [register, setRegister] = useState(false); const [parent, setParent] = useState(false); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);

  async function load(account: User | null) {
    setUser(account); if (!account) { setProfile(null); setProgress([]); return; }
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("toan_lop_1_ho_so").select("*").eq("user_id", account.id).maybeSingle(),
      supabase.from("toan_lop_1_tien_do").select("*").eq("user_id", account.id).order("ngay_cap_nhat", { ascending: false }),
    ]);
    const tienDo = (t || []) as TienDo[];
    setProfile(p as HoSo | null); setProgress(tienDo);
    sessionStorage.setItem("toanlop1-remote-progress", JSON.stringify(tienDo));
    for (const item of tienDo) window.dispatchEvent(new CustomEvent("toanlop1:remote-progress", { detail: { baiHocId: item.bai_hoc_id, duLieuNetVe: item.du_lieu_net_ve || [] } }));
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => load(session?.user || null));
    const sync = async (event: Event) => {
      const detail = (event as CustomEvent).detail as { baiHocId: string; soDung: number; tongSo: number; duLieuNetVe?: unknown[]; diem?: number; quyen?: number; trang?: number };
      const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return;
      await supabase.from("toan_lop_1_tien_do").upsert({ user_id: auth.user.id, bai_hoc_id: detail.baiHocId, so_cau_dung: detail.soDung, tong_so_cau: detail.tongSo, da_hoan_thanh: detail.soDung === detail.tongSo, du_lieu_net_ve: detail.duLieuNetVe || [], diem: detail.diem || 0, quyen: detail.quyen, trang: detail.trang, ngay_cap_nhat: new Date().toISOString() });
      await load(auth.user);
    };
    window.addEventListener("toanlop1:progress", sync);
    return () => { data.subscription.unsubscribe(); window.removeEventListener("toanlop1:progress", sync); };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim().toLowerCase(); const password = String(form.get("password") || "");
    if (register) {
      const response = await fetch("/api/toanlop1/dang-ky", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ten_dang_nhap: username, ten_hien_thi: form.get("displayName"), mat_khau: password, ma_phu_huynh: form.get("parentPin") }) });
      const result = await response.json(); if (!response.ok) setMessage(result.loi || "Đăng ký thất bại."); else { await supabase.auth.signInWithPassword({ email: taoEmailToanLop1(username), password }); setOpen(false); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: taoEmailToanLop1(username), password }); if (error) setMessage("Sai tên đăng nhập hoặc mật khẩu."); else setOpen(false);
    }
    setBusy(false);
  }

  function openParent() { const pin = prompt("Nhập mã phụ huynh gồm 4 số:"); if (pin === profile?.ma_phu_huynh) setParent(true); else if (pin !== null) alert("Mã phụ huynh không đúng."); }
  const stars = progress.reduce((sum, item) => sum + item.so_cau_dung, 0); const completed = progress.filter((item) => item.da_hoan_thanh).length;

  return <>
    <div className="tl1-account-bar">
      {user ? <><span className="tl1-user"><UserRound size={18}/><b>{profile?.ten_hien_thi || "Học sinh"}</b></span><span><Star size={17}/> {stars} sao</span><button onClick={openParent}><ShieldCheck size={17}/> Phụ huynh</button><button onClick={() => supabase.auth.signOut()}><LogOut size={17}/> Thoát</button></> : <><span>Đăng nhập để lưu tiến độ trên mọi thiết bị</span><button className="primary" onClick={() => setOpen(true)}><LogIn size={17}/> Đăng nhập</button></>}
    </div>
    {open && <div className="tl1-modal-backdrop"><section className="tl1-auth-modal"><button className="tl1-close" onClick={() => setOpen(false)}><X/></button><UserRound size={40}/><h2>{register ? "Tạo tài khoản học sinh" : "Đăng nhập học tập"}</h2><form onSubmit={submit}>{register && <label>Tên học sinh<input name="displayName" minLength={2} required/></label>}<label>Tên đăng nhập<input name="username" minLength={3} required/></label><label>Mật khẩu<input name="password" type="password" minLength={6} required/></label>{register && <label>Mã phụ huynh 4 số<input name="parentPin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/></label>}{message && <p className="tl1-error">{message}</p>}<button className="tl1-submit" disabled={busy}>{busy ? "Đang xử lý..." : register ? "Tạo tài khoản" : "Đăng nhập"}</button></form><button className="tl1-switch" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</button></section></div>}
    {parent && <div className="tl1-modal-backdrop"><section className="tl1-parent-modal"><button className="tl1-close" onClick={() => setParent(false)}><X/></button><h2><ShieldCheck/> Báo cáo phụ huynh</h2><div className="tl1-parent-stats"><div><Star/><b>{stars}</b><span>Tổng sao</span></div><div><Award/><b>{completed}</b><span>Bài hoàn thành</span></div><div><Flame/><b>{profile?.chuoi_ngay || 0}</b><span>Chuỗi ngày</span></div></div><h3>Tiến độ từng bài</h3><div className="tl1-report-list">{progress.length ? progress.map(item => <div key={item.bai_hoc_id}><span>{item.bai_hoc_id.replaceAll("-", " ")}</span><b>{item.so_cau_dung}/{item.tong_so_cau}</b></div>) : <p>Chưa có bài nào được làm.</p>}</div><p className="tl1-award">{stars >= 25 ? "🏆 Huy hiệu: Nhà toán học nhí" : stars >= 15 ? "🥇 Huy hiệu: Chăm học" : stars >= 5 ? "🌟 Huy hiệu: Khởi đầu tốt" : "Làm đúng 5 câu để nhận huy hiệu đầu tiên."}</p></section></div>}
  </>;
}

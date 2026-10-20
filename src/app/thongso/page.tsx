"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Camera, Check, Download, FileImage, Gauge, GripVertical, ImagePlus, LoaderCircle, LogOut, Minus, Plus, RefreshCw, Save, Search, Table2, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { XuongCanNav } from "@/components/xuong-can/xuong-can-nav";
import { useLichLamViecPwa } from "@/components/lich-lam-viec/use-lich-lam-viec-pwa";
import { taoEmailLichLamViec, taoSupabaseLichLamViec } from "@/lib/supabase/lich-lam-viec";
import "./thongso.css";

type KieuCot = "text" | "image";
type Cot = { id: string; ten: string; kieu: KieuCot };
type Hang = { id: string; cells: Record<string, string> };
type Bang = { id: string; tieu_de: string; danh_sach_cot: Cot[]; danh_sach_hang: Hang[]; thu_tu: number };
type Anh = { id: string; bang_id: string; hang_id: string; cot_id: string; ten_tep: string; kieu_tep: string; ngay_cap_nhat: string };
type HoSo = { ten_dang_nhap: string };
type CheDoAnh = "thumb" | "full";
type ViTriAnh = { x: number; y: number };

const BO_NHO_ANH = "thongso-images-v1";

const COT_MAC_DINH: Cot[] = [
  { id: "thiet-bi", ten: "Thiết bị", kieu: "text" },
  { id: "thong-so", ten: "Thông số", kieu: "text" },
  { id: "gia-tri", ten: "Giá trị", kieu: "text" },
  { id: "hinh-anh", ten: "Hình ảnh", kieu: "image" },
];

function maMoi(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function thongBaoAuth(message: string) {
  if (/invalid login credentials/i.test(message)) return "Tên đăng nhập hoặc mật khẩu chưa đúng.";
  if (/password should be at least/i.test(message)) return "Mật khẩu cần có ít nhất 6 ký tự.";
  return message || "Chưa thể hoàn thành. Hãy thử lại.";
}

function chuThuongKhongDau(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
}

function khoaBoNhoAnh(anh: Anh, cheDo: CheDoAnh, taiKhoanId: string) {
  return `${location.origin}/__thongso-cache/${taiKhoanId}/${cheDo}/${anh.id}?updated=${encodeURIComponent(anh.ngay_cap_nhat)}`;
}

async function taiAnhCoBoNho(anh: Anh, cheDo: CheDoAnh, taiKhoanId: string, token: string, onBlob: (blob: Blob) => void) {
  const apiUrl = `/api/thongso/anh/${anh.id}${cheDo === "thumb" ? "?che_do=thumb" : ""}`;
  if (!("caches" in window)) {
    const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error();
    onBlob(await response.blob());
    return;
  }

  const cache = await caches.open(BO_NHO_ANH);
  const cacheKey = khoaBoNhoAnh(anh, cheDo, taiKhoanId);
  const exact = await cache.match(cacheKey);
  if (exact) {
    onBlob(await exact.blob());
    return;
  }

  const prefix = `/__thongso-cache/${taiKhoanId}/${cheDo}/${anh.id}`;
  const oldKeys = (await cache.keys()).filter(key => new URL(key.url).pathname === prefix);
  if (oldKeys[0]) {
    const oldResponse = await cache.match(oldKeys[0]);
    if (oldResponse) onBlob(await oldResponse.blob());
  }

  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error();
  const blob = await response.blob();
  await cache.put(cacheKey, new Response(blob, { headers: { "Content-Type": blob.type || anh.kieu_tep } }));
  await Promise.all(oldKeys.map(key => cache.delete(key)));
  onBlob(blob);
}

async function xoaAnhKhoiBoNho(anhId: string, taiKhoanId: string) {
  if (!("caches" in window)) return;
  const cache = await caches.open(BO_NHO_ANH);
  const prefix = `/__thongso-cache/${taiKhoanId}/`;
  const keys = await cache.keys();
  await Promise.all(keys.filter(key => {
    const path = new URL(key.url).pathname;
    return path.startsWith(prefix) && path.endsWith(`/${anhId}`);
  }).map(key => cache.delete(key)));
}

function AnhO({ anh, token, taiKhoanId, onOpen }: { anh: Anh; token: string; taiKhoanId: string; onOpen: (anh: Anh) => void }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; let objectUrl = "";
    setFailed(false); setSrc("");
    void taiAnhCoBoNho(anh, "thumb", taiKhoanId, token, blob => {
      if (!active) return;
      const nextUrl = URL.createObjectURL(blob);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = nextUrl;
      setSrc(nextUrl);
    }).catch(() => { if (active && !objectUrl) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [anh, taiKhoanId, token, attempt]);
  if (src) return <button className="ts-photo" onClick={() => onOpen(anh)} aria-label={`Xem ảnh ${anh.ten_tep}`}><img src={src} alt={anh.ten_tep} /></button>;
  if (failed) return <button className="ts-photo-error" onClick={() => setAttempt(value => value + 1)}><RefreshCw />Thử tải lại ảnh</button>;
  return <span className="ts-photo-loading"><LoaderCircle className="ts-spin" /></span>;
}

export default function ThongSoPage() {
  const supabase = useMemo(() => taoSupabaseLichLamViec(), []);
  const pwa = useLichLamViecPwa();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<HoSo | null>(null);
  const [token, setToken] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchByBoard, setSearchByBoard] = useState<Record<string, string>>({});
  const [boards, setBoards] = useState<Bang[]>([]);
  const [images, setImages] = useState<Anh[]>([]);
  const [savingId, setSavingId] = useState("");
  const [uploadingCell, setUploadingCell] = useState("");
  const [addColumnBoard, setAddColumnBoard] = useState<string | null>(null);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<KieuCot>("text");
  const [viewer, setViewer] = useState<{ src: string; anh: Anh } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<ViTriAnh>({ x: 0, y: 0 });
  const [draggedColumn, setDraggedColumn] = useState<{ boardId: string; columnId: string } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number; center: ViTriAnh; pan: ViTriAnh } | null>(null);
  const dragRef = useRef<{ start: ViTriAnh; pan: ViTriAnh } | null>(null);
  const viewerStageRef = useRef<HTMLDivElement | null>(null);
  const viewerImageRef = useRef<HTMLImageElement | null>(null);
  const viewerUrlRef = useRef("");
  const viewerRequestRef = useRef(0);

  useEffect(() => () => {
    if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const valid = data.session?.user?.user_metadata?.ung_dung === "lich_lam_viec";
      setUser(valid ? data.session!.user : null); setToken(valid ? data.session!.access_token : "");
      if (data.session?.user && !valid) void supabase.auth.signOut();
      setLoadingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const valid = session?.user?.user_metadata?.ung_dung === "lich_lam_viec";
      setUser(valid ? session!.user : null); setToken(valid ? session!.access_token : ""); setLoadingSession(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true); setMessage("");
    const [{ data: hoSo }, { data: bangData, error: bangError }, { data: anhData, error: anhError }] = await Promise.all([
      supabase.from("lich_lam_viec_ho_so").select("ten_dang_nhap").eq("nguoi_dung_id", user.id).single(),
      supabase.from("thong_so_bang").select("id,tieu_de,danh_sach_cot,danh_sach_hang,thu_tu").order("thu_tu").order("ngay_tao"),
      supabase.from("thong_so_anh").select("id,bang_id,hang_id,cot_id,ten_tep,kieu_tep,ngay_cap_nhat").order("ngay_tao"),
    ]);
    if (hoSo) setProfile(hoSo as HoSo);
    if (bangError || anhError) setMessage("Chưa tải được dữ liệu thông số. Hãy kiểm tra lại kết nối.");
    else {
      const loaded = (bangData || []) as Bang[];
      setBoards(loaded); setImages((anhData || []) as Anh[]);
      if (!loaded.length) {
        const { data, error } = await supabase.from("thong_so_bang").insert({ nguoi_dung_id: user.id, tieu_de: "Thông số thiết bị xưởng cán", danh_sach_cot: COT_MAC_DINH, danh_sach_hang: [], thu_tu: 0 }).select("id,tieu_de,danh_sach_cot,danh_sach_hang,thu_tu").single();
        if (data) setBoards([data as Bang]); else if (error) setMessage("Chưa tạo được bảng thông số đầu tiên.");
      }
    }
    setLoadingData(false);
  }, [supabase, user]);
  useEffect(() => { void loadData(); }, [loadData]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim().toLowerCase(); const password = String(form.get("password") || "");
    if (authMode === "signup") {
      const response = await fetch("/api/lichlamviec/dang-ky", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ten_dang_nhap: username, mat_khau: password }) });
      const result = await response.json();
      if (!response.ok) { setAuthMessage(result.loi || "Chưa tạo được tài khoản."); setAuthBusy(false); return; }
    }
    const { error } = await supabase.auth.signInWithPassword({ email: taoEmailLichLamViec(username), password });
    if (error) setAuthMessage(thongBaoAuth(error.message));
    setAuthBusy(false);
  }

  function updateLocal(boardId: string, transform: (board: Bang) => Bang) { setBoards(current => current.map(board => board.id === boardId ? transform(board) : board)); }
  async function saveBoard(board: Bang) {
    setSavingId(board.id); setMessage("");
    const { error } = await supabase.from("thong_so_bang").update({ tieu_de: board.tieu_de.trim() || "Bảng thông số", danh_sach_cot: board.danh_sach_cot, danh_sach_hang: board.danh_sach_hang, ngay_cap_nhat: new Date().toISOString() }).eq("id", board.id);
    if (error) setMessage("Chưa lưu được thay đổi trong bảng.");
    setSavingId("");
  }
  function currentBoard(id: string) { return boards.find(board => board.id === id); }

  async function addBoard() {
    if (!user) return;
    const { data, error } = await supabase.from("thong_so_bang").insert({ nguoi_dung_id: user.id, tieu_de: `Bảng thông số ${boards.length + 1}`, danh_sach_cot: COT_MAC_DINH, danh_sach_hang: [], thu_tu: boards.length }).select("id,tieu_de,danh_sach_cot,danh_sach_hang,thu_tu").single();
    if (data) setBoards(current => [...current, data as Bang]); else if (error) setMessage("Chưa thêm được bảng mới.");
  }
  async function deleteImage(anh: Anh) {
    const response = await fetch(`/api/thongso/anh?id=${anh.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) {
      setImages(current => current.filter(item => item.id !== anh.id));
      if (user) void xoaAnhKhoiBoNho(anh.id, user.id);
    } else setMessage("Chưa xóa được ảnh.");
  }
  async function deleteBoard(board: Bang) {
    if (!confirm(`Xóa “${board.tieu_de}” cùng toàn bộ hình ảnh?`)) return;
    for (const image of images.filter(item => item.bang_id === board.id)) await deleteImage(image);
    const { error } = await supabase.from("thong_so_bang").delete().eq("id", board.id);
    if (error) setMessage("Chưa xóa được bảng."); else setBoards(current => current.filter(item => item.id !== board.id));
  }
  async function addRow(board: Bang) {
    const next = { ...board, danh_sach_hang: [...board.danh_sach_hang, { id: maMoi("hang"), cells: {} }] };
    updateLocal(board.id, () => next); await saveBoard(next);
  }
  async function removeRow(board: Bang, rowId: string) {
    for (const image of images.filter(item => item.bang_id === board.id && item.hang_id === rowId)) await deleteImage(image);
    const next = { ...board, danh_sach_hang: board.danh_sach_hang.filter(row => row.id !== rowId) };
    updateLocal(board.id, () => next); await saveBoard(next);
  }
  async function addColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!addColumnBoard || !columnName.trim()) return;
    const board = currentBoard(addColumnBoard); if (!board) return;
    const next = { ...board, danh_sach_cot: [...board.danh_sach_cot, { id: maMoi("cot"), ten: columnName.trim().slice(0, 60), kieu: columnType }] };
    updateLocal(board.id, () => next); setAddColumnBoard(null); setColumnName(""); setColumnType("text"); await saveBoard(next);
  }
  async function removeColumn(board: Bang, columnId: string) {
    if (!confirm("Xóa cột này và dữ liệu bên trong?")) return;
    for (const image of images.filter(item => item.bang_id === board.id && item.cot_id === columnId)) await deleteImage(image);
    const next = { ...board, danh_sach_cot: board.danh_sach_cot.filter(column => column.id !== columnId), danh_sach_hang: board.danh_sach_hang.map(row => { const cells = { ...row.cells }; delete cells[columnId]; return { ...row, cells }; }) };
    updateLocal(board.id, () => next); await saveBoard(next);
  }
  async function moveColumn(board: Bang, columnId: string, targetIndex: number) {
    const currentIndex = board.danh_sach_cot.findIndex(column => column.id === columnId);
    const safeIndex = Math.max(0, Math.min(board.danh_sach_cot.length - 1, targetIndex));
    if (currentIndex < 0 || currentIndex === safeIndex) return;
    const columns = [...board.danh_sach_cot];
    const [moved] = columns.splice(currentIndex, 1); columns.splice(safeIndex, 0, moved);
    const next = { ...board, danh_sach_cot: columns };
    updateLocal(board.id, () => next); await saveBoard(next);
  }
  function pinchDistance(touches: React.TouchList) {
    const x = touches[0].clientX - touches[1].clientX; const y = touches[0].clientY - touches[1].clientY;
    return Math.hypot(x, y);
  }
  function pinchCenter(touches: React.TouchList) {
    return { x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 };
  }
  function limitPan(next: ViTriAnh, nextZoom: number) {
    const stage = viewerStageRef.current; const image = viewerImageRef.current;
    if (!stage || !image || nextZoom <= 1) return { x: 0, y: 0 };
    const maxX = Math.max(0, (image.offsetWidth * nextZoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * nextZoom - stage.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  }
  function zoomAt(nextZoomValue: number, clientPoint?: ViTriAnh) {
    const nextZoom = Math.min(6, Math.max(1, nextZoomValue));
    const stage = viewerStageRef.current;
    setPan(current => {
      if (!stage || !clientPoint || nextZoom === 1) return limitPan(current, nextZoom);
      const rect = stage.getBoundingClientRect();
      const focus = { x: clientPoint.x - rect.left - rect.width / 2, y: clientPoint.y - rect.top - rect.height / 2 };
      return limitPan({
        x: focus.x - (focus.x - current.x) * nextZoom / zoom,
        y: focus.y - (focus.y - current.y) * nextZoom / zoom,
      }, nextZoom);
    });
    setZoom(nextZoom);
  }
  function startPan(clientX: number, clientY: number) {
    if (zoom <= 1) return;
    dragRef.current = { start: { x: clientX, y: clientY }, pan };
  }
  function movePan(clientX: number, clientY: number) {
    if (!dragRef.current || zoom <= 1) return;
    setPan(limitPan({ x: dragRef.current.pan.x + clientX - dragRef.current.start.x, y: dragRef.current.pan.y + clientY - dragRef.current.start.y }, zoom));
  }
  function toggleZoom(clientX: number, clientY: number) {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); }
    else zoomAt(2.5, { x: clientX, y: clientY });
  }
  function closeViewer() {
    viewerRequestRef.current += 1;
    if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
    viewerUrlRef.current = "";
    pinchRef.current = null;
    dragRef.current = null;
    setZoom(1); setPan({ x: 0, y: 0 });
    setViewer(null);
  }
  async function openFullImage(anh: Anh) {
    const requestId = ++viewerRequestRef.current;
    if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
    viewerUrlRef.current = "";
    setViewer({ src: "", anh }); setZoom(1); setPan({ x: 0, y: 0 }); setMessage("");
    try {
      await taiAnhCoBoNho(anh, "full", user!.id, token, blob => {
        if (viewerRequestRef.current !== requestId) return;
        const objectUrl = URL.createObjectURL(blob);
        if (viewerUrlRef.current) URL.revokeObjectURL(viewerUrlRef.current);
        viewerUrlRef.current = objectUrl;
        setViewer({ src: objectUrl, anh });
      });
    } catch {
      if (viewerRequestRef.current === requestId) {
        setViewer(null);
        setMessage("Chưa tải được ảnh chất lượng đầy đủ. Hãy thử lại.");
      }
    }
  }
  async function uploadImage(boardId: string, rowId: string, columnId: string, file?: File) {
    if (!file || !token) return;
    const cell = `${boardId}:${rowId}:${columnId}`; setUploadingCell(cell); setMessage(""); setSuccessMessage("");
    const form = new FormData(); form.set("bang_id", boardId); form.set("hang_id", rowId); form.set("cot_id", columnId); form.set("anh", file);
    const response = await fetch("/api/thongso/anh", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const result = await response.json();
    if (!response.ok) setMessage(result.loi || "Chưa tải được ảnh.");
    else {
      setImages(current => [...current.filter(item => !(item.bang_id === boardId && item.hang_id === rowId && item.cot_id === columnId)), result.anh as Anh]);
      setSuccessMessage("Đã tải ảnh lên thư mục Thong-so-can riêng của tài khoản trên Google Drive.");
    }
    setUploadingCell("");
  }

  if (loadingSession) return <main className="ts-loading"><LoaderCircle className="ts-spin" />Đang mở Thông số cán…</main>;
  if (!user) return <main className="ts-auth-shell"><section className="ts-auth-card">
    <div className="ts-brand"><span><Gauge /></span><div><strong>Xưởng cán</strong><small>Thông số thiết bị & lịch làm việc</small></div></div>
    <XuongCanNav />
    <h1>{authMode === "login" ? "Đăng nhập Xưởng cán" : "Tạo tài khoản Xưởng cán"}</h1><p>Dùng chung tài khoản cho Thông số cán và Lịch làm việc.</p>
    <div className="ts-auth-tabs"><button className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthMessage(""); }}>Đăng nhập</button><button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>Đăng ký</button></div>
    <form onSubmit={submitAuth}><label>Tên đăng nhập<input name="username" autoComplete="username" minLength={3} maxLength={40} pattern="[a-z0-9._-]+" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} maxLength={72} required /></label>{authMessage && <p className="ts-form-message error">{authMessage}</p>}<button className="ts-primary" disabled={authBusy}>{authBusy ? <LoaderCircle className="ts-spin" /> : <Check />}{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button></form>
  </section></main>;

  return <main className="ts-app">
    <header className="ts-header"><div className="ts-title"><span><Gauge /></span><div><h1>Thông số cán</h1><p>@{profile?.ten_dang_nhap || "đang tải"}</p></div></div><div className="ts-header-actions">{pwa.canInstall && !pwa.installed && <button onClick={() => void pwa.install()} aria-label="Cài ứng dụng"><Download /></button>}<button onClick={() => void supabase.auth.signOut()} aria-label="Đăng xuất"><LogOut /></button></div></header>
    <XuongCanNav />
    {pwa.updateAvailable && <div className="ts-alert info">Có phiên bản mới.<button onClick={pwa.update}>Cập nhật</button></div>}
    {successMessage && <div className="ts-alert success" role="status">{successMessage}<button onClick={() => setSuccessMessage("")}><X /></button></div>}
    {message && <div className="ts-alert" role="alert">{message}<button onClick={() => setMessage("")}><X /></button></div>}
    <div className="ts-page-tools"><button onClick={() => void addBoard()}><Plus />Thêm bảng</button></div>
    {loadingData ? <div className="ts-empty"><LoaderCircle className="ts-spin" />Đang tải dữ liệu…</div> : boards.map(board => {
      const searchValue = searchByBoard[board.id] || "";
      const normalizedSearch = chuThuongKhongDau(searchValue.trim());
      const visibleRows = normalizedSearch ? board.danh_sach_hang.filter(row => {
        const textValues = Object.values(row.cells).join(" ");
        const imageNames = images.filter(image => image.bang_id === board.id && image.hang_id === row.id).map(image => image.ten_tep).join(" ");
        return chuThuongKhongDau(`${textValues} ${imageNames}`).includes(normalizedSearch);
      }) : board.danh_sach_hang;
      return <section className="ts-board" key={board.id}>
      <header><input value={board.tieu_de} maxLength={120} aria-label="Tiêu đề bảng" onChange={event => updateLocal(board.id, current => ({ ...current, tieu_de: event.target.value }))} onBlur={() => { const current = currentBoard(board.id); if (current) void saveBoard(current); }} /><div>{savingId === board.id && <span><LoaderCircle className="ts-spin" />Đang lưu</span>}<button onClick={() => setAddColumnBoard(board.id)}><Plus />Thêm cột</button><button className="danger" aria-label="Xóa bảng" onClick={() => void deleteBoard(board)}><Trash2 /></button></div></header>
      <div className="ts-board-search"><Search /><input type="search" value={searchValue} onChange={event => setSearchByBoard(current => ({ ...current, [board.id]: event.target.value }))} placeholder="Tìm trong bảng này…" aria-label={`Tìm trong ${board.tieu_de}`} />{searchValue && <button onClick={() => setSearchByBoard(current => ({ ...current, [board.id]: "" }))} aria-label="Xóa nội dung tìm kiếm"><X /></button>}<span>{visibleRows.length}/{board.danh_sach_hang.length} dòng</span></div>
      <div className="ts-table-wrap"><table><thead><tr><th className="ts-index">STT</th>{board.danh_sach_cot.map((column, columnIndex) => <th key={column.id} className={draggedColumn?.boardId === board.id && draggedColumn.columnId === column.id ? "ts-column-dragging" : undefined} draggable onDragStart={() => setDraggedColumn({ boardId: board.id, columnId: column.id })} onDragEnd={() => setDraggedColumn(null)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (draggedColumn?.boardId === board.id) void moveColumn(board, draggedColumn.columnId, columnIndex); setDraggedColumn(null); }}><div><i className="ts-drag-handle" title="Kéo để di chuyển cột"><GripVertical /></i><span>{column.ten}</span><small>{column.kieu === "image" ? "Ảnh" : "Văn bản"}</small><span className="ts-column-move"><button disabled={columnIndex === 0} onClick={() => void moveColumn(board, column.id, columnIndex - 1)} aria-label={`Chuyển cột ${column.ten} sang trái`}><ArrowLeft /></button><button disabled={columnIndex === board.danh_sach_cot.length - 1} onClick={() => void moveColumn(board, column.id, columnIndex + 1)} aria-label={`Chuyển cột ${column.ten} sang phải`}><ArrowRight /></button></span><button className="ts-column-delete" onClick={() => void removeColumn(board, column.id)} aria-label={`Xóa cột ${column.ten}`}><X /></button></div></th>)}<th className="ts-row-actions" /></tr></thead><tbody>
        {visibleRows.map(row => { const rowIndex = board.danh_sach_hang.findIndex(item => item.id === row.id); return <tr key={row.id}><td className="ts-index">{rowIndex + 1}</td>{board.danh_sach_cot.map(column => {
          const image = images.find(item => item.bang_id === board.id && item.hang_id === row.id && item.cot_id === column.id); const cell = `${board.id}:${row.id}:${column.id}`;
          return <td key={column.id} className={column.kieu === "image" ? "ts-image-cell" : undefined}>{column.kieu === "text" ? <textarea rows={2} value={row.cells[column.id] || ""} placeholder="Nhập thông số…" onChange={event => updateLocal(board.id, current => ({ ...current, danh_sach_hang: current.danh_sach_hang.map(item => item.id === row.id ? { ...item, cells: { ...item.cells, [column.id]: event.target.value } } : item) }))} onBlur={() => { const current = currentBoard(board.id); if (current) void saveBoard(current); }} /> : image ? <div className="ts-image-box"><AnhO anh={image} token={token} taiKhoanId={user.id} onOpen={selected => void openFullImage(selected)} /><div><label title="Thay ảnh"><ImagePlus /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(board.id, row.id, column.id, event.target.files?.[0])} /></label><button onClick={() => void deleteImage(image)} title="Xóa ảnh"><Trash2 /></button></div></div> : <div className="ts-image-empty">{uploadingCell === cell ? <><LoaderCircle className="ts-spin" /><small>Đang tải lên Google Drive…</small></> : <><FileImage /><span>Thêm ảnh</span><div><label><ImagePlus />Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(board.id, row.id, column.id, event.target.files?.[0])} /></label><label><Camera />Chụp ảnh<input type="file" accept="image/*" capture="environment" onChange={event => void uploadImage(board.id, row.id, column.id, event.target.files?.[0])} /></label></div><small>Lưu trong thư mục Thong-so-can trên Google Drive</small></>}</div>}</td>;
        })}<td className="ts-row-actions"><button aria-label={`Xóa dòng ${rowIndex + 1}`} onClick={() => void removeRow(board, row.id)}><Minus /></button></td></tr>; })}
        {!board.danh_sach_hang.length && <tr><td className="ts-no-row" colSpan={board.danh_sach_cot.length + 2}>Chưa có dòng dữ liệu. Hãy thêm dòng đầu tiên.</td></tr>}
        {!!board.danh_sach_hang.length && !visibleRows.length && <tr><td className="ts-no-row" colSpan={board.danh_sach_cot.length + 2}>Không có dòng nào khớp với “{searchValue}”.</td></tr>}
      </tbody></table></div>
      <footer><button onClick={() => void addRow(board)}><Plus />Thêm dòng</button><button onClick={() => { const current = currentBoard(board.id); if (current) void saveBoard(current); }}><Save />Lưu bảng</button></footer>
    </section>; })}
    {!loadingData && !boards.length && <div className="ts-empty"><Table2 /><strong>Chưa có bảng thông số</strong><button onClick={() => void addBoard()}><Plus />Tạo bảng đầu tiên</button></div>}

    {addColumnBoard && <div className="ts-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAddColumnBoard(null); }}><form className="ts-dialog" onSubmit={addColumn}><header><div><strong>Thêm cột</strong><small>Chọn loại dữ liệu phù hợp</small></div><button type="button" onClick={() => setAddColumnBoard(null)}><X /></button></header><label>Tên cột<input autoFocus value={columnName} onChange={event => setColumnName(event.target.value)} maxLength={60} placeholder="Ví dụ: Áp suất" required /></label><label>Loại dữ liệu<select value={columnType} onChange={event => setColumnType(event.target.value as KieuCot)}><option value="text">Văn bản / số liệu</option><option value="image">Hình ảnh</option></select></label><button className="ts-primary"><Plus />Thêm cột</button></form></div>}
    {viewer && <div className="ts-viewer" role="dialog" aria-modal="true" aria-label="Xem ảnh thông số"><header><div><strong>{viewer.anh.ten_tep}</strong><span>{viewer.src ? `${Math.round(zoom * 100)}%` : "Đang tải ảnh gốc"}</span></div><div><button disabled={!viewer.src || zoom <= 1} onClick={() => zoomAt(zoom - .5)}><ZoomOut /></button><button disabled={!viewer.src || zoom >= 6} onClick={() => zoomAt(zoom + .5)}><ZoomIn /></button><button onClick={closeViewer}><X /></button></div></header><div ref={viewerStageRef} className={`ts-viewer-stage${zoom > 1 ? " is-zoomed" : ""}`} onWheel={event => { if (!viewer.src) return; event.preventDefault(); zoomAt(zoom + (event.deltaY < 0 ? .3 : -.3), { x: event.clientX, y: event.clientY }); }} onDoubleClick={event => { if (viewer.src) toggleZoom(event.clientX, event.clientY); }} onMouseDown={event => startPan(event.clientX, event.clientY)} onMouseMove={event => { if (event.buttons === 1) movePan(event.clientX, event.clientY); }} onMouseUp={() => { dragRef.current = null; }} onMouseLeave={() => { dragRef.current = null; }} onTouchStart={event => { if (!viewer.src) return; if (event.touches.length === 2) { pinchRef.current = { distance: pinchDistance(event.touches), zoom, center: pinchCenter(event.touches), pan }; dragRef.current = null; } else if (event.touches.length === 1) startPan(event.touches[0].clientX, event.touches[0].clientY); }} onTouchMove={event => { if (!viewer.src) return; if (event.touches.length === 2 && pinchRef.current) { event.preventDefault(); const stage = viewerStageRef.current; if (!stage) return; const ratio = pinchDistance(event.touches) / pinchRef.current.distance; const nextZoom = Math.min(6, Math.max(1, pinchRef.current.zoom * ratio)); const rect = stage.getBoundingClientRect(); const currentCenter = pinchCenter(event.touches); const oldFocus = { x: pinchRef.current.center.x - rect.left - rect.width / 2, y: pinchRef.current.center.y - rect.top - rect.height / 2 }; const nextFocus = { x: currentCenter.x - rect.left - rect.width / 2, y: currentCenter.y - rect.top - rect.height / 2 }; setZoom(nextZoom); setPan(limitPan({ x: nextFocus.x - (oldFocus.x - pinchRef.current.pan.x) * nextZoom / pinchRef.current.zoom, y: nextFocus.y - (oldFocus.y - pinchRef.current.pan.y) * nextZoom / pinchRef.current.zoom }, nextZoom)); } else if (event.touches.length === 1) { event.preventDefault(); movePan(event.touches[0].clientX, event.touches[0].clientY); } }} onTouchEnd={event => { pinchRef.current = null; if (event.touches.length === 1) startPan(event.touches[0].clientX, event.touches[0].clientY); else dragRef.current = null; }}>{viewer.src ? <><img ref={viewerImageRef} draggable={false} src={viewer.src} alt={viewer.anh.ten_tep} style={{ transform: `translate3d(${pan.x}px,${pan.y}px,0) scale(${zoom})` }} /><small>Chụm để phóng to · Kéo để xem xung quanh · Chạm hai lần để đặt lại</small></> : <div className="ts-viewer-loading"><LoaderCircle className="ts-spin" /><span>Đang tải ảnh đầy đủ chất lượng…</span></div>}</div></div>}
  </main>;
}

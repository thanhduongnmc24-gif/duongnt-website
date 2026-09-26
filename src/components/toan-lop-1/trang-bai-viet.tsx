"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Eye, EyeOff, LoaderCircle, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { BaiHoc } from "@/data/toan-lop-1";

type Diem = { x: number; y: number; p: number };
type NetBut = { diem: Diem[]; doRong: number };
type ChiTietCham = { cau: string; beViet: string; dapAn: string; dung: boolean; nhanXet: string };
type KetQuaCham = { diem: number; soDung: number; tongSo: number; nhanXet: string; chiTiet: ChiTietCham[] };

const MAU_MUC = "#175cd3";
const KHO_LUU = "toanlop1-net-v3";

function khoaBai(id: string) {
  return `${KHO_LUU}:${id}`;
}

function docNet(id: string): NetBut[] {
  try {
    const value = JSON.parse(localStorage.getItem(khoaBai(id)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function TrangBaiViet({ bai, onChamXong }: { bai: BaiHoc; onChamXong: (ketQua: KetQuaCham) => void }) {
  const banVeRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dangViet = useRef(false);
  const netHienTai = useRef<NetBut | null>(null);
  const cacNet = useRef<NetBut[]>([]);
  const dongBoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [soNet, setSoNet] = useState(0);
  const [dangCham, setDangCham] = useState(false);
  const [loi, setLoi] = useState("");
  const [ketQua, setKetQua] = useState<KetQuaCham | null>(null);
  const [hienDapAn, setHienDapAn] = useState(false);

  const veTatCa = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = MAU_MUC;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const net of cacNet.current) {
      if (!net.diem.length) continue;
      context.beginPath();
      context.lineWidth = net.doRong;
      context.moveTo(net.diem[0].x, net.diem[0].y);
      for (const diem of net.diem.slice(1)) context.lineTo(diem.x, diem.y);
      if (net.diem.length === 1) context.lineTo(net.diem[0].x + 0.1, net.diem[0].y + 0.1);
      context.stroke();
    }
  }, []);

  useEffect(() => {
    cacNet.current = docNet(bai.id);
    if (!cacNet.current.length) {
      try {
        const remote = JSON.parse(sessionStorage.getItem("toanlop1-remote-progress") || "[]") as { bai_hoc_id?: string; du_lieu_net_ve?: NetBut[] }[];
        const found = remote.find(item => item.bai_hoc_id === bai.id);
        if (Array.isArray(found?.du_lieu_net_ve)) cacNet.current = found.du_lieu_net_ve;
      } catch {}
    }
    setSoNet(cacNet.current.length);
    setKetQua(null);
    setHienDapAn(false);
    setLoi("");
    requestAnimationFrame(veTatCa);
  }, [bai.id, veTatCa]);

  useEffect(() => {
    const nhanDuLieu = (event: Event) => {
      const detail = (event as CustomEvent).detail as { baiHocId?: string; duLieuNetVe?: NetBut[] };
      if (detail.baiHocId !== bai.id || !Array.isArray(detail.duLieuNetVe) || cacNet.current.length) return;
      cacNet.current = detail.duLieuNetVe;
      localStorage.setItem(khoaBai(bai.id), JSON.stringify(cacNet.current));
      setSoNet(cacNet.current.length);
      veTatCa();
    };
    window.addEventListener("toanlop1:remote-progress", nhanDuLieu);
    return () => window.removeEventListener("toanlop1:remote-progress", nhanDuLieu);
  }, [bai.id, veTatCa]);

  function khiBanVeSanSang() {
    const anh = banVeRef.current;
    const canvas = canvasRef.current;
    if (!anh || !canvas) return;
    canvas.width = anh.naturalWidth;
    canvas.height = anh.naturalHeight;
    veTatCa();
  }

  function toaDo(event: ReactPointerEvent<HTMLCanvasElement>): Diem {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
      p: event.pressure || 0.5,
    };
  }

  function batDau(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dangViet.current = true;
    const canvas = event.currentTarget;
    const diem = toaDo(event);
    const scale = canvas.width / Math.max(canvas.getBoundingClientRect().width, 1);
    netHienTai.current = { diem: [diem], doRong: Math.max(3, Math.min(8, 3.2 * scale * (0.7 + diem.p))) };
  }

  function diChuyen(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dangViet.current || !netHienTai.current) return;
    event.preventDefault();
    const diem = toaDo(event);
    const net = netHienTai.current;
    const truoc = net.diem.at(-1)!;
    net.diem.push(diem);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(truoc.x, truoc.y);
    context.lineTo(diem.x, diem.y);
    context.lineWidth = net.doRong;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = MAU_MUC;
    context.stroke();
  }

  function luuNet(next: NetBut[]) {
    localStorage.setItem(khoaBai(bai.id), JSON.stringify(next));
    setSoNet(next.length);
    if (dongBoTimer.current) clearTimeout(dongBoTimer.current);
    dongBoTimer.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("toanlop1:progress", {
        detail: { baiHocId: bai.id, soDung: ketQua?.soDung || 0, tongSo: ketQua?.tongSo || 1, duLieuNetVe: next, diem: ketQua?.diem || 0, quyen: bai.quyen, trang: bai.trang },
      }));
    }, 700);
  }

  function ketThuc() {
    if (!dangViet.current) return;
    dangViet.current = false;
    if (netHienTai.current?.diem.length) {
      cacNet.current = [...cacNet.current, netHienTai.current];
      luuNet(cacNet.current);
      veTatCa();
    }
    netHienTai.current = null;
  }

  function hoanTac() {
    cacNet.current = cacNet.current.slice(0, -1);
    luuNet(cacNet.current);
    veTatCa();
    setKetQua(null);
  }

  function xoaTatCa() {
    cacNet.current = [];
    luuNet([]);
    veTatCa();
    setKetQua(null);
    setHienDapAn(false);
  }

  async function chamBai() {
    const anh = banVeRef.current;
    const netVe = canvasRef.current;
    if (!anh || !netVe || !cacNet.current.length) {
      setLoi("Bé hãy viết đáp án vào trang bài trước khi chấm nhé.");
      return;
    }
    setDangCham(true);
    setLoi("");
    setHienDapAn(false);
    try {
      const ghep = document.createElement("canvas");
      ghep.width = anh.naturalWidth;
      ghep.height = anh.naturalHeight;
      const context = ghep.getContext("2d");
      if (!context) throw new Error("Không tạo được ảnh bài làm.");
      // Bản đề hiển thị là SVG vector. Canvas này chỉ tạo bản ghép tạm
      // trong bộ nhớ để bộ chấm bài đọc phần mực xanh của bé.
      context.drawImage(anh, 0, 0, ghep.width, ghep.height);
      context.drawImage(netVe, 0, 0, ghep.width, ghep.height);
      const response = await fetch("/api/toanlop1/cham-bai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quyen: bai.quyen, trang: bai.trang, anhBaiLam: ghep.toDataURL("image/jpeg", 0.86) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.loi || "Chưa chấm được bài.");
      const moi = result as KetQuaCham;
      setKetQua(moi);
      onChamXong(moi);
      window.dispatchEvent(new CustomEvent("toanlop1:progress", {
        detail: { baiHocId: bai.id, soDung: moi.soDung, tongSo: Math.max(1, moi.tongSo), duLieuNetVe: cacNet.current, diem: moi.diem, quyen: bai.quyen, trang: bai.trang },
      }));
    } catch (error) {
      setLoi(error instanceof Error ? error.message : "Chưa chấm được bài.");
    } finally {
      setDangCham(false);
    }
  }

  return <section className="tl1-paper-workspace">
    <div className="tl1-paper-toolbar">
      <div><strong>✏️ Viết ngay trên trang bài</strong><span>Nét mực xanh được lưu tự động sau mỗi lần viết.</span></div>
      <div className="tl1-paper-actions">
        <button type="button" onClick={hoanTac} disabled={!soNet || dangCham}><Undo2 /> Hoàn tác</button>
        <button type="button" onClick={xoaTatCa} disabled={!soNet || dangCham}><Trash2 /> Xóa bài làm</button>
        <button type="button" className="primary" onClick={chamBai} disabled={dangCham}>{dangCham ? <LoaderCircle className="tl1-spin" /> : <Check />} {dangCham ? "Đang đọc chữ..." : "Chấm bài"}</button>
      </div>
    </div>
    <div className="tl1-paper" aria-label={`Quyển ${bai.quyen}, trang ${bai.trang}`}>
      <img ref={banVeRef} src={bai.banVeSvg} alt={`${bai.ten}, tuần ${bai.tuan}, quyển ${bai.quyen}`} onLoad={khiBanVeSanSang} draggable={false} />
      <canvas ref={canvasRef} onPointerDown={batDau} onPointerMove={diChuyen} onPointerUp={ketThuc} onPointerCancel={ketThuc} onPointerLeave={ketThuc} />
    </div>
    {loi ? <div className="tl1-grade-error" role="alert">{loi}</div> : null}
    {ketQua ? <section className="tl1-grade-card">
      <div className="tl1-grade-score"><span>{ketQua.diem.toFixed(1)}</span><small>điểm</small></div>
      <div className="tl1-grade-copy"><h2>{ketQua.diem >= 9 ? "Xuất sắc!" : ketQua.diem >= 7 ? "Làm tốt lắm!" : "Cố gắng thêm nhé!"}</h2><p>{ketQua.nhanXet}</p><strong>{ketQua.soDung}/{ketQua.tongSo} đáp án đúng</strong></div>
      <button type="button" onClick={() => setHienDapAn(value => !value)}>{hienDapAn ? <EyeOff /> : <Eye />} {hienDapAn ? "Ẩn đáp án" : "Xem đáp án"}</button>
      {hienDapAn ? <div className="tl1-answer-list">{ketQua.chiTiet.map((item, index) => <article className={item.dung ? "correct" : "wrong"} key={`${item.cau}-${index}`}><b>{item.cau}</b><span>Bé viết: {item.beViet || "Chưa viết"}</span><span>Đáp án: {item.dapAn}</span><small>{item.nhanXet}</small></article>)}</div> : null}
    </section> : null}
  </section>;
}

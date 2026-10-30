"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Download, FileImage, Gauge, ImagePlus, LoaderCircle, Medal, RefreshCw, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import "./dmx.css";

type LoaiBaoCao = "doanh_thu_thuc" | "doanh_thu_quy_doi" | "thi_dua";
type AnhNhap = { id: string; ten: string; src: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string };
type Bang = { tieuDe: string; cot: string[]; dong: { o: string[] }[] };
type KetQua = { tieuDe: string; kyBaoCao: string; donVi: string; tongQuan: { nhan: string; giaTri: string }[]; bang: Bang[]; canhBao: string[] };
type BanLuu = { id: string; loai: LoaiBaoCao; luc: string; ketQua: KetQua };

const LOAI: { id: LoaiBaoCao; ten: string; moTa: string; icon: typeof Gauge; mau: string }[] = [
  { id: "doanh_thu_thuc", ten: "Doanh thu thực", moTa: "Đọc doanh thu, target và tỷ lệ hoàn thành", icon: Gauge, mau: "blue" },
  { id: "doanh_thu_quy_doi", ten: "Doanh thu QĐ", moTa: "Tổng hợp doanh thu quy đổi theo ảnh báo cáo", icon: RefreshCw, mau: "green" },
  { id: "thi_dua", ten: "Thi đua", moTa: "Lọc xếp hạng, điểm và kết quả thi đua", icon: Medal, mau: "orange" },
];

function resizeImage(file: File) {
  return new Promise<AnhNhap>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Ảnh không hợp lệ."));
      image.onload = () => {
        const max = 1800; const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d"); if (!context) return reject(new Error("Không xử lý được ảnh."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL("image/jpeg", .86);
        resolve({ id: crypto.randomUUID(), ten: file.name || `anh-${Date.now()}.jpg`, src, mimeType: "image/jpeg", data: src.split(",")[1] });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

export default function DmxPage() {
  const [loai, setLoai] = useState<LoaiBaoCao>("doanh_thu_thuc");
  const [anh, setAnh] = useState<AnhNhap[]>([]);
  const [ketQua, setKetQua] = useState<KetQua | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [loi, setLoi] = useState("");
  const [lichSu, setLichSu] = useState<BanLuu[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/dmx-sw.js", { scope: "/dmx" });
    try { setLichSu(JSON.parse(localStorage.getItem("dmx-ket-qua-v1") || "[]")); } catch { setLichSu([]); }
  }, []);

  const loaiDangChon = useMemo(() => LOAI.find(item => item.id === loai)!, [loai]);

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 5 - anh.length);
    event.target.value = ""; setLoi("");
    try {
      const converted = await Promise.all(files.map(resizeImage));
      setAnh(current => [...current, ...converted].slice(0, 5)); setKetQua(null);
    } catch (error) { setLoi(error instanceof Error ? error.message : "Không đọc được ảnh."); }
  }

  async function docAnh() {
    if (!anh.length) return setLoi("Hãy chọn hoặc chụp ít nhất một ảnh báo cáo.");
    setDangDoc(true); setLoi(""); setKetQua(null);
    try {
      const response = await fetch("/api/dmx/doc-anh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loai, anh: anh.map(item => ({ mimeType: item.mimeType, data: item.data })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.loi || "Chưa đọc được ảnh.");
      setKetQua(result as KetQua);
    } catch (error) { setLoi(error instanceof Error ? error.message : "Chưa đọc được ảnh."); }
    setDangDoc(false);
  }

  function updateCell(bangIndex: number, rowIndex: number, cellIndex: number, value: string) {
    setKetQua(current => current ? { ...current, bang: current.bang.map((bang, bi) => bi !== bangIndex ? bang : { ...bang, dong: bang.dong.map((row, ri) => ri !== rowIndex ? row : { o: row.o.map((cell, ci) => ci === cellIndex ? value : cell) }) }) } : current);
  }

  function saveResult() {
    if (!ketQua) return;
    const next = [{ id: crypto.randomUUID(), loai, luc: new Date().toISOString(), ketQua }, ...lichSu].slice(0, 20);
    setLichSu(next); localStorage.setItem("dmx-ket-qua-v1", JSON.stringify(next));
  }

  function exportCsv() {
    if (!ketQua) return;
    const lines: string[] = [csvCell(ketQua.tieuDe), csvCell(ketQua.kyBaoCao), ""];
    ketQua.bang.forEach(bang => { lines.push(csvCell(bang.tieuDe), bang.cot.map(csvCell).join(","), ...bang.dong.map(row => row.o.map(csvCell).join(",")), ""); });
    const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `dmx-${loai}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <main className="dmx-app">
    <header className="dmx-header"><div className="dmx-brand"><span><Sparkles /></span><div><strong>SỐ LIỆU ĐMX</strong><small>Đọc ảnh và tổng hợp bằng Gemini</small></div></div><div className="dmx-ai"><i />Gemini AI</div></header>

    <section className="dmx-hero"><span>TỔNG HỢP BÁO CÁO</span><h1>Biến ảnh số liệu thành bảng trong vài giây</h1><p>Chụp màn hình hoặc chọn ảnh rõ nét. Ứng dụng nhận dạng chữ, con số, tiêu đề và sắp xếp lại thành bảng để kiểm tra.</p></section>

    <nav className="dmx-types" aria-label="Loại số liệu">{LOAI.map(item => { const Icon = item.icon; return <button key={item.id} className={`${item.mau} ${loai === item.id ? "active" : ""}`} onClick={() => { setLoai(item.id); setKetQua(null); }}><span><Icon /></span><div><strong>{item.ten}</strong><small>{item.moTa}</small></div>{loai === item.id && <CheckCircle2 className="check" />}</button>; })}</nav>

    <section className="dmx-workspace">
      <div className="dmx-section-title"><div><span>BƯỚC 1</span><h2>Nhập ảnh {loaiDangChon.ten.toLowerCase()}</h2></div><small>{anh.length}/5 ảnh</small></div>
      <div className="dmx-upload" onClick={() => fileRef.current?.click()}><UploadCloud /><strong>Chạm để chọn ảnh báo cáo</strong><span>Chấp nhận JPG, PNG, WebP · tối đa 5 ảnh</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} /></div>
      <div className="dmx-capture-row"><label><ImagePlus />Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} /></label><label><Camera />Chụp trực tiếp<input type="file" accept="image/*" capture="environment" onChange={addFiles} /></label></div>
      {!!anh.length && <div className="dmx-previews">{anh.map((item, index) => <article key={item.id}><img src={item.src} alt={item.ten} /><span>{index + 1}</span><button onClick={() => setAnh(current => current.filter(image => image.id !== item.id))} aria-label={`Xóa ${item.ten}`}><X /></button><small>{item.ten}</small></article>)}</div>}
      <div className="dmx-how"><FileImage /><p><strong>Ứng dụng đọc ảnh thế nào?</strong> Ảnh được thu nhỏ vừa đủ rõ rồi gửi bảo mật đến API trên máy chủ. Gemini nhìn ảnh, nhận dạng chữ và số, sau đó trả về dữ liệu JSON để dựng thành bảng. Khóa API không được gửi xuống thiết bị.</p></div>
      {loi && <div className="dmx-error" role="alert">{loi}</div>}
      <button className="dmx-read" disabled={!anh.length || dangDoc} onClick={() => void docAnh()}>{dangDoc ? <><LoaderCircle className="spin" />Gemini đang đọc số liệu…</> : <><Sparkles />Đọc ảnh và tạo bảng</>}</button>
    </section>

    {ketQua && <section className="dmx-results">
      <div className="dmx-result-head"><div><span>KẾT QUẢ NHẬN DẠNG</span><h2>{ketQua.tieuDe}</h2><p>{[ketQua.kyBaoCao, ketQua.donVi].filter(Boolean).join(" · ")}</p></div><div><button onClick={saveResult}><CheckCircle2 />Lưu</button><button onClick={exportCsv}><Download />CSV</button></div></div>
      {!!ketQua.tongQuan.length && <div className="dmx-summary">{ketQua.tongQuan.map((item, index) => <article key={`${item.nhan}-${index}`}><small>{item.nhan}</small><strong>{item.giaTri}</strong></article>)}</div>}
      {ketQua.bang.map((bang, bi) => <article className="dmx-table-card" key={`${bang.tieuDe}-${bi}`}><h3>{bang.tieuDe}</h3><div><table><thead><tr>{bang.cot.map((cot, ci) => <th key={`${cot}-${ci}`}>{cot}</th>)}</tr></thead><tbody>{bang.dong.map((row, ri) => <tr key={ri}>{row.o.map((cell, ci) => <td key={ci}><input value={cell} onChange={event => updateCell(bi, ri, ci, event.target.value)} aria-label={`${bang.cot[ci] || "Ô"} dòng ${ri + 1}`} /></td>)}</tr>)}</tbody></table></div></article>)}
      {!!ketQua.canhBao.length && <div className="dmx-warnings"><strong>Cần kiểm tra lại</strong>{ketQua.canhBao.map((item, index) => <p key={index}>• {item}</p>)}</div>}
    </section>}

    {!!lichSu.length && <section className="dmx-history"><h2>Kết quả đã lưu trên thiết bị</h2><div>{lichSu.map(item => <button key={item.id} onClick={() => { setLoai(item.loai); setKetQua(item.ketQua); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }}><span>{LOAI.find(type => type.id === item.loai)?.ten}</span><strong>{item.ketQua.tieuDe}</strong><small>{new Date(item.luc).toLocaleString("vi-VN")}</small></button>)}</div><button className="dmx-clear" onClick={() => { setLichSu([]); localStorage.removeItem("dmx-ket-qua-v1"); }}><Trash2 />Xóa lịch sử</button></section>}
  </main>;
}

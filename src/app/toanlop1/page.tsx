"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, LockKeyhole, RotateCcw, Sparkles, Star, Trophy } from "lucide-react";
import { BaiHoc, CauHoi, cacTuanHoc } from "@/data/toan-lop-1";
import { TaiKhoanToan } from "@/components/toan-lop-1/tai-khoan-toan";
import "./toanlop1.css";

type KetQua = Record<string, { traLoi: string; dung: boolean }>;
const KHOA_LUU = "toanlop1-tien-do-v1";

function chuanHoa(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "").replace(/，/g, ",");
}

function TheCauHoi({ cauHoi, thuTu, ketQua, onTraLoi }: { cauHoi: CauHoi; thuTu: number; ketQua?: { traLoi: string; dung: boolean }; onTraLoi: (giaTri: string) => void }) {
  const [giaTri, setGiaTri] = useState(ketQua?.traLoi ?? "");
  useEffect(() => setGiaTri(ketQua?.traLoi ?? ""), [cauHoi.id, ketQua?.traLoi]);
  const gui = (value = giaTri) => {
    if (!value.trim()) return;
    onTraLoi(value);
  };

  return (
    <article className={`tl1-question ${ketQua ? (ketQua.dung ? "is-correct" : "is-wrong") : ""}`}>
      <div className="tl1-question-number">{thuTu}</div>
      <div className="tl1-question-body">
        <h3>{cauHoi.deBai}</h3>
        {cauHoi.goiY ? <p className="tl1-hint">💡 {cauHoi.goiY}</p> : null}
        {cauHoi.luaChon ? (
          <div className="tl1-options">
            {cauHoi.luaChon.map((luaChon) => (
              <button key={luaChon} type="button" className={ketQua?.traLoi === luaChon ? "selected" : ""} onClick={() => { setGiaTri(luaChon); gui(luaChon); }}>
                {luaChon}
              </button>
            ))}
          </div>
        ) : (
          <div className="tl1-input-row">
            <input value={giaTri} inputMode={cauHoi.loai === "nhap-so" ? "numeric" : "text"} placeholder="Nhập đáp án" onChange={(event) => setGiaTri(event.target.value)} onKeyDown={(event) => event.key === "Enter" && gui()} />
            <button type="button" onClick={() => gui()}>Kiểm tra</button>
          </div>
        )}
        {ketQua ? <div className={`tl1-feedback ${ketQua.dung ? "correct" : "wrong"}`}>{ketQua.dung ? <><Check size={18} /> Chính xác, giỏi lắm!</> : <>Chưa đúng, thử lại nhé!</>}</div> : null}
      </div>
    </article>
  );
}

export default function ToanLop1Page() {
  const [baiDangHoc, setBaiDangHoc] = useState<BaiHoc | null>(null);
  const [ketQua, setKetQua] = useState<KetQua>({});
  const [diemDaLuu, setDiemDaLuu] = useState<Record<string, number>>({});

  useEffect(() => {
    try { setDiemDaLuu(JSON.parse(localStorage.getItem(KHOA_LUU) || "{}")); } catch { setDiemDaLuu({}); }
  }, []);

  const soDung = useMemo(() => Object.values(ketQua).filter((item) => item.dung).length, [ketQua]);
  const tongSo = baiDangHoc?.cauHoi.length ?? 0;

  function traLoi(cauHoi: CauHoi, giaTri: string) {
    const dung = chuanHoa(giaTri) === chuanHoa(cauHoi.dapAn);
    const moi = { ...ketQua, [cauHoi.id]: { traLoi: giaTri, dung } };
    setKetQua(moi);
    if (baiDangHoc) {
      const score = Object.values(moi).filter((item) => item.dung).length;
      const daLuuMoi = { ...diemDaLuu, [baiDangHoc.id]: score };
      setDiemDaLuu(daLuuMoi);
      localStorage.setItem(KHOA_LUU, JSON.stringify(daLuuMoi));
      window.dispatchEvent(new CustomEvent("toanlop1:progress", { detail: { baiHocId: baiDangHoc.id, soDung: score, tongSo } }));
    }
  }

  function moBai(bai: BaiHoc) {
    setBaiDangHoc(bai);
    setKetQua({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (baiDangHoc) {
    const hoanThanh = tongSo > 0 && soDung === tongSo;
    return (
      <main className="tl1-shell">
        <TaiKhoanToan />
        <header className="tl1-lesson-header">
          <button className="tl1-back" type="button" onClick={() => setBaiDangHoc(null)}><ArrowLeft size={20} /> Danh sách bài</button>
          <div><span>Tuần 1</span><h1>{baiDangHoc.ten}</h1><p>{baiDangHoc.moTa}</p></div>
          <div className="tl1-score"><Star size={22} fill="currentColor" /> {soDung}/{tongSo}</div>
        </header>
        <section className="tl1-progress"><div style={{ width: `${tongSo ? (soDung / tongSo) * 100 : 0}%` }} /></section>
        <section className="tl1-question-list">
          {baiDangHoc.cauHoi.map((cauHoi, index) => <TheCauHoi key={cauHoi.id} cauHoi={cauHoi} thuTu={index + 1} ketQua={ketQua[cauHoi.id]} onTraLoi={(value) => traLoi(cauHoi, value)} />)}
        </section>
        <section className={`tl1-finish ${hoanThanh ? "show" : ""}`}>
          <Trophy size={50} /><h2>Hoàn thành xuất sắc!</h2><p>Anh bạn nhỏ đã trả lời đúng toàn bộ {tongSo} câu.</p>
          <button type="button" onClick={() => setKetQua({})}><RotateCcw size={18} /> Làm lại</button>
        </section>
      </main>
    );
  }

  return (
    <main className="tl1-shell">
      <TaiKhoanToan />
      <section className="tl1-hero">
        <div className="tl1-hero-copy"><span className="tl1-badge"><Sparkles size={16} /> Học vui mỗi ngày</span><h1>Toán lớp 1</h1><p>Chọn một bài học, trả lời từng câu và nhận sao ngay khi làm đúng.</p><div className="tl1-hero-stats"><div><strong>9</strong><span>Tuần học</span></div><div><strong>25</strong><span>Câu đã mở</span></div><div><strong>{Object.values(diemDaLuu).reduce((a, b) => a + b, 0)}</strong><span>Sao đã nhận</span></div></div></div>
        <div className="tl1-mascot" aria-hidden="true">🦉<span>1 + 1 = 2</span></div>
      </section>
      <section className="tl1-title-row"><div><span>Lộ trình học</span><h2>Chọn tuần để bắt đầu</h2></div><BookOpen size={30} /></section>
      <section className="tl1-week-grid">
        {cacTuanHoc.map((tuan) => (
          <article className={`tl1-week ${!tuan.moKhoa ? "locked" : ""}`} key={tuan.so}>
            <div className="tl1-week-top"><span>Tuần</span><strong>{tuan.so}</strong>{!tuan.moKhoa ? <LockKeyhole size={20} /> : <Star size={20} fill="currentColor" />}</div>
            <h3>{tuan.moTa}</h3>
            {tuan.moKhoa ? <div className="tl1-lessons">{tuan.baiHoc.map((bai) => <button type="button" key={bai.id} onClick={() => moBai(bai)}><span><b>{bai.ten}</b><small>{bai.moTa}</small></span><span className="tl1-lesson-score">{diemDaLuu[bai.id] ?? 0}/{bai.cauHoi.length}</span><ChevronRight size={19} /></button>)}</div> : <div className="tl1-coming">Sắp mở khóa</div>}
          </article>
        ))}
      </section>
    </main>
  );
}

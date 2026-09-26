"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Download, Map, PenTool, Rocket, Star } from "lucide-react";
import { cacTuanHoc, tatCaBaiHoc, type BaiHoc } from "@/data/toan-lop-1";
import { TaiKhoanToan } from "@/components/toan-lop-1/tai-khoan-toan";
import { TrangBaiViet } from "@/components/toan-lop-1/trang-bai-viet";
import { useToanLop1Pwa } from "@/components/toan-lop-1/use-toan-lop-1-pwa";
import "./toanlop1.css";
import "./toanlop1-workbook.css";

type DiemDaLuu = Record<string, { diem: number; soDung: number; tongSo: number }>;
const KHO_DIEM = "toanlop1-diem-v3";

export default function ToanLop1Page() {
  const pwa = useToanLop1Pwa();
  const [quyen, setQuyen] = useState<1 | 2>(1);
  const [baiDangHoc, setBaiDangHoc] = useState<BaiHoc | null>(null);
  const [diemDaLuu, setDiemDaLuu] = useState<DiemDaLuu>({});

  useEffect(() => {
    try { setDiemDaLuu(JSON.parse(localStorage.getItem(KHO_DIEM) || "{}")); } catch { setDiemDaLuu({}); }
  }, []);

  const cacTuanTrongQuyen = useMemo(() => cacTuanHoc.filter(tuan => tuan.quyen === quyen), [quyen]);
  const viTriBai = baiDangHoc ? tatCaBaiHoc.findIndex(bai => bai.id === baiDangHoc.id) : -1;
  const soBaiDaLam = Object.keys(diemDaLuu).length;
  const diemTrungBinh = soBaiDaLam ? Object.values(diemDaLuu).reduce((tong, item) => tong + item.diem, 0) / soBaiDaLam : 0;

  function moBai(bai: BaiHoc) {
    sessionStorage.setItem("toanlop1-scroll", String(window.scrollY));
    setBaiDangHoc(bai);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function quayLai() {
    setBaiDangHoc(null);
    setTimeout(() => window.scrollTo({ top: Number(sessionStorage.getItem("toanlop1-scroll") || 0), behavior: "instant" }), 0);
  }

  function luuKetQua(result: { diem: number; soDung: number; tongSo: number }) {
    if (!baiDangHoc) return;
    const next = { ...diemDaLuu, [baiDangHoc.id]: result };
    setDiemDaLuu(next);
    localStorage.setItem(KHO_DIEM, JSON.stringify(next));
  }

  if (baiDangHoc) {
    const diem = diemDaLuu[baiDangHoc.id];
    return <main className="tl1-app">
      <header className="tl1-kid-header"><div className="tl1-brand"><span>✍️</span><div><b>Vở Toán lớp 1</b><small>Viết trực tiếp bằng Apple Pencil</small></div></div><div className="tl1-header-stars"><Star size={17} fill="currentColor" /> {diem ? `${diem.diem.toFixed(1)} điểm` : "Chưa chấm"}</div></header>
      <div className="tl1-shell">
        <TaiKhoanToan />
        {pwa.coBanMoi ? <div className="tl1-pwa-update">Có phiên bản bài học mới.<button onClick={pwa.capNhat}>Cập nhật</button></div> : null}
        <header className="tl1-lesson-header">
          <button className="tl1-back" type="button" onClick={quayLai}><ArrowLeft size={20} /> Danh sách bài</button>
          <div><span>Quyển {baiDangHoc.quyen} · Tuần {baiDangHoc.tuanTrongQuyen} · Trang {baiDangHoc.trang}</span><h1>{baiDangHoc.ten}</h1><p>Trang bài được dựng lại bằng nét vector theo đúng tài liệu gốc.</p></div>
          <div className="tl1-score"><PenTool size={21} /> Tự lưu</div>
        </header>
        <TrangBaiViet bai={baiDangHoc} onChamXong={luuKetQua} />
        <nav className="tl1-lesson-nav">
          <button disabled={viTriBai <= 0} onClick={() => viTriBai > 0 && moBai(tatCaBaiHoc[viTriBai - 1])}>← Trang trước</button>
          <span>{viTriBai + 1}/{tatCaBaiHoc.length}</span>
          <button disabled={viTriBai >= tatCaBaiHoc.length - 1} onClick={() => viTriBai < tatCaBaiHoc.length - 1 && moBai(tatCaBaiHoc[viTriBai + 1])}>Trang sau →</button>
        </nav>
      </div>
    </main>;
  }

  return <main className="tl1-app">
    <header className="tl1-kid-header">
      <div className="tl1-brand"><span>✍️</span><div><b>Vở Toán lớp 1</b><small>Học theo đúng hai quyển bài tập</small></div></div>
      <div className="tl1-header-actions"><span>📚 2 quyển · 90 trang học</span>{pwa.coTheCai && !pwa.daCai ? <button onClick={() => void pwa.caiDat()}><Download size={17} /> Cài ứng dụng</button> : null}</div>
    </header>
    <div className="tl1-shell">
      <TaiKhoanToan />
      {pwa.coBanMoi ? <div className="tl1-pwa-update">Có phiên bản bài học mới.<button onClick={pwa.capNhat}>Cập nhật</button></div> : null}
      <section className="tl1-hero">
        <div className="tl1-floating tl1-float-one">✦</div><div className="tl1-floating tl1-float-two">●</div>
        <div className="tl1-hero-copy"><span className="tl1-badge"><Rocket size={16} /> Vở bài tập tương tác</span><h1>Viết trên đề thật,<br/><em>chấm bài thông minh</em></h1><p>Bé dùng Apple Pencil hoặc ngón tay viết ngay vào ô trống như làm trên giấy. Mọi nét viết được lưu tự động.</p><div className="tl1-hero-actions"><a href="#lo-trinh"><Map size={19}/> Chọn bài để làm</a><span><Check size={19}/> {soBaiDaLam} bài đã chấm · {diemTrungBinh.toFixed(1)} điểm TB</span></div></div>
        <div className="tl1-mascot" aria-hidden="true"><div className="tl1-planet">➕</div><div className="tl1-owl">🦉</div><span>Mình cùng viết nhé!</span></div>
      </section>

      <section id="lo-trinh" className="tl1-course-heading">
        <div><span>📖 Nội dung nguyên bản</span><h2>Chọn quyển và tuần học</h2><p>Đủ 90 trang được dựng lại bằng vector sắc nét, đúng câu hỏi và hình minh họa trong hai quyển.</p></div>
        <div className="tl1-book-tabs"><button className={quyen === 1 ? "active" : ""} onClick={() => setQuyen(1)}>Quyển 1<small>Tuần 1–9</small></button><button className={quyen === 2 ? "active" : ""} onClick={() => setQuyen(2)}>Quyển 2<small>Tuần 10–18</small></button></div>
      </section>

      <section className="tl1-week-grid">
        {cacTuanTrongQuyen.map(tuan => <article className="tl1-week" key={tuan.so}>
          <div className="tl1-week-top"><span>Tuần</span><strong>{tuan.so}</strong><BookOpen size={20} /></div>
          <h3>{tuan.moTa}</h3>
          <div className="tl1-lessons">{tuan.baiHoc.map(bai => {
            const daCham = diemDaLuu[bai.id];
            return <button type="button" key={bai.id} onClick={() => moBai(bai)}><span><b>{bai.ten}</b><small>Trang {bai.trang} · Viết trực tiếp</small></span><span className="tl1-lesson-score">{daCham ? `${daCham.diem.toFixed(1)}` : "—"}</span><ChevronRight size={19} /></button>;
          })}</div>
        </article>)}
      </section>
    </div>
  </main>;
}

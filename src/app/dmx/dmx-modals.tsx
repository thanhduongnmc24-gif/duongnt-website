"use client";

import { useState } from "react";
import { Camera, Image as ImageIcon, Settings, Trophy, Users, X } from "lucide-react";
import {
  BoLocThiDua,
  DoanhThuNhanVienItem,
  DongThiDua,
  huyChuongHang,
  NhanVienQuanLy,
} from "./dmx-types";

function chuoiSoVN(so: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(so) ? so : 0);
}

function chuoiSoGon(so: number): string {
  const val = Number.isFinite(so) ? so : 0;
  if (Math.abs(Math.round(val) - val) < 0.005) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(val));
  }
  return chuoiSoVN(val);
}

export type DongXepHangNhanVienNganh = {
  maNV: string;
  hoTen: string;
  thucHien: number;
  targetCaNhan: number;
  phanTramHT: number;
  chenhLech: number;
};

export type MonThiDuaCuaNhanVien = {
  khoaNganh: string;
  tenNganhHang: string;
  loaiChiTieu: string;
  thucHien: number;
  targetCaNhan: number;
  phanTramHT: number;
  phanTramSieuThi: number;
  conLai: number;
  daDat: boolean;
};

type PropsChiTietNganhHang = {
  dong: DongThiDua;
  donVi: string;
  ngayHienThi: string;
  danhSachXepHang: DongXepHangNhanVienNganh[];
  onClose: () => void;
  onBamQuetAnhNV: () => void;
  onMoChiaTargetTrongCaiDat: () => void;
  onCapNhatThucHienNV: (maNV: string, giaTri: number) => void;
};

export function ModalChiTietNganhHang({
  dong,
  donVi,
  ngayHienThi,
  danhSachXepHang,
  onClose,
  onBamQuetAnhNV,
  onMoChiaTargetTrongCaiDat,
  onCapNhatThucHienNV,
}: PropsChiTietNganhHang) {
  const [maNVDangNhapTay, setMaNVDangNhapTay] = useState<string | null>(null);
  const [giaTriNhapTay, setGiaTriNhapTay] = useState("");

  const soNV = danhSachXepHang.length;
  const targetMoiNV = soNV > 0 ? dong.target / soNV : 0;
  const tongThucHienNV = danhSachXepHang.reduce((s, r) => s + r.thucHien, 0);
  const tongTargetNV = dong.target;
  const tyLeChung = tongTargetNV > 0 ? Math.round((tongThucHienNV / tongTargetNV) * 100) : 0;

  function xuatAnhBangNganhHang() {
    if (!danhSachXepHang.length) return;
    const rong = 760;
    const le = 22;
    const caoHeader = 78;
    const caoTieuDeCot = 34;
    const caoDong = 42;
    const caoChan = 52;
    const cao = le * 2 + caoHeader + caoTieuDeCot + danhSachXepHang.length * caoDong + caoChan;

    const canvas = document.createElement("canvas");
    canvas.width = rong * 2;
    canvas.height = cao * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rong, cao);

    // Header
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11.5px Inter, Arial, sans-serif";
    ctx.fillText(donVi || "ĐIỆN MÁY XANH", le, le + 18);

    ctx.fillStyle = "#0f172a";
    ctx.font = "800 18px Inter, Arial, sans-serif";
    ctx.fillText(dong.tenNganhHang, le, le + 42);

    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px Inter, Arial, sans-serif";
    ctx.fillText(`Ngày ${ngayHienThi} • Chia đều ${soNV} NV (${chuoiSoGon(targetMoiNV)}/NV)`, rong - le, le + 30);

    let y = le + caoHeader;
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px Inter, Arial, sans-serif";
    ctx.fillText("#", le + 10, y + 20);
    ctx.fillText("NHÂN VIÊN", le + 46, y + 20);
    ctx.textAlign = "right";
    ctx.fillText("THỰC HIỆN", rong - le - 190, y + 20);
    ctx.fillText("CÒN / VƯỢT", rong - le - 86, y + 20);
    ctx.textAlign = "center";
    ctx.fillText("% HT", rong - le - 32, y + 20);

    y += caoTieuDeCot;

    danhSachXepHang.forEach((item, idx) => {
      const hang = idx + 1;
      const dat = item.phanTramHT >= 99.995;
      const kha = item.phanTramHT >= 80;
      const bgTrack = dat ? "#f0fdf4" : kha ? "#eff6ff" : "#fefce8";
      const bgFill = dat ? "#dcfce7" : kha ? "#dbeafe" : "#fef08a";

      // Khung dòng
      ctx.fillStyle = bgTrack;
      ctx.beginPath();
      ctx.roundRect(le, y + 3, rong - le * 2, caoDong - 6, 8);
      ctx.fill();

      // Thanh tiến độ nền
      const pctW = Math.min(1, Math.max(0.03, item.phanTramHT / 100)) * (rong - le * 2);
      ctx.fillStyle = bgFill;
      ctx.beginPath();
      ctx.roundRect(le, y + 3, pctW, caoDong - 6, 8);
      ctx.fill();

      // Thứ hạng / Huy chương
      ctx.textAlign = "center";
      ctx.fillStyle = "#475569";
      ctx.font = "bold 13px Inter, Arial, sans-serif";
      ctx.fillText(huyChuongHang(hang), le + 20, y + 26);

      // Tên & Mã NV
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 13px Inter, Arial, sans-serif";
      ctx.fillText(`${item.hoTen} - ${item.maNV}`, le + 46, y + 26);

      // Thực hiện / Target
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 13px Inter, Arial, sans-serif";
      ctx.fillText(`${chuoiSoGon(item.thucHien)} / ${chuoiSoGon(item.targetCaNhan)}`, rong - le - 190, y + 26);

      // Còn / Vượt
      const vuot = item.thucHien - item.targetCaNhan;
      ctx.fillStyle = vuot >= -0.005 ? "#15803d" : "#475569";
      ctx.font = "600 12px Inter, Arial, sans-serif";
      ctx.fillText(
        vuot >= -0.005 ? `Vượt +${chuoiSoGon(Math.max(0, vuot))}` : `Còn ${chuoiSoGon(Math.abs(vuot))}`,
        rong - le - 86,
        y + 26
      );

      // Badge % HT
      const badgeBg = dat ? "#dcfce7" : kha ? "#dbeafe" : "#fef3c7";
      const badgeFg = dat ? "#15803d" : kha ? "#1d4ed8" : "#b45309";
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(rong - le - 64, y + 9, 58, 24, 6);
      ctx.fill();
      ctx.fillStyle = badgeFg;
      ctx.font = "800 12px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(item.phanTramHT)}%`, rong - le - 35, y + 25);

      y += caoDong;
    });

    // Dòng tổng cộng
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(le, y + 8, rong - le * 2, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 14px Inter, Arial, sans-serif";
    ctx.fillText(
      `TỔNG CỘNG:  ${chuoiSoGon(tongThucHienNV)} / ${chuoiSoGon(tongTargetNV)}   •   ${soNV} nhân viên`,
      le,
      y + 34
    );
    ctx.textAlign = "right";
    ctx.fillStyle = "#1d4ed8";
    ctx.fillText(`Tỷ lệ HT: ${tyLeChung}%`, rong - le, y + 34);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ThiDuaNV-${dong.tenNganhHang.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="dmx-modal-backdrop" onClick={onClose}>
      <div className="dmx-modal dmx-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="dmx-cat-detail-header">
          <div className="dmx-cat-detail-title-wrap">
            <span className="dmx-cat-trophy">
              <Trophy size={20} />
            </span>
            <div>
              <small>{donVi || "ĐIỆN MÁY XANH"} • Ngày {ngayHienThi}</small>
              <h3>{dong.tenNganhHang}</h3>
            </div>
          </div>
          <button className="dmx-close-circle" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Thanh công cụ: Thông tin chia Target + Nút Nhập ảnh thực hiện NV + Nút Chia Target trong Cài đặt */}
        <div className="dmx-cat-detail-toolbar">
          <div className="dmx-cat-target-info">
            <span>
              Target ST: <b>{chuoiSoGon(dong.target)}</b> ({dong.loaiChiTieu})
            </span>
            <span>•</span>
            <span>
              Chia đều <b>{soNV}</b> NV:{" "}
              <b className="text-blue">{soNV > 0 ? chuoiSoGon(targetMoiNV) : "--"}/NV</b>
            </span>
          </div>

          <div className="dmx-cat-detail-actions">
            <button type="button" className="dmx-btn-scan-sm" onClick={onBamQuetAnhNV}>
              <Camera size={14} />
              <span>Nhập ảnh thực hiện NV</span>
            </button>
            <button type="button" className="dmx-btn-outline-sm" onClick={onMoChiaTargetTrongCaiDat}>
              <Settings size={14} />
              <span>Chia Target ({soNV} NV)</span>
            </button>
            {soNV > 0 && (
              <button type="button" className="dmx-btn-outline-sm" onClick={xuatAnhBangNganhHang}>
                <ImageIcon size={14} />
                <span>Xuất ảnh</span>
              </button>
            )}
          </div>
        </div>

        <div className="dmx-modal-body">
          {!soNV ? (
            <div className="dmx-empty-subbox">
              <Users size={34} />
              <strong>Chưa chọn nhân viên nhận Target cho mặt hàng này</strong>
              <p>
                Hãy bấm nút <b>&ldquo;Chia Target&rdquo;</b> để tích chọn các nhân viên phụ trách mặt hàng{" "}
                <b>{dong.tenNganhHang}</b>, hoặc bấm <b>&ldquo;Nhập ảnh thực hiện NV&rdquo;</b> để đọc tự động từ ảnh.
              </p>
              <button type="button" className="dmx-scan-primary" onClick={onMoChiaTargetTrongCaiDat}>
                <Settings size={15} />
                <span>Mở Cài đặt Chia Target cho mặt hàng này</span>
              </button>
            </div>
          ) : (
            <div className="dmx-emp-rank-board">
              <div className="dmx-emp-rank-head">
                <span className="col-rank">#</span>
                <span className="col-name">NHÂN VIÊN (Chạm dòng để nhập/sửa TH)</span>
                <span className="col-actual">THỰC HIỆN</span>
                <span className="col-diff">CÒN / VƯỢT</span>
                <span className="col-pct">% HT</span>
              </div>

              <div className="dmx-emp-rank-list">
                {danhSachXepHang.map((item, idx) => {
                  const hang = idx + 1;
                  const dat = item.phanTramHT >= 99.995;
                  const kha = item.phanTramHT >= 80;
                  const toneClass = dat ? "tone-green" : kha ? "tone-blue" : "tone-amber";
                  const widthPct = Math.min(100, Math.max(4, item.phanTramHT));
                  const vuot = item.thucHien - item.targetCaNhan;
                  const dangSua = maNVDangNhapTay === item.maNV;

                  return (
                    <div
                      key={item.maNV}
                      className={`dmx-emp-rank-row ${toneClass}`}
                      onClick={() => {
                        if (!dangSua) {
                          setMaNVDangNhapTay(item.maNV);
                          setGiaTriNhapTay(item.thucHien > 0 ? String(item.thucHien) : "");
                        }
                      }}
                    >
                      <div className="dmx-emp-rank-bar" style={{ width: `${widthPct}%` }} />
                      <div className="dmx-emp-rank-content">
                        <span className="col-rank">{huyChuongHang(hang)}</span>
                        <span className="col-name">
                          <strong>{item.hoTen}</strong> - <small>{item.maNV}</small>
                        </span>

                        {dangSua ? (
                          <span className="col-edit-inline" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              autoFocus
                              placeholder="Thực hiện..."
                              value={giaTriNhapTay}
                              onChange={e => setGiaTriNhapTay(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  onCapNhatThucHienNV(
                                    item.maNV,
                                    Number(giaTriNhapTay.replace(",", ".")) || 0
                                  );
                                  setMaNVDangNhapTay(null);
                                } else if (e.key === "Escape") {
                                  setMaNVDangNhapTay(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onCapNhatThucHienNV(
                                  item.maNV,
                                  Number(giaTriNhapTay.replace(",", ".")) || 0
                                );
                                setMaNVDangNhapTay(null);
                              }}
                            >
                              Lưu
                            </button>
                          </span>
                        ) : (
                          <>
                            <span className="col-actual">
                              <b>{chuoiSoGon(item.thucHien)}</b> <small>/ {chuoiSoGon(item.targetCaNhan)}</small>
                            </span>
                            <span className={`col-diff ${vuot >= -0.005 ? "diff-pass" : "diff-rem"}`}>
                              {vuot >= -0.005
                                ? `Vượt +${chuoiSoGon(Math.max(0, vuot))}`
                                : `Còn ${chuoiSoGon(Math.abs(vuot))}`}
                            </span>
                            <span className="col-pct">
                              <em className={`dmx-rank-badge ${toneClass}`}>
                                {Math.round(item.phanTramHT)}%
                              </em>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="dmx-emp-rank-footer">
                <div>
                  <span>TỔNG CỘNG: </span>
                  <strong>
                    {chuoiSoGon(tongThucHienNV)} / {chuoiSoGon(tongTargetNV)}
                  </strong>
                  <small> • {soNV} nhân viên</small>
                </div>
                <div className="dmx-emp-rank-footer-right">
                  <span>Tỷ lệ HT:</span>
                  <strong className="badge">{tyLeChung}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type PropsChiTietNhanVien = {
  nhanVien: NhanVienQuanLy;
  ngayHienThi: string;
  soNgayQua: number;
  tongNgayThang: number;
  phanTramTienDoThang: number;
  doanhThuCaNhan?: DoanhThuNhanVienItem;
  danhSachMon: MonThiDuaCuaNhanVien[];
  onClose: () => void;
};

export function ModalChiTietNhanVien({
  nhanVien,
  ngayHienThi,
  soNgayQua,
  tongNgayThang,
  phanTramTienDoThang,
  doanhThuCaNhan,
  danhSachMon,
  onClose,
}: PropsChiTietNhanVien) {
  const [boLocMon, setBoLocMon] = useState<BoLocThiDua>("tatCa");

  const tongSoMon = danhSachMon.length;
  const soMonDat = danhSachMon.filter(m => m.daDat).length;
  const soMonChuaDat = tongSoMon - soMonDat;
  const tyLeMonDat = tongSoMon > 0 ? Math.round((soMonDat / tongSoMon) * 100) : 0;
  const phanTramHTTrungBinh =
    tongSoMon > 0 ? danhSachMon.reduce((s, m) => s + m.phanTramHT, 0) / tongSoMon : 0;

  const danhSachMonLoc = danhSachMon.filter(m => {
    if (boLocMon === "daDat") return m.daDat;
    if (boLocMon === "chuaDat") return !m.daDat;
    return true;
  });

  const dtQD = doanhThuCaNhan?.doanhThuQD || 0;
  const dtThuc = doanhThuCaNhan?.doanhThuThuc || doanhThuCaNhan?.dtTraThangQD || 0;
  const soLuongDon = doanhThuCaNhan?.soLuong || 0;
  const dtKhoanVay = doanhThuCaNhan?.dtQDKhoanVay || 0;

  return (
    <div className="dmx-modal-backdrop" onClick={onClose}>
      <div className="dmx-modal dmx-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="dmx-cat-detail-header">
          <div>
            <small>Mã NV: {nhanVien.maNV}</small>
            <h3>
              Sức khoẻ chi tiết {nhanVien.hoTen} đến {ngayHienThi}
            </h3>
          </div>
          <button className="dmx-close-circle" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="dmx-modal-body">
          {/* Thanh Tiến độ tháng */}
          <div className="dmx-month-progress mb-10">
            <div className="dmx-month-progress-top">
              <div className="dmx-month-progress-label">
                <strong>Tiến độ tháng</strong>
                <span>
                  Ngày {soNgayQua} / {tongNgayThang}
                </span>
              </div>
              <strong className="dmx-month-progress-pct">{phanTramTienDoThang.toFixed(1)}%</strong>
            </div>
            <div className="dmx-month-progress-track">
              <div
                className="dmx-month-progress-fill"
                style={{ width: `${Math.min(100, Math.max(2, phanTramTienDoThang))}%` }}
              />
            </div>
          </div>

          {/* 4 Thẻ KPI Cá nhân */}
          <div className="dmx-kpi-grid mb-12">
            <div className="dmx-rev-card kpi-blue">
              <span className="dmx-rev-title">💵 DOANH THU QĐ</span>
              <strong className="dmx-rev-value">{dtQD > 0 ? `${chuoiSoGon(dtQD)}tr` : "--"}</strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtThuc > 0 ? `DT THẲNG: ${chuoiSoGon(dtThuc)}` : `SL: ${soLuongDon} ĐƠN`}
              </small>
            </div>

            <div className="dmx-rev-card kpi-orange">
              <span className="dmx-rev-title">🏆 MÔN THI ĐUA HT</span>
              <strong className="dmx-rev-value">
                {soMonDat}/{tongSoMon}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">HOÀN THÀNH: {tyLeMonDat}% SỐ MÔN</small>
            </div>

            <div className="dmx-rev-card kpi-green">
              <span className="dmx-rev-title">📦 SỐ LƯỢNG / KHOẢN VAY</span>
              <strong className="dmx-rev-value">{soLuongDon > 0 ? soLuongDon : "--"}</strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">QĐ VAY: {chuoiSoGon(dtKhoanVay)}</small>
            </div>

            <div className="dmx-rev-card kpi-purple">
              <span className="dmx-rev-title">📈 % HT THI ĐUA TB</span>
              <strong className="dmx-rev-value">{chuoiSoVN(phanTramHTTrungBinh)}%</strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">ĐẠT {soMonDat} • CHƯA {soMonChuaDat}</small>
            </div>
          </div>

          {/* Bộ lọc Chi tiết thi đua cá nhân */}
          <div className="dmx-filter-bar mb-8">
            <div className="dmx-segmented">
              <button
                type="button"
                className={boLocMon === "tatCa" ? "active" : ""}
                onClick={() => setBoLocMon("tatCa")}
              >
                Tất cả ({tongSoMon})
              </button>
              <button
                type="button"
                className={boLocMon === "daDat" ? "active" : ""}
                onClick={() => setBoLocMon("daDat")}
              >
                Đạt ({soMonDat})
              </button>
              <button
                type="button"
                className={boLocMon === "chuaDat" ? "active" : ""}
                onClick={() => setBoLocMon("chuaDat")}
              >
                Chưa đạt ({soMonChuaDat})
              </button>
            </div>
          </div>

          {!danhSachMonLoc.length ? (
            <div className="dmx-empty-subbox">
              <p>Chưa có môn thi đua nào trong mục này.</p>
            </div>
          ) : (
            <div className="dmx-table-wrap">
              <table className="dmx-table-8col">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="left">MÔN THI ĐUA</th>
                    <th className="right">THỰC HIỆN</th>
                    <th className="right">TARGET</th>
                    <th>% HT</th>
                    <th>% HT SIÊU THỊ</th>
                    <th className="right">CÒN LẠI</th>
                    <th>TIẾN ĐỘ</th>
                  </tr>
                </thead>
                <tbody>
                  {danhSachMonLoc.map((m, idx) => {
                    const barClass =
                      m.phanTramHT >= 99.995
                        ? "bar-green"
                        : m.phanTramHT >= 70
                          ? "bar-amber"
                          : "bar-red";
                    const widthPct = Math.min(100, Math.max(4, m.phanTramHT));
                    return (
                      <tr key={m.khoaNganh} className={m.daDat ? "row-pass" : "row-fail"}>
                        <td className="center muted">{idx + 1}</td>
                        <td className="left bold">
                          {m.tenNganhHang}{" "}
                          <small className="muted">({m.loaiChiTieu === "SL" ? "SLLK" : "DTLK"})</small>
                        </td>
                        <td className="right bold">{chuoiSoVN(m.thucHien)}</td>
                        <td className="right muted">{chuoiSoVN(m.targetCaNhan)}</td>
                        <td className="center">
                          <span className={`dmx-pill ${m.daDat ? "pill-green" : "pill-red"}`}>
                            {chuoiSoVN(m.phanTramHT)}%
                          </span>
                        </td>
                        <td className="center muted">{chuoiSoVN(m.phanTramSieuThi)}%</td>
                        <td className={`right bold ${m.conLai <= 0 ? "text-green" : "text-red"}`}>
                          {chuoiSoVN(m.conLai)}
                        </td>
                        <td style={{ minWidth: 90 }}>
                          <div className="dmx-progress-track">
                            <div
                              className={`dmx-progress-fill ${barClass}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

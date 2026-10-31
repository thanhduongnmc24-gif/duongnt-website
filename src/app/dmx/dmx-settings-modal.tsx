"use client";

import { useState } from "react";
import { CheckSquare, Pencil, Plus, Square, Trash2, Users, X } from "lucide-react";
import {
  CaiDatDMX,
  DANH_SACH_NHAN_VIEN_MAU,
  NhanVienQuanLy,
} from "./dmx-types";

export type MatHangThangItem = {
  khoaNganh: string;
  tenNganhHang: string;
  loaiChiTieu: string;
  target: number;
  thucHien: number;
};

type PropsModalCaiDat = {
  tamCaiDat: CaiDatDMX;
  setTamCaiDat: React.Dispatch<React.SetStateAction<CaiDatDMX>>;
  danhSachMatHangThang: MatHangThangItem[];
  khoaNganhChonMacDinh?: string;
  onSave: (caiDatMoi: CaiDatDMX) => void;
  onClose: () => void;
};

export function ModalCaiDatDMX({
  tamCaiDat,
  setTamCaiDat,
  danhSachMatHangThang,
  khoaNganhChonMacDinh,
  onSave,
  onClose,
}: PropsModalCaiDat) {
  const [cumTuMoi, setCumTuMoi] = useState("");
  const [maNVMoi, setMaNVMoi] = useState("");
  const [tenNVMoi, setTenNVMoi] = useState("");
  const [moNhapNhanhNV, setMoNhapNhanhNV] = useState(false);
  const [chuoiNhapNhanhNV, setChuoiNhapNhanhNV] = useState("");
  const [nvDangSuaIdx, setNvDangSuaIdx] = useState<number | null>(null);
  const [suaMaNV, setSuaMaNV] = useState("");
  const [suaTenNV, setSuaTenNV] = useState("");

  const [khoaMatHangDangChon, setKhoaMatHangDangChon] = useState<string>(
    khoaNganhChonMacDinh || danhSachMatHangThang[0]?.khoaNganh || ""
  );

  const matHangHienTai = danhSachMatHangThang.find(m => m.khoaNganh === khoaMatHangDangChon) || null;
  const dsMaNVDuocChon = matHangHienTai
    ? tamCaiDat.chiaTargetNganhHang[matHangHienTai.khoaNganh] ??
      tamCaiDat.danhSachNhanVien.map(nv => nv.maNV)
    : [];

  const soNVDuocChon = dsMaNVDuocChon.length;
  const targetMoiNV =
    matHangHienTai && soNVDuocChon > 0 ? matHangHienTai.target / soNVDuocChon : 0;

  function themMotNhanVien() {
    const ma = maNVMoi.trim();
    const ten = tenNVMoi.trim();
    if (!ma || !ten) return;
    setTamCaiDat(prev => {
      const daCo = prev.danhSachNhanVien.some(nv => nv.maNV === ma);
      const dsNV = daCo
        ? prev.danhSachNhanVien.map(nv => (nv.maNV === ma ? { maNV: ma, hoTen: ten } : nv))
        : [...prev.danhSachNhanVien, { maNV: ma, hoTen: ten }];
      return { ...prev, danhSachNhanVien: dsNV };
    });
    setMaNVMoi("");
    setTenNVMoi("");
  }

  function xuLyDanNhanhNhanVien() {
    const cacDong = chuoiNhapNhanhNV
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!cacDong.length) return;

    const nvMoi: NhanVienQuanLy[] = [];
    for (const dong of cacDong) {
      // Hỗ trợ cả "24939 - Phan Hoàng Sơn" lẫn "Phan Hoàng Sơn - 24939" hoặc "24939\tPhan Hoàng Sơn"
      const matchDau = dong.match(/^(\d{3,10})\s*[-–:\t|,]\s*(.+)$/);
      const matchCuoi = dong.match(/^(.+?)\s*[-–:\t|,]\s*(\d{3,10})$/);
      if (matchDau) {
        nvMoi.push({ maNV: matchDau[1].trim(), hoTen: matchDau[2].trim() });
      } else if (matchCuoi) {
        nvMoi.push({ maNV: matchCuoi[2].trim(), hoTen: matchCuoi[1].trim() });
      }
    }
    if (!nvMoi.length) return;

    setTamCaiDat(prev => {
      const map = new Map<string, NhanVienQuanLy>();
      for (const nv of prev.danhSachNhanVien) map.set(nv.maNV, nv);
      for (const nv of nvMoi) map.set(nv.maNV, nv);
      return { ...prev, danhSachNhanVien: Array.from(map.values()) };
    });
    setChuoiNhapNhanhNV("");
    setMoNhapNhanhNV(false);
  }

  function batTatNhanVienChiaTarget(maNV: string) {
    if (!matHangHienTai) return;
    const khoa = matHangHienTai.khoaNganh;
    setTamCaiDat(prev => {
      const hienTai =
        prev.chiaTargetNganhHang[khoa] ?? prev.danhSachNhanVien.map(n => n.maNV);
      const co = hienTai.includes(maNV);
      const capNhat = co ? hienTai.filter(m => m !== maNV) : [...hienTai, maNV];
      return {
        ...prev,
        chiaTargetNganhHang: {
          ...prev.chiaTargetNganhHang,
          [khoa]: capNhat,
        },
      };
    });
  }

  function chonTatCaChiaTarget(chonHet: boolean) {
    if (!matHangHienTai) return;
    const khoa = matHangHienTai.khoaNganh;
    setTamCaiDat(prev => ({
      ...prev,
      chiaTargetNganhHang: {
        ...prev.chiaTargetNganhHang,
        [khoa]: chonHet ? prev.danhSachNhanVien.map(n => n.maNV) : [],
      },
    }));
  }

  return (
    <div className="dmx-modal-backdrop" onClick={onClose}>
      <div className="dmx-modal dmx-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="dmx-modal-head">
          <h3>Cài đặt hệ thống & Quản lý Nhân viên</h3>
          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button
              type="button"
              className="dmx-save-btn"
              onClick={() => {
                const dsCum = [...tamCaiDat.danhSachCumTuLocBo];
                const dangGo = cumTuMoi.trim();
                if (dangGo && !dsCum.some(c => c.toLowerCase() === dangGo.toLowerCase())) {
                  dsCum.unshift(dangGo);
                }
                onSave({ ...tamCaiDat, danhSachCumTuLocBo: dsCum });
              }}
            >
              Lưu cài đặt
            </button>
            <button type="button" className="dmx-close-circle" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="dmx-modal-body">
          {/* 1. CHIA TARGET NGÀNH HÀNG CHO NHÂN VIÊN (TỪ NGÀY 1 ĐẾN HIỆN TẠI) */}
          <label className="dmx-group-label">
            1. CHIA TARGET MẶT HÀNG CHO NHÂN VIÊN (TỪ NGÀY 1 ĐẾN HIỆN TẠI)
          </label>
          <div className="dmx-setting-box">
            <p>
              Chọn mặt hàng đã quét trong tháng ({danhSachMatHangThang.length} mặt hàng) để tích chọn nhân viên và chia đều Target:
            </p>
            {!danhSachMatHangThang.length ? (
              <small className="empty">
                Chưa có mặt hàng nào được quét từ ngày 1 đến hôm nay. Hãy quét ảnh Thi đua trước.
              </small>
            ) : (
              <>
                <select
                  className="dmx-select-full"
                  value={matHangHienTai?.khoaNganh || ""}
                  onChange={e => setKhoaMatHangDangChon(e.target.value)}
                >
                  {danhSachMatHangThang.map(mh => {
                    const dsChon =
                      tamCaiDat.chiaTargetNganhHang[mh.khoaNganh] ??
                      tamCaiDat.danhSachNhanVien.map(n => n.maNV);
                    const moiNguoi = dsChon.length > 0 ? (mh.target / dsChon.length).toFixed(2) : "0";
                    return (
                      <option key={mh.khoaNganh} value={mh.khoaNganh}>
                        {mh.tenNganhHang} — Target: {mh.target} ({dsChon.length} NV → {moiNguoi}/NV)
                      </option>
                    );
                  })}
                </select>

                {matHangHienTai && (
                  <div className="dmx-target-split-box">
                    <div className="dmx-target-split-summary">
                      <div>
                        <strong>{matHangHienTai.tenNganhHang}</strong>
                        <span>
                          Target tổng: <b>{matHangHienTai.target}</b> ({matHangHienTai.loaiChiTieu})
                        </span>
                      </div>
                      <div className="dmx-target-split-result">
                        <span>
                          Đã chọn: <b>{soNVDuocChon}/{tamCaiDat.danhSachNhanVien.length} NV</b>
                        </span>
                        <strong>
                          Mỗi NV nhận: {soNVDuocChon > 0 ? targetMoiNV.toFixed(2) : "0"}
                        </strong>
                      </div>
                    </div>

                    <div className="dmx-target-split-QuickActions">
                      <button type="button" onClick={() => chonTatCaChiaTarget(true)}>
                        <CheckSquare size={13} /> Chọn tất cả ({tamCaiDat.danhSachNhanVien.length})
                      </button>
                      <button type="button" onClick={() => chonTatCaChiaTarget(false)}>
                        <Square size={13} /> Bỏ chọn tất cả
                      </button>
                    </div>

                    <div className="dmx-emp-check-grid">
                      {tamCaiDat.danhSachNhanVien.map(nv => {
                        const checked = dsMaNVDuocChon.includes(nv.maNV);
                        return (
                          <label
                            key={nv.maNV}
                            className={`dmx-emp-check-item ${checked ? "checked" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => batTatNhanVienChiaTarget(nv.maNV)}
                            />
                            <div className="dmx-emp-check-info">
                              <strong>
                                {nv.maNV} - {nv.hoTen}
                              </strong>
                              <small>
                                Target: {checked && soNVDuocChon > 0 ? targetMoiNV.toFixed(2) : "0"}
                              </small>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2. QUẢN LÝ DANH SÁCH NHÂN VIÊN (MÃ SỐ & HỌ TÊN - THÊM / SỬA / XOÁ) */}
          <label className="dmx-group-label">
            2. DANH SÁCH NHÂN VIÊN QUẢN LÝ ({tamCaiDat.danhSachNhanVien.length} NHÂN VIÊN)
          </label>
          <div className="dmx-setting-box">
            <div className="dmx-emp-add-row">
              <input
                type="text"
                placeholder="Mã số (VD: 24939)"
                value={maNVMoi}
                onChange={e => setMaNVMoi(e.target.value)}
                className="input-manv"
              />
              <input
                type="text"
                placeholder="Họ và tên nhân viên (VD: Phan Hoàng Sơn)"
                value={tenNVMoi}
                onChange={e => setTenNVMoi(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") themMotNhanVien();
                }}
                className="input-tennv"
              />
              <button type="button" onClick={themMotNhanVien}>
                <Plus size={15} /> Thêm
              </button>
            </div>

            <div className="dmx-emp-toolbar-links">
              <button type="button" onClick={() => setMoNhapNhanhNV(p => !p)}>
                📋 {moNhapNhanhNV ? "Ẩn ô dán nhanh" : "Dán nhanh nhiều nhân viên"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setTamCaiDat(prev => ({
                    ...prev,
                    danhSachNhanVien: DANH_SACH_NHAN_VIEN_MAU,
                  }))
                }
              >
                <Users size={13} /> Nạp 16 NV mẫu siêu thị
              </button>
            </div>

            {moNhapNhanhNV && (
              <div className="dmx-bulk-emp-box">
                <textarea
                  rows={4}
                  placeholder={"Mỗi dòng 1 nhân viên, ví dụ:\n24939 - Phan Hoàng Sơn\n201962 - Nguyễn Thị Kim Loan"}
                  value={chuoiNhapNhanhNV}
                  onChange={e => setChuoiNhapNhanhNV(e.target.value)}
                />
                <button type="button" onClick={xuLyDanNhanhNhanVien}>
                  Nhập danh sách đã dán
                </button>
              </div>
            )}

            <div className="dmx-emp-table-wrap">
              <table className="dmx-emp-manage-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>MÃ SỐ</th>
                    <th>TÊN NHÂN VIÊN</th>
                    <th className="right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {!tamCaiDat.danhSachNhanVien.length ? (
                    <tr>
                      <td colSpan={4} className="center muted">
                        Chưa có nhân viên nào. Hãy thêm hoặc nạp mẫu.
                      </td>
                    </tr>
                  ) : (
                    tamCaiDat.danhSachNhanVien.map((nv, idx) => {
                      const dangSua = nvDangSuaIdx === idx;
                      return (
                        <tr key={`${nv.maNV}-${idx}`}>
                          <td className="center muted">{idx + 1}</td>
                          <td>
                            {dangSua ? (
                              <input
                                type="text"
                                value={suaMaNV}
                                onChange={e => setSuaMaNV(e.target.value)}
                                className="dmx-inline-input"
                              />
                            ) : (
                              <b>{nv.maNV}</b>
                            )}
                          </td>
                          <td>
                            {dangSua ? (
                              <input
                                type="text"
                                value={suaTenNV}
                                onChange={e => setSuaTenNV(e.target.value)}
                                className="dmx-inline-input"
                              />
                            ) : (
                              nv.hoTen
                            )}
                          </td>
                          <td className="right">
                            {dangSua ? (
                              <button
                                type="button"
                                className="btn-inline-save"
                                onClick={() => {
                                  if (suaMaNV.trim() && suaTenNV.trim()) {
                                    setTamCaiDat(prev => ({
                                      ...prev,
                                      danhSachNhanVien: prev.danhSachNhanVien.map((item, i) =>
                                        i === idx
                                          ? { maNV: suaMaNV.trim(), hoTen: suaTenNV.trim() }
                                          : item
                                      ),
                                    }));
                                  }
                                  setNvDangSuaIdx(null);
                                }}
                              >
                                Lưu
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-inline-icon"
                                onClick={() => {
                                  setNvDangSuaIdx(idx);
                                  setSuaMaNV(nv.maNV);
                                  setSuaTenNV(nv.hoTen);
                                }}
                                title="Sửa nhân viên"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-inline-icon danger"
                              onClick={() =>
                                setTamCaiDat(prev => ({
                                  ...prev,
                                  danhSachNhanVien: prev.danhSachNhanVien.filter((_, i) => i !== idx),
                                }))
                              }
                              title="Xoá nhân viên"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. KIỂU HIỂN THỊ & XUẤT BÁO CÁO */}
          <label className="dmx-group-label">3. KIỂU HIỂN THỊ & XUẤT BÁO CÁO</label>
          <div className="dmx-setting-box">
            <p>Chọn 1 trong 2 mẫu hiển thị trên màn hình và khi xuất ảnh:</p>
            <div className="dmx-seg-2">
              <button
                type="button"
                className={tamCaiDat.kieuHienThi === "bangChiTiet" ? "active" : ""}
                onClick={() => setTamCaiDat(prev => ({ ...prev, kieuHienThi: "bangChiTiet" }))}
              >
                Bảng 8 cột (Chi tiết)
              </button>
              <button
                type="button"
                className={tamCaiDat.kieuHienThi === "theGon" ? "active" : ""}
                onClick={() => setTamCaiDat(prev => ({ ...prev, kieuHienThi: "theGon" }))}
              >
                Thẻ tiến độ (Gọn)
              </button>
            </div>

            <p className="mt-10">Số cột khi xuất ảnh (áp dụng cho mẫu Thẻ tiến độ):</p>
            <div className="dmx-seg-4">
              {[1, 2, 3, 4].map(cot => (
                <button
                  type="button"
                  key={cot}
                  className={tamCaiDat.soCotXuatAnh === cot ? "active" : ""}
                  onClick={() => setTamCaiDat(prev => ({ ...prev, soCotXuatAnh: cot }))}
                >
                  {cot} cột
                </button>
              ))}
            </div>
          </div>

          {/* 4. CỤM TỪ LỌC BỎ TRONG TẤT CẢ NGÀNH HÀNG */}
          <label className="dmx-group-label">4. CỤM TỪ LỌC BỎ TRONG TẤT CẢ NGÀNH HÀNG</label>
          <div className="dmx-setting-box">
            <div className="dmx-phrase-input-row">
              <input
                type="text"
                placeholder="Nhập cụm từ muốn lọc bỏ (VD: 275 Quang Trung)..."
                value={cumTuMoi}
                onChange={e => setCumTuMoi(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const s = cumTuMoi.trim();
                    if (s && !tamCaiDat.danhSachCumTuLocBo.some(c => c.toLowerCase() === s.toLowerCase())) {
                      setTamCaiDat(prev => ({
                        ...prev,
                        danhSachCumTuLocBo: [s, ...prev.danhSachCumTuLocBo],
                      }));
                    }
                    setCumTuMoi("");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const s = cumTuMoi.trim();
                  if (!s) return;
                  if (!tamCaiDat.danhSachCumTuLocBo.some(c => c.toLowerCase() === s.toLowerCase())) {
                    setTamCaiDat(prev => ({
                      ...prev,
                      danhSachCumTuLocBo: [s, ...prev.danhSachCumTuLocBo],
                    }));
                  }
                  setCumTuMoi("");
                }}
              >
                + Thêm
              </button>
            </div>

            <div className="dmx-phrase-list">
              {!tamCaiDat.danhSachCumTuLocBo.length ? (
                <small className="empty">Chưa có cụm từ lọc bỏ nào</small>
              ) : (
                tamCaiDat.danhSachCumTuLocBo.map((cum, idx) => (
                  <div key={`${cum}-${idx}`} className="dmx-phrase-item">
                    <span>&ldquo;{cum}&rdquo;</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTamCaiDat(prev => ({
                          ...prev,
                          danhSachCumTuLocBo: prev.danhSachCumTuLocBo.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

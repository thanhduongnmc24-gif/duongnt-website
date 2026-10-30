"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  Camera,
  Columns,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  PlusCircle,
  RotateCcw,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import "./dmx.css";

// Giữ các hằng số loại báo cáo để tương thích bộ kiểm thử tự động: doanh_thu_thuc, doanh_thu_quy_doi, thi_dua
type LoaiBaoCaoAPI = "doanh_thu_thuc" | "doanh_thu_quy_doi" | "thi_dua";
type LoaiTabMuc = "thiDua" | "duPhong1" | "duPhong2" | "duPhong3";
type KieuHienThiBaoCao = "bangChiTiet" | "theGon";
type LoaiChiTieu = "SL" | "DT";
type BoLocThiDua = "tatCa" | "daDat" | "chuaDat";
type KieuSapXepThiDua = "phanTramCaoThap" | "phanTramThapCao" | "tenAZ" | "tenZA" | "thuTuGoc";

type ThongTinDoanhThu = {
  doanhThuThuc: number;
  targetThuc: number;
  doanhThuQuyDoi: number;
  targetQuyDoi: number;
};

type DongThiDua = {
  id: string;
  tenNganhHangGoc: string;
  tenNganhHang: string;
  loaiChiTieu: LoaiChiTieu;
  thucHien: number;
  target: number;
  phanTramHTGoc?: number;
  phanTramDuBaoGoc?: number;
};

type DuLieuNgayDMX = {
  khoaNgay: string;
  capNhatLuc: string;
  thongTinDonVi: string;
  doanhThu: ThongTinDoanhThu;
  danhSachThiDua: DongThiDua[];
};

type CaiDatDMX = {
  kieuHienThi: KieuHienThiBaoCao;
  danhSachCumTuLocBo: string[];
  soCotXuatAnh: number;
};

const STORAGE_DATA_KEY = "dmx-du-lieu-v3";
const STORAGE_SETTINGS_KEY = "dmx-cai-dat-v3";

const CAC_MUC: { id: LoaiTabMuc; tieuDe: string }[] = [
  { id: "thiDua", tieuDe: "Thi đua" },
  { id: "duPhong1", tieuDe: "Dự phòng 1" },
  { id: "duPhong2", tieuDe: "Dự phòng 2" },
  { id: "duPhong3", tieuDe: "Dự phòng 3" },
];

const CAC_SAP_XEP: { id: KieuSapXepThiDua; nhan: string; nhanNgan: string }[] = [
  { id: "phanTramCaoThap", nhan: "% HT: Cao → Thấp", nhanNgan: "HT Cao↓" },
  { id: "phanTramThapCao", nhan: "% HT: Thấp → Cao", nhanNgan: "HT Thấp↑" },
  { id: "tenAZ", nhan: "Ngành hàng: A → Z", nhanNgan: "Tên A-Z" },
  { id: "tenZA", nhan: "Ngành hàng: Z → A", nhanNgan: "Tên Z-A" },
  { id: "thuTuGoc", nhan: "Thứ tự quét gốc", nhanNgan: "Mặc định" },
];

function khoaHomNay(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hienThiNgayVN(khoa: string): string {
  const [y, m, d] = khoa.split("-");
  if (!y || !m || !d) return khoa;
  return `${d}/${m}/${y}`;
}

function heSoDuBaoThang(khoa: string): number {
  const [y, m, d] = khoa.split("-").map(Number);
  if (!y || !m || !d) return 1;
  const soNgayTrongThang = new Date(y, m, 0).getDate();
  return Math.max(1, soNgayTrongThang / Math.max(1, d));
}

function chuoiSoVN(so: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(so) ? so : 0);
}

function chuoiPhanTramVN(so: number): string {
  return `${chuoiSoVN(so)}%`;
}

function chuoiSoLieuBang(so: number): string {
  const val = Number.isFinite(so) ? so : 0;
  const laSoNguyen = Math.abs(Math.round(val) - val) < 0.005;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: laSoNguyen ? 0 : 2,
    maximumFractionDigits: laSoNguyen ? 0 : 2,
  }).format(val);
}

function chuoiChenhLechBang(so: number): string {
  if (Math.abs(so) < 0.005) return "0";
  return `${so > 0 ? "+" : ""}${chuoiSoLieuBang(so)}`;
}

function chuoiPhanTramBang(so: number): string {
  const val = Number.isFinite(so) ? so : 0;
  if (Math.abs(Math.round(val) - val) < 0.05) {
    return `${Math.round(val)}%`;
  }
  return `${val.toFixed(1)}%`;
}

function tinhPhanTramHT(dong: DongThiDua): number {
  if (dong.target > 0.0001) {
    return (dong.thucHien / dong.target) * 100;
  }
  return dong.phanTramHTGoc ?? 0;
}

function tinhPhanTramDuBao(dong: DongThiDua, khoaNgay: string): number {
  const ht = tinhPhanTramHT(dong);
  if (dong.phanTramDuBaoGoc && dong.phanTramDuBaoGoc > 0) {
    if (dong.phanTramHTGoc && dong.phanTramHTGoc > 0.1 && dong.target > 0.0001) {
      if (Math.abs(ht - dong.phanTramHTGoc) > 1.5) {
        return ht * (dong.phanTramDuBaoGoc / dong.phanTramHTGoc);
      }
    }
    return dong.phanTramDuBaoGoc;
  }
  return ht * heSoDuBaoThang(khoaNgay);
}

function apDungLocTuCaiDat(tenGoc: string, danhSachCumTu: string[]): string {
  let s = tenGoc.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  for (const cum of danhSachCumTu) {
    const sach = cum.trim();
    if (!sach) continue;
    const escaped = sach.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(escaped, "gi"), "");
  }
  s = s.replace(/\s+/g, " ").replace(/^[\s\-–]+|[\s\-–]+$/g, "");
  return s || tenGoc;
}

function chuanHoaKhoaSoSanh(ten: string): string {
  return ten
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function gopDanhSachThiDua(cu: DongThiDua[], moi: DongThiDua[], danhSachLoc: string[]): DongThiDua[] {
  const ketQua = [...cu];
  for (const raw of moi) {
    const tenLoc = apDungLocTuCaiDat(raw.tenNganhHangGoc, danhSachLoc);
    const dongMoi: DongThiDua = { ...raw, tenNganhHang: tenLoc };
    const khoaMoi = chuanHoaKhoaSoSanh(dongMoi.tenNganhHang);
    if (!khoaMoi) continue;

    const viTri = ketQua.findIndex(item => chuanHoaKhoaSoSanh(item.tenNganhHang) === khoaMoi);
    if (viTri >= 0) {
      const dongCu = ketQua[viTri];
      if (dongMoi.target > 0 || dongMoi.thucHien > 0 || (dongCu.target === 0 && dongCu.thucHien === 0)) {
        ketQua[viTri] = { ...dongMoi, id: dongCu.id };
      }
    } else {
      ketQua.push(dongMoi);
    }
  }
  return ketQua;
}

function resizeImage(file: File): Promise<{ mimeType: "image/jpeg"; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Ảnh không hợp lệ."));
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Không xử lý được ảnh."));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ mimeType: "image/jpeg", data: src.split(",")[1] });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function taoDuLieuRong(khoaNgay: string): DuLieuNgayDMX {
  return {
    khoaNgay,
    capNhatLuc: "",
    thongTinDonVi: "",
    doanhThu: { doanhThuThuc: 0, targetThuc: 0, doanhThuQuyDoi: 0, targetQuyDoi: 0 },
    danhSachThiDua: [],
  };
}

export default function DmxPage() {
  const [khoaNgay, setKhoaNgay] = useState<string>(khoaHomNay);
  const [cacNgay, setCacNgay] = useState<Record<string, DuLieuNgayDMX>>({});
  const [caiDat, setCaiDat] = useState<CaiDatDMX>({
    kieuHienThi: "bangChiTiet",
    danhSachCumTuLocBo: [],
    soCotXuatAnh: 3,
  });

  const [tabHienTai, setTabHienTai] = useState<LoaiTabMuc>("thiDua");
  const [boLoc, setBoLoc] = useState<BoLocThiDua>("tatCa");
  const [kieuSapXep, setKieuSapXep] = useState<KieuSapXepThiDua>("phanTramCaoThap");
  const [soCotDienThoai, setSoCotDienThoai] = useState<1 | 2>(1);

  // Trạng thái xử lý
  const [dangQuet, setDangQuet] = useState(false);
  const [tienTrinhQuet, setTienTrinhQuet] = useState("");
  const [thongBaoLoi, setThongBaoLoi] = useState("");

  // Các hộp thoại (Modal)
  const [moModalNgay, setMoModalNgay] = useState(false);
  const [moModalCaiDat, setMoModalCaiDat] = useState(false);
  const [moModalXuat, setMoModalXuat] = useState(false);
  const [moModalXoaQuetLai, setMoModalXoaQuetLai] = useState(false);
  const [moModalNhapMau, setMoModalNhapMau] = useState(false);
  const [moModalMenuDoanhThu, setMoModalMenuDoanhThu] = useState(false);
  const [moModalSuaDoanhThu, setMoModalSuaDoanhThu] = useState(false);
  const [dongDangSua, setDongDangSua] = useState<{ dong: DongThiDua; laThemMoi: boolean } | null>(null);

  // State form Cài đặt
  const [cumTuMoi, setCumTuMoi] = useState("");
  const [tamCaiDat, setTamCaiDat] = useState<CaiDatDMX>(caiDat);

  // State form sửa Doanh thu
  const [formDT, setFormDT] = useState({ thuc: "", targetThuc: "", qd: "", targetQD: "" });

  // State form sửa Ngành hàng
  const [formDong, setFormDong] = useState({ ten: "", dvt: "DT" as LoaiChiTieu, thucHien: "", target: "" });

  const inputAnhThiDuaRef = useRef<HTMLInputElement>(null);
  const inputAnhDoanhThuRef = useRef<HTMLInputElement>(null);

  // Khởi tạo PWA & đọc dữ liệu từ localStorage
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/dmx-sw.js", { scope: "/dmx" });
    }
    try {
      const rawSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as Partial<CaiDatDMX>;
        setCaiDat({
          kieuHienThi: parsed.kieuHienThi === "theGon" ? "theGon" : "bangChiTiet",
          danhSachCumTuLocBo: Array.isArray(parsed.danhSachCumTuLocBo) ? parsed.danhSachCumTuLocBo : [],
          soCotXuatAnh: Number(parsed.soCotXuatAnh) >= 1 && Number(parsed.soCotXuatAnh) <= 4 ? Number(parsed.soCotXuatAnh) : 3,
        });
      }
    } catch {
      // Bỏ qua lỗi đọc cài đặt
    }

    try {
      const rawData = localStorage.getItem(STORAGE_DATA_KEY);
      if (rawData) {
        setCacNgay(JSON.parse(rawData));
      }
    } catch {
      setCacNgay({});
    }
  }, []);

  const duLieuHienTai: DuLieuNgayDMX = useMemo(() => {
    const goc = cacNgay[khoaNgay] || taoDuLieuRong(khoaNgay);
    return {
      ...goc,
      danhSachThiDua: goc.danhSachThiDua.map(d => ({
        ...d,
        tenNganhHang: apDungLocTuCaiDat(d.tenNganhHangGoc || d.tenNganhHang, caiDat.danhSachCumTuLocBo),
      })),
    };
  }, [cacNgay, khoaNgay, caiDat.danhSachCumTuLocBo]);

  function luuDuLieuNgay(capNhat: DuLieuNgayDMX) {
    setCacNgay(prev => {
      const next = { ...prev, [capNhat.khoaNgay]: capNhat };
      try {
        localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(next));
      } catch {
        // Bỏ qua lỗi bộ nhớ
      }
      return next;
    });
  }

  function luuCaiDatMoi(moi: CaiDatDMX) {
    setCaiDat(moi);
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(moi));
    } catch {
      // Bỏ qua
    }
  }

  // Thống kê & Lọc / Sắp xếp danh sách Thi đua
  const tongSoCT = duLieuHienTai.danhSachThiDua.length;
  const soDat = useMemo(
    () => duLieuHienTai.danhSachThiDua.filter(d => tinhPhanTramHT(d) >= 99.995).length,
    [duLieuHienTai.danhSachThiDua]
  );
  const soChuaDat = tongSoCT - soDat;

  const danhSachHienThi = useMemo(() => {
    let tam = [...duLieuHienTai.danhSachThiDua];
    if (boLoc === "daDat") {
      tam = tam.filter(d => tinhPhanTramHT(d) >= 99.995);
    } else if (boLoc === "chuaDat") {
      tam = tam.filter(d => tinhPhanTramHT(d) < 99.995);
    }

    const tenDeSapXep = (ten: string) => ten.replace(/^T\d{1,2}\s*[-–]\s*/i, "");

    if (kieuSapXep === "phanTramCaoThap") {
      tam.sort((a, b) => tinhPhanTramHT(b) - tinhPhanTramHT(a));
    } else if (kieuSapXep === "phanTramThapCao") {
      tam.sort((a, b) => tinhPhanTramHT(a) - tinhPhanTramHT(b));
    } else if (kieuSapXep === "tenAZ") {
      tam.sort((a, b) => tenDeSapXep(a.tenNganhHang).localeCompare(tenDeSapXep(b.tenNganhHang), "vi"));
    } else if (kieuSapXep === "tenZA") {
      tam.sort((a, b) => tenDeSapXep(b.tenNganhHang).localeCompare(tenDeSapXep(a.tenNganhHang), "vi"));
    }
    return tam;
  }, [duLieuHienTai.danhSachThiDua, boLoc, kieuSapXep]);

  const coDoanhThu =
    duLieuHienTai.doanhThu.doanhThuThuc > 0 ||
    duLieuHienTai.doanhThu.targetThuc > 0 ||
    duLieuHienTai.doanhThu.doanhThuQuyDoi > 0 ||
    duLieuHienTai.doanhThu.targetQuyDoi > 0;

  // MARK: - Quét ảnh Thi đua & Doanh thu qua API

  async function xuLyChonAnhThiDua(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setDangQuet(true);
    setThongBaoLoi("");
    try {
      let dsMoi: DongThiDua[] = [];
      let capNhatLuc = "";
      let donVi = "";

      // Chia theo lô tối đa 5 ảnh/lần gọi để đảm bảo tốc độ và độ chính xác cao nhất
      const kichThuocLo = 5;
      for (let i = 0; i < files.length; i += kichThuocLo) {
        const loFiles = files.slice(i, i + kichThuocLo);
        setTienTrinhQuet(`Đang đọc ảnh ${i + 1}–${Math.min(files.length, i + kichThuocLo)} / ${files.length}...`);
        const anhNen = await Promise.all(loFiles.map(resizeImage));

        const loai: LoaiBaoCaoAPI = "thi_dua";
        const res = await fetch("/api/dmx/doc-anh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loai, anh: anhNen }),
        });
        const kq = await res.json();
        if (!res.ok) throw new Error(kq.loi || "Chưa đọc được ảnh.");

        if (kq.kyBaoCao && !capNhatLuc) capNhatLuc = kq.kyBaoCao;
        if (kq.donVi && !donVi) donVi = kq.donVi;

        const mang: DongThiDua[] = (kq.danhSachThiDua || []).map(
          (item: {
            tenNganhHang?: string;
            loaiChiTieu?: string;
            thucHien?: number;
            target?: number;
            phanTramHT?: number;
            phanTramDuBao?: number;
          }) => {
            const tenGoc = String(item.tenNganhHang || "").trim();
            const loaiCT: LoaiChiTieu = String(item.loaiChiTieu || "DT")
              .toUpperCase()
              .includes("SL")
              ? "SL"
              : "DT";
            return {
              id: crypto.randomUUID(),
              tenNganhHangGoc: tenGoc,
              tenNganhHang: apDungLocTuCaiDat(tenGoc, caiDat.danhSachCumTuLocBo),
              loaiChiTieu: loaiCT,
              thucHien: Number(item.thucHien) || 0,
              target: Number(item.target) || 0,
              phanTramHTGoc: Number(item.phanTramHT) || undefined,
              phanTramDuBaoGoc: Number(item.phanTramDuBao) || undefined,
            };
          }
        );

        dsMoi = gopDanhSachThiDua(dsMoi, mang, caiDat.danhSachCumTuLocBo);
      }

      const gopChung = gopDanhSachThiDua(duLieuHienTai.danhSachThiDua, dsMoi, caiDat.danhSachCumTuLocBo);
      luuDuLieuNgay({
        ...duLieuHienTai,
        danhSachThiDua: gopChung,
        capNhatLuc: capNhatLuc || new Date().toLocaleTimeString("vi-VN"),
        thongTinDonVi: donVi || duLieuHienTai.thongTinDonVi,
      });
    } catch (err) {
      setThongBaoLoi(err instanceof Error ? err.message : "Không thể đọc ảnh.");
    } finally {
      setDangQuet(false);
      setTienTrinhQuet("");
    }
  }

  async function xuLyChonAnhDoanhThu(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDangQuet(true);
    setThongBaoLoi("");
    setTienTrinhQuet("Đang đọc ảnh Doanh thu...");
    try {
      const anhNen = await resizeImage(file);
      const loai: LoaiBaoCaoAPI = "doanh_thu_thuc";
      const res = await fetch("/api/dmx/doc-anh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loai, anh: [anhNen] }),
      });
      const kq = await res.json();
      if (!res.ok) throw new Error(kq.loi || "Chưa đọc được ảnh Doanh thu.");

      const dt = kq.doanhThu || {};
      const moi: ThongTinDoanhThu = {
        doanhThuThuc: Number(dt.doanhThuThuc) || 0,
        targetThuc: Number(dt.targetThuc) || 0,
        doanhThuQuyDoi: Number(dt.doanhThuQuyDoi) || 0,
        targetQuyDoi: Number(dt.targetQuyDoi) || 0,
      };
      luuDuLieuNgay({ ...duLieuHienTai, doanhThu: moi });
    } catch (err) {
      setThongBaoLoi(err instanceof Error ? err.message : "Không thể đọc ảnh Doanh thu.");
    } finally {
      setDangQuet(false);
      setTienTrinhQuet("");
    }
  }

  // MARK: - Nạp dữ liệu mẫu & Chỉnh sửa thủ công

  function napDuLieuMau() {
    const mau: DongThiDua[] = [
      { id: crypto.randomUUID(), tenNganhHangGoc: "T09 - T10 IPHONE 18 series, iPhone Duo", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 4476.28, target: 3493.6 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - NẠP - RÚT TIỀN TÀI KHOẢN NGÂN HÀNG", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 407, target: 363 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - SIM TỔNG", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 52.0, target: 55.12 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - Bảo Hiểm Tổng", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 267.51, target: 294.92 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - TAI NGHE", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 19.43, target: 22.39 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - PHỤ KIỆN CÔNG NGHỆ", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 12.28, target: 14.34 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 787.43, target: 1055.1 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - GIA DỤNG SUNHOUSE", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 533.02, target: 731.12 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - ĐIỆN TỬ TCL", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 175.26, target: 249.98 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - MÁY GIẶT", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 550.68, target: 810.24 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - CAMERA", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 38.68, target: 57.05 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - TIVI", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 594.02, target: 1122.16 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - AUDIO", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 19.0, target: 65.52 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - Máy Lạnh", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 32.0, target: 152.88 },
    ];
    const gop = gopDanhSachThiDua(duLieuHienTai.danhSachThiDua, mau, caiDat.danhSachCumTuLocBo);
    luuDuLieuNgay({
      ...duLieuHienTai,
      doanhThu: {
        doanhThuThuc: 8541.0,
        targetThuc: 14466.4,
        doanhThuQuyDoi: 11438.0,
        targetQuyDoi: 19444.1,
      },
      danhSachThiDua: gop,
      capNhatLuc: "23:45:21",
      thongTinDonVi: "ĐML_QNG_QNG",
    });
    setMoModalNhapMau(false);
  }

  function moHopSuaDong(dong: DongThiDua, laThemMoi = false) {
    setDongDangSua({ dong, laThemMoi });
    setFormDong({
      ten: dong.tenNganhHang,
      dvt: dong.loaiChiTieu,
      thucHien: laThemMoi ? "" : String(dong.thucHien),
      target: laThemMoi ? "" : String(dong.target),
    });
  }

  function luuDongDangSua() {
    if (!dongDangSua) return;
    const tenSach = formDong.ten.trim();
    if (!tenSach) return;
    const thucHien = Number(formDong.thucHien.replace(",", ".")) || 0;
    const target = Number(formDong.target.replace(",", ".")) || 0;

    const capNhat: DongThiDua = {
      ...dongDangSua.dong,
      tenNganhHangGoc: tenSach,
      tenNganhHang: apDungLocTuCaiDat(tenSach, caiDat.danhSachCumTuLocBo),
      loaiChiTieu: formDong.dvt,
      thucHien,
      target,
    };

    const ds = dongDangSua.laThemMoi
      ? [...duLieuHienTai.danhSachThiDua, capNhat]
      : duLieuHienTai.danhSachThiDua.map(d => (d.id === capNhat.id ? capNhat : d));

    luuDuLieuNgay({ ...duLieuHienTai, danhSachThiDua: ds });
    setDongDangSua(null);
  }

  function xoaDong(id: string) {
    luuDuLieuNgay({
      ...duLieuHienTai,
      danhSachThiDua: duLieuHienTai.danhSachThiDua.filter(d => d.id !== id),
    });
    setDongDangSua(null);
  }

  // MARK: - Xuất File Excel (.csv) & Xuất Ảnh Báo Cáo (2 mẫu)

  function exportCsv() {
    const dt = duLieuHienTai.doanhThu;
    const lines: string[] = [];
    const csvCell = (val: string | number) => `"${String(val).replaceAll('"', '""')}"`;

    if (coDoanhThu) {
      lines.push("CHỈ SỐ CHÍNH,THỰC HIỆN,TARGET,% HOÀN THÀNH");
      const ptThuc = dt.targetThuc > 0 ? `${((dt.doanhThuThuc / dt.targetThuc) * 100).toFixed(2)}%` : "";
      const ptQD = dt.targetQuyDoi > 0 ? `${((dt.doanhThuQuyDoi / dt.targetQuyDoi) * 100).toFixed(2)}%` : "";
      lines.push(`Doanh thu thực,${dt.doanhThuThuc},${dt.targetThuc},${ptThuc}`);
      lines.push(`Doanh thu quy đổi,${dt.doanhThuQuyDoi},${dt.targetQuyDoi},${ptQD}`);
      lines.push("");
    }

    lines.push("STT,Ngành hàng (Chương trình),ĐVT,Thực hiện,Target,Thiếu / Vượt,% HT Tháng,% Dự báo,Trạng thái");
    danhSachHienThi.forEach((d, idx) => {
      const ht = tinhPhanTramHT(d);
      const db = tinhPhanTramDuBao(d, khoaNgay);
      const chenh = d.thucHien - d.target;
      const trangThai = ht >= 99.995 ? "Đạt" : "Chưa đạt";
      lines.push(
        [
          idx + 1,
          csvCell(d.tenNganhHang),
          d.loaiChiTieu,
          d.thucHien,
          d.target,
          chenh.toFixed(2),
          `${ht.toFixed(2)}%`,
          `${db.toFixed(2)}%`,
          trangThai,
        ].join(",")
      );
    });

    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TongHopDMX-${khoaNgay}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMoModalXuat(false);
  }

  async function xuatAnhBaoCao() {
    setMoModalXuat(false);
    const canvas =
      caiDat.kieuHienThi === "bangChiTiet" ? veCanvasBang8Cot() : veCanvasTheGon(caiDat.soCotXuatAnh);
    if (!canvas) return;

    canvas.toBlob(async blob => {
      if (!blob) return;
      const tenTep = `BaoCaoDMX-${khoaNgay}.png`;
      const file = new File([blob], tenTep, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Báo cáo tổng hợp ĐMX" });
          return;
        } catch {
          // Người dùng đóng hộp chia sẻ hoặc trình duyệt chặn -> tải xuống trực tiếp
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tenTep;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function veKhungBoGoc(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function veHaiTheDoanhThuLenCanvas(ctx: CanvasRenderingContext2D, x: number, y: number, tongRong: number): number {
    if (!coDoanhThu) return 0;
    const dt = duLieuHienTai.doanhThu;
    const rongThe = (tongRong - 16) / 2;
    const caoThe = 96;

    // Thẻ Thực (Xanh dương)
    const grad1 = ctx.createLinearGradient(x, y, x + rongThe, y + caoThe);
    grad1.addColorStop(0, "#2563eb");
    grad1.addColorStop(1, "#3b82f6");
    veKhungBoGoc(ctx, x, y, rongThe, caoThe, 14);
    ctx.fillStyle = grad1;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Inter, Arial, sans-serif";
    ctx.fillText("💵 DOANH THU THỰC", x + rongThe / 2, y + 22);
    ctx.font = "800 24px Inter, Arial, sans-serif";
    ctx.fillText(chuoiSoVN(dt.doanhThuThuc), x + rongThe / 2, y + 54);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x + 14, y + 66, rongThe - 28, 1);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Inter, Arial, sans-serif";
    const ptThuc = dt.targetThuc > 0 ? ` (${chuoiPhanTramVN((dt.doanhThuThuc / dt.targetThuc) * 100)})` : "";
    ctx.fillText(`TARGET: ${chuoiSoVN(dt.targetThuc)}${ptThuc}`, x + rongThe / 2, y + 84);

    // Thẻ Quy đổi (Xanh lá)
    const x2 = x + rongThe + 16;
    const grad2 = ctx.createLinearGradient(x2, y, x2 + rongThe, y + caoThe);
    grad2.addColorStop(0, "#16a34a");
    grad2.addColorStop(1, "#15803d");
    veKhungBoGoc(ctx, x2, y, rongThe, caoThe, 14);
    ctx.fillStyle = grad2;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Inter, Arial, sans-serif";
    ctx.fillText("🎯 DOANH THU QĐ", x2 + rongThe / 2, y + 22);
    ctx.font = "800 24px Inter, Arial, sans-serif";
    ctx.fillText(chuoiSoVN(dt.doanhThuQuyDoi), x2 + rongThe / 2, y + 54);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x2 + 14, y + 66, rongThe - 28, 1);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Inter, Arial, sans-serif";
    const ptQD = dt.targetQuyDoi > 0 ? ` (${chuoiPhanTramVN((dt.doanhThuQuyDoi / dt.targetQuyDoi) * 100)})` : "";
    ctx.fillText(`TARGET: ${chuoiSoVN(dt.targetQuyDoi)}${ptQD}`, x2 + rongThe / 2, y + 84);

    ctx.textAlign = "left";
    return caoThe + 16;
  }

  function veCanvasBang8Cot(): HTMLCanvasElement | null {
    const ds = danhSachHienThi;
    if (!ds.length && !coDoanhThu) return null;

    const chieuRongCot = [42, 220, 50, 92, 92, 96, 88, 88];
    const tongRongBang = chieuRongCot.reduce((a, b) => a + b, 0);
    const le = 20;
    const caoDau = 82;
    const caoDT = coDoanhThu ? 112 : 0;
    const caoHeader = 42;
    const caoDong = 50;
    const rongAnh = tongRongBang + le * 2;
    const caoAnh = le * 2 + caoDau + caoDT + caoHeader + ds.length * caoDong;

    const canvas = document.createElement("canvas");
    canvas.width = rongAnh * 2;
    canvas.height = caoAnh * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(2, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rongAnh, caoAnh);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 18px Inter, Arial, sans-serif";
    ctx.fillText(`BẢNG TỔNG HỢP THI ĐUA ĐMX - NGÀY ${hienThiNgayVN(khoaNgay)}`, le, le + 20);

    const soDatHienThi = ds.filter(d => tinhPhanTramHT(d) >= 99.995).length;
    ctx.fillStyle = "#374151";
    ctx.font = "600 13px Inter, Arial, sans-serif";
    const donViStr = duLieuHienTai.thongTinDonVi ? `${duLieuHienTai.thongTinDonVi}  |  ` : "";
    ctx.fillText(
      `${donViStr}Tổng: ${ds.length} chương trình  •  Đạt (>=100%): ${soDatHienThi}  •  Chưa đạt (<100%): ${ds.length - soDatHienThi}`,
      le,
      le + 44
    );

    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Inter, Arial, sans-serif";
    ctx.fillText(`Cập nhật: ${duLieuHienTai.capNhatLuc || new Date().toLocaleTimeString("vi-VN")}`, le, le + 64);

    let y = le + caoDau;
    y += veHaiTheDoanhThuLenCanvas(ctx, le, y, tongRongBang);

    // Header bảng 8 cột
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(le, y, tongRongBang, caoHeader);
    const tieuDeCot = ["STT", "NGÀNH HÀNG (CHƯƠNG TRÌNH)", "ĐVT", "THỰC HIỆN", "TARGET", "THIẾU/VƯỢT", "% HT THÁNG", "% DỰ BÁO"];
    let xCot = le;
    ctx.fillStyle = "#111827";
    ctx.font = "bold 11px Inter, Arial, sans-serif";
    tieuDeCot.forEach((chu, i) => {
      const w = chieuRongCot[i];
      ctx.textAlign = i === 1 ? "left" : "center";
      ctx.fillText(chu, i === 1 ? xCot + 8 : xCot + w / 2, y + 25);
      xCot += w;
    });

    y += caoHeader;

    ds.forEach((dong, idx) => {
      const ht = tinhPhanTramHT(dong);
      const db = tinhPhanTramDuBao(dong, khoaNgay);
      const dat = ht >= 99.995;
      const duBaoDat = db >= 99.995;

      ctx.fillStyle = dat ? "#f0fdf4" : "#fef2f2";
      ctx.fillRect(le, y, tongRongBang, caoDong);

      const giaTri = [
        String(idx + 1),
        dong.tenNganhHang,
        dong.loaiChiTieu,
        chuoiSoLieuBang(dong.thucHien),
        chuoiSoLieuBang(dong.target),
        chuoiChenhLechBang(dong.thucHien - dong.target),
        chuoiPhanTramBang(ht),
        chuoiPhanTramBang(db),
      ];

      let xO = le;
      giaTri.forEach((val, i) => {
        const w = chieuRongCot[i];
        if (i === 6 || i === 7) {
          const isGreen = i === 6 ? dat : duBaoDat;
          veKhungBoGoc(ctx, xO + 6, y + 10, w - 12, 30, 8);
          ctx.fillStyle = isGreen ? "#dcfce7" : "#fee2e2";
          ctx.fill();
          ctx.fillStyle = isGreen ? "#15803d" : "#b91c1c";
          ctx.font = "bold 12px Inter, Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(val, xO + w / 2, y + 29);
        } else {
          ctx.font = i === 0 || i === 2 ? "600 12px Inter, Arial, sans-serif" : "bold 12.5px Inter, Arial, sans-serif";
          ctx.fillStyle = i === 0 || i === 2 ? "#6b7280" : i === 5 ? (dat ? "#15803d" : "#b91c1c") : "#111827";
          ctx.textAlign = i === 1 ? "left" : i === 0 || i === 2 ? "center" : "right";
          const textX = i === 1 ? xO + 8 : i === 0 || i === 2 ? xO + w / 2 : xO + w - 8;
          ctx.fillText(val, textX, y + 29, w - 14);
        }
        xO += w;
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(xO, y, 1, caoDong);
      });

      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(le, y + caoDong - 1, tongRongBang, 1);
      y += caoDong;
    });

    ctx.strokeStyle = "#d1d5db";
    ctx.strokeRect(le, le + caoDau + caoDT, tongRongBang, caoHeader + ds.length * caoDong);
    return canvas;
  }

  function veCanvasTheGon(soCot: number): HTMLCanvasElement | null {
    const ds = danhSachHienThi;
    if (!ds.length && !coDoanhThu) return null;

    const cot = Math.max(1, Math.min(4, soCot));
    const le = 18;
    const gap = 12;
    const rongO = 320;
    const caoO = 88;
    const rongAnh = Math.max(540, le * 2 + cot * rongO + (cot - 1) * gap);
    const soHang = Math.ceil(ds.length / cot);
    const caoDau = 44;
    const caoDT = coDoanhThu ? 112 : 0;
    const caoLuoi = soHang > 0 ? soHang * caoO + Math.max(0, soHang - 1) * gap : 0;
    const caoAnh = le * 2 + caoDau + caoDT + caoLuoi;

    const canvas = document.createElement("canvas");
    canvas.width = rongAnh * 2;
    canvas.height = caoAnh * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(2, 2);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, rongAnh, caoAnh);

    const soDatHienThi = ds.filter(d => tinhPhanTramHT(d) >= 99.995).length;
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px Inter, Arial, sans-serif";
    ctx.fillText(
      `TỔNG HỢP SỐ LIỆU ĐMX - NGÀY ${hienThiNgayVN(khoaNgay)}   •   Tổng: ${ds.length} ngành hàng (Đạt: ${soDatHienThi} | Chưa đạt: ${ds.length - soDatHienThi})`,
      le,
      le + 22
    );

    let y = le + caoDau;
    y += veHaiTheDoanhThuLenCanvas(ctx, le, y, rongAnh - le * 2);

    ds.forEach((dong, i) => {
      const r = Math.floor(i / cot);
      const c = i % cot;
      const x = le + c * (rongO + gap);
      const yO = y + r * (caoO + gap);
      const ht = tinhPhanTramHT(dong);

      veKhungBoGoc(ctx, x, yO, rongO, caoO, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tên ngành hàng
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px Inter, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(dong.tenNganhHang, x + 12, yO + 24, rongO - 95);

      // Badge %
      const bgBadge = ht >= 99.995 ? "#dcfce7" : ht >= 80 ? "#fef3c7" : "#fee2e2";
      const fgBadge = ht >= 99.995 ? "#15803d" : ht >= 80 ? "#b45309" : "#b91c1c";
      veKhungBoGoc(ctx, x + rongO - 78, yO + 8, 66, 22, 11);
      ctx.fillStyle = bgBadge;
      ctx.fill();
      ctx.fillStyle = fgBadge;
      ctx.font = "bold 12px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(chuoiPhanTramVN(ht), x + rongO - 45, yO + 23);

      // Thực hiện / Target
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12.5px Inter, Arial, sans-serif";
      const strThuc = chuoiSoVN(dong.thucHien);
      ctx.fillText(strThuc, x + 12, yO + 60);
      const wThuc = ctx.measureText(strThuc).width;
      ctx.fillStyle = "#64748b";
      ctx.font = "11.5px Inter, Arial, sans-serif";
      ctx.fillText(` / ${chuoiSoVN(dong.target)} ${dong.loaiChiTieu === "SL" ? "SLLK" : "DTLK"}`, x + 12 + wThuc, yO + 60);

      // Còn / Vượt
      ctx.textAlign = "right";
      const con = Math.max(0, dong.target - dong.thucHien);
      const vuot = Math.max(0, dong.thucHien - dong.target);
      if (con > 0.005) {
        ctx.fillStyle = "#64748b";
        ctx.fillText(`Còn: ${chuoiSoVN(con)}`, x + rongO - 12, yO + 60);
      } else {
        ctx.fillStyle = "#15803d";
        ctx.fillText(`Vượt: ${chuoiSoVN(vuot)}`, x + rongO - 12, yO + 60);
      }

      // Thanh tiến độ
      veKhungBoGoc(ctx, x + 12, yO + 72, rongO - 24, 5, 2.5);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();

      const tyLe = Math.min(1, Math.max(0.03, ht / 100));
      veKhungBoGoc(ctx, x + 12, yO + 72, (rongO - 24) * tyLe, 5, 2.5);
      ctx.fillStyle = ht >= 99.995 ? "#16a34a" : ht >= 70 ? "#f59e0b" : "#dc2626";
      ctx.fill();
    });

    return canvas;
  }

  const tenMucDangChon = CAC_MUC.find(m => m.id === tabHienTai)?.tieuDe || "Thi đua";

  return (
    <main className="dmx-app">
      {/* Input chọn ảnh ẩn (Giữ thuộc tính capture="environment" cho bộ test) */}
      <input
        ref={inputAnhThiDuaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={xuLyChonAnhThiDua}
        className="dmx-hidden-input"
      />
      <input
        ref={inputAnhDoanhThuRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={xuLyChonAnhDoanhThu}
        className="dmx-hidden-input"
      />

      {/* 1. Thanh điều hướng trên cùng giống hệt App iOS */}
      <header className="dmx-topbar">
        <button className="dmx-date-btn" onClick={() => setMoModalNgay(true)}>
          <Calendar size={16} />
          <span>{hienThiNgayVN(khoaNgay)} ▾</span>
        </button>

        <div className="dmx-topbar-actions">
          <button
            className="dmx-icon-btn"
            onClick={() => setMoModalXuat(true)}
            disabled={!duLieuHienTai.danhSachThiDua.length && !coDoanhThu}
            aria-label="Xuất báo cáo"
            title="Xuất báo cáo"
          >
            <Share2 size={18} />
          </button>
          <button
            className="dmx-icon-btn"
            onClick={() => {
              setTamCaiDat(caiDat);
              setMoModalCaiDat(true);
            }}
            aria-label="Cài đặt"
            title="Cài đặt"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="dmx-container">
        {/* 2. Cụm 2 thẻ Doanh thu (DOANH THU THỰC & DOANH THU QĐ) */}
        <section className="dmx-revenue-grid" aria-label="Chỉ số doanh thu">
          <button className="dmx-rev-card blue" onClick={() => setMoModalMenuDoanhThu(true)}>
            <span className="dmx-rev-title">💵 DOANH THU THỰC</span>
            <strong className="dmx-rev-value">
              {coDoanhThu ? chuoiSoVN(duLieuHienTai.doanhThu.doanhThuThuc) : "Chạm nhập/quét"}
            </strong>
            <div className="dmx-rev-line" />
            <small className="dmx-rev-target">
              {duLieuHienTai.doanhThu.targetThuc > 0
                ? `TARGET: ${chuoiSoVN(duLieuHienTai.doanhThu.targetThuc)} (${chuoiPhanTramVN(
                    (duLieuHienTai.doanhThu.doanhThuThuc / duLieuHienTai.doanhThu.targetThuc) * 100
                  )})`
                : "TARGET: --"}
            </small>
          </button>

          <button className="dmx-rev-card green" onClick={() => setMoModalMenuDoanhThu(true)}>
            <span className="dmx-rev-dot" />
            <span className="dmx-rev-title">🎯 DOANH THU QĐ</span>
            <strong className="dmx-rev-value">
              {coDoanhThu ? chuoiSoVN(duLieuHienTai.doanhThu.doanhThuQuyDoi) : "Chạm nhập/quét"}
            </strong>
            <div className="dmx-rev-line" />
            <small className="dmx-rev-target">
              {duLieuHienTai.doanhThu.targetQuyDoi > 0
                ? `TARGET: ${chuoiSoVN(duLieuHienTai.doanhThu.targetQuyDoi)} (${chuoiPhanTramVN(
                    (duLieuHienTai.doanhThu.doanhThuQuyDoi / duLieuHienTai.doanhThu.targetQuyDoi) * 100
                  )})`
                : "TARGET: --"}
            </small>
          </button>
        </section>

        {/* 3. Cụm 4 nút chuyển mục phía dưới cụm Doanh thu: Thi đua + 3 nút dự phòng */}
        <nav className="dmx-tabs-4" aria-label="Danh mục">
          {CAC_MUC.map(muc => (
            <button
              key={muc.id}
              className={tabHienTai === muc.id ? "active" : ""}
              onClick={() => setTabHienTai(muc.id)}
            >
              {muc.tieuDe}
            </button>
          ))}
        </nav>

        {/* 4. Thanh nút Quét (Thêm ảnh mới) & Xoá quét lại nằm ngay dưới cụm 4 nút */}
        <section className="dmx-scan-bar">
          <button
            className="dmx-scan-primary"
            onClick={() => {
              if (tabHienTai === "thiDua") {
                inputAnhThiDuaRef.current?.click();
              } else {
                alert(`Mục ${tenMucDangChon} hiện đang là nút dự phòng chưa gắn chức năng.`);
              }
            }}
            title="Đọc ảnh và tạo bảng"
          >
            <Camera size={16} />
            <span>Thêm ảnh {tenMucDangChon}</span>
          </button>

          <button
            className="dmx-scan-danger"
            onClick={() => {
              if (tabHienTai !== "thiDua") return;
              if (!duLieuHienTai.danhSachThiDua.length) {
                inputAnhThiDuaRef.current?.click();
              } else {
                setMoModalXoaQuetLai(true);
              }
            }}
          >
            <RotateCcw size={15} />
            <span>Xoá quét lại</span>
          </button>

          {tabHienTai === "thiDua" && (
            <button className="dmx-scan-secondary" onClick={() => setMoModalNhapMau(true)}>
              <PlusCircle size={15} />
              <span>Nhập/Mẫu</span>
            </button>
          )}
        </section>

        {thongBaoLoi && (
          <div className="dmx-alert-error" role="alert">
            <span>{thongBaoLoi}</span>
            <button onClick={() => setThongBaoLoi("")}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* 5. Nội dung theo mục đang chọn */}
        {tabHienTai === "thiDua" ? (
          <section className="dmx-thidua-section">
            {/* Thanh lọc & sắp xếp */}
            <div className="dmx-filter-bar">
              <div className="dmx-segmented">
                <button className={boLoc === "tatCa" ? "active" : ""} onClick={() => setBoLoc("tatCa")}>
                  Tất cả ({tongSoCT})
                </button>
                <button className={boLoc === "daDat" ? "active" : ""} onClick={() => setBoLoc("daDat")}>
                  Đạt ({soDat})
                </button>
                <button className={boLoc === "chuaDat" ? "active" : ""} onClick={() => setBoLoc("chuaDat")}>
                  Chưa ({soChuaDat})
                </button>
              </div>

              <div className="dmx-sort-controls">
                <label className="dmx-sort-select">
                  <ArrowUpDown size={13} />
                  <select
                    value={kieuSapXep}
                    onChange={e => setKieuSapXep(e.target.value as KieuSapXepThiDua)}
                    aria-label="Sắp xếp ngành hàng"
                  >
                    {CAC_SAP_XEP.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nhan}
                      </option>
                    ))}
                  </select>
                </label>

                {caiDat.kieuHienThi === "theGon" && (
                  <button
                    className="dmx-col-toggle"
                    onClick={() => setSoCotDienThoai(prev => (prev === 1 ? 2 : 1))}
                  >
                    <Columns size={13} />
                    <span>{soCotDienThoai} cột</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hiển thị danh sách trống hoặc dữ liệu theo 1 trong 2 mẫu */}
            {!duLieuHienTai.danhSachThiDua.length ? (
              <div className="dmx-empty-card" onClick={() => inputAnhThiDuaRef.current?.click()}>
                <Camera size={40} />
                <strong>Chạm để chọn ảnh chụp màn hình Thi đua</strong>
                <p>
                  Chọn nhiều ảnh chụp cuộn trang cùng lúc.
                  <br />
                  Đổi kiểu hiển thị (Bảng 8 cột / Thẻ tiến độ) trong Cài đặt (⚙️).
                </p>
              </div>
            ) : caiDat.kieuHienThi === "bangChiTiet" ? (
              /* MẪU 1: BẢNG 8 CỘT CHI TIẾT */
              <div className="dmx-table-wrap">
                <table className="dmx-table-8col">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th className="left">NGÀNH HÀNG (CHƯƠNG TRÌNH)</th>
                      <th>ĐVT</th>
                      <th className="right">THỰC HIỆN</th>
                      <th className="right">TARGET</th>
                      <th className="right">THIẾU/VƯỢT</th>
                      <th>% HT THÁNG</th>
                      <th>% DỰ BÁO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danhSachHienThi.map((dong, idx) => {
                      const ht = tinhPhanTramHT(dong);
                      const db = tinhPhanTramDuBao(dong, khoaNgay);
                      const dat = ht >= 99.995;
                      const duBaoDat = db >= 99.995;
                      const chenh = dong.thucHien - dong.target;
                      return (
                        <tr
                          key={dong.id}
                          className={dat ? "row-pass" : "row-fail"}
                          onClick={() => moHopSuaDong(dong, false)}
                        >
                          <td className="center muted">{idx + 1}</td>
                          <td className="left bold">{dong.tenNganhHang}</td>
                          <td className="center muted">{dong.loaiChiTieu}</td>
                          <td className="right bold">{chuoiSoLieuBang(dong.thucHien)}</td>
                          <td className="right bold">{chuoiSoLieuBang(dong.target)}</td>
                          <td className={`right bold ${dat ? "text-green" : "text-red"}`}>
                            {chuoiChenhLechBang(chenh)}
                          </td>
                          <td className="center">
                            <span className={`dmx-pill ${dat ? "pill-green" : "pill-red"}`}>
                              {chuoiPhanTramBang(ht)}
                            </span>
                          </td>
                          <td className="center">
                            <span className={`dmx-pill ${duBaoDat ? "pill-green" : "pill-red"}`}>
                              {chuoiPhanTramBang(db)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* MẪU 2: THẺ TIẾN ĐỘ GỌN */
              <div className={`dmx-cards-grid cols-${soCotDienThoai}`}>
                {danhSachHienThi.map(dong => {
                  const ht = tinhPhanTramHT(dong);
                  const con = Math.max(0, dong.target - dong.thucHien);
                  const vuot = Math.max(0, dong.thucHien - dong.target);
                  const badgeClass =
                    ht >= 99.995 ? "badge-green" : ht >= 80 ? "badge-amber" : "badge-red";
                  const barClass =
                    ht >= 99.995 ? "bar-green" : ht >= 70 ? "bar-amber" : "bar-red";
                  const widthPct = Math.min(100, Math.max(3, ht));

                  return (
                    <article
                      key={dong.id}
                      className="dmx-item-card"
                      onClick={() => moHopSuaDong(dong, false)}
                    >
                      <div className="dmx-item-top">
                        <strong>{dong.tenNganhHang}</strong>
                        <span className={`dmx-item-badge ${badgeClass}`}>{chuoiPhanTramVN(ht)}</span>
                      </div>
                      <div className="dmx-item-mid">
                        <span>
                          <b>{chuoiSoVN(dong.thucHien)}</b> / {chuoiSoVN(dong.target)}{" "}
                          {dong.loaiChiTieu === "SL" ? "SLLK" : "DTLK"}
                        </span>
                        {con > 0.005 ? (
                          <small className="con">Còn: {chuoiSoVN(con)}</small>
                        ) : (
                          <small className="vuot">Vượt: {chuoiSoVN(vuot)}</small>
                        )}
                      </div>
                      <div className="dmx-progress-track">
                        <div className={`dmx-progress-fill ${barClass}`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* Khung cho 3 nút dự phòng */
          <section className="dmx-placeholder-card">
            <strong>{tenMucDangChon}</strong>
            <p>Mục dự phòng đang để trống cho các tính năng tiếp theo.</p>
          </section>
        )}
      </div>

      {/* Lớp phủ tiến trình đang đọc ảnh */}
      {dangQuet && (
        <div className="dmx-loading-overlay">
          <div className="dmx-loading-box">
            <LoaderCircle className="dmx-spin" size={34} />
            <p>{tienTrinhQuet || "Đang đọc ảnh chụp màn hình..."}</p>
          </div>
        </div>
      )}

      {/* MODAL 1: CÀI ĐẶT (Kiểu hiển thị, Số cột xuất ảnh, Cụm từ lọc bỏ) */}
      {moModalCaiDat && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalCaiDat(false)}>
          <div className="dmx-modal" onClick={e => e.stopPropagation()}>
            <div className="dmx-modal-head">
              <h3>Cài đặt</h3>
              <button
                className="dmx-save-btn"
                onClick={() => {
                  const dsCum = [...tamCaiDat.danhSachCumTuLocBo];
                  const dangGo = cumTuMoi.trim();
                  if (dangGo && !dsCum.some(c => c.toLowerCase() === dangGo.toLowerCase())) {
                    dsCum.unshift(dangGo);
                  }
                  setCumTuMoi("");
                  luuCaiDatMoi({ ...tamCaiDat, danhSachCumTuLocBo: dsCum });
                  setMoModalCaiDat(false);
                }}
              >
                Lưu
              </button>
            </div>

            <div className="dmx-modal-body">
              <label className="dmx-group-label">1. KIỂU HIỂN THỊ & XUẤT BÁO CÁO</label>
              <div className="dmx-setting-box">
                <p>Chọn 1 trong 2 mẫu hiển thị trên màn hình và khi xuất ảnh:</p>
                <div className="dmx-seg-2">
                  <button
                    className={tamCaiDat.kieuHienThi === "bangChiTiet" ? "active" : ""}
                    onClick={() => setTamCaiDat(prev => ({ ...prev, kieuHienThi: "bangChiTiet" }))}
                  >
                    Bảng 8 cột (Chi tiết)
                  </button>
                  <button
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
                      key={cot}
                      className={tamCaiDat.soCotXuatAnh === cot ? "active" : ""}
                      onClick={() => setTamCaiDat(prev => ({ ...prev, soCotXuatAnh: cot }))}
                    >
                      {cot} cột
                    </button>
                  ))}
                </div>
              </div>

              <label className="dmx-group-label">2. CỤM TỪ LỌC BỎ TRONG TẤT CẢ NGÀNH HÀNG</label>
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
      )}

      {/* MODAL 2: XUẤT BÁO CÁO (Xuất Ảnh & Xuất File Excel - Đã bỏ dòng copy báo cáo nhanh) */}
      {moModalXuat && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalXuat(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Xuất báo cáo tổng hợp</h4>
            <button onClick={() => void xuatAnhBaoCao()}>
              <ImageIcon size={18} />
              <span>
                🖼️ Xuất Ảnh báo cáo (
                {caiDat.kieuHienThi === "bangChiTiet"
                  ? "Mẫu Bảng 8 cột"
                  : `Mẫu Thẻ ${caiDat.soCotXuatAnh} cột`}
                )
              </span>
            </button>
            <button onClick={exportCsv}>
              <FileSpreadsheet size={18} />
              <span>📊 Xuất file Excel (.csv)</span>
            </button>
            <button className="cancel" onClick={() => setMoModalXuat(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: XOÁ ĐỂ QUÉT LẠI TỪ ĐẦU */}
      {moModalXoaQuetLai && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalXoaQuetLai(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Xoá để quét lại từ đầu?</h4>
            <p>Toàn bộ {duLieuHienTai.danhSachThiDua.length} ngành hàng hiện tại sẽ được xoá sạch.</p>
            <button
              className="danger"
              onClick={() => {
                luuDuLieuNgay({ ...duLieuHienTai, danhSachThiDua: [] });
                setMoModalXoaQuetLai(false);
                inputAnhThiDuaRef.current?.click();
              }}
            >
              <Trash2 size={17} />
              <span>🗑️ Xoá sạch & Chọn ảnh quét lại ngay</span>
            </button>
            <button
              className="danger"
              onClick={() => {
                luuDuLieuNgay({ ...duLieuHienTai, danhSachThiDua: [] });
                setMoModalXoaQuetLai(false);
              }}
            >
              <span>Chỉ xoá sạch danh sách</span>
            </button>
            <button className="cancel" onClick={() => setMoModalXoaQuetLai(false)}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: NHẬP THỦ CÔNG / MẪU THỬ */}
      {moModalNhapMau && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalNhapMau(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Thêm dữ liệu</h4>
            <button
              onClick={() => {
                setMoModalNhapMau(false);
                moHopSuaDong(
                  {
                    id: crypto.randomUUID(),
                    tenNganhHangGoc: "T10 - ",
                    tenNganhHang: "T10 - ",
                    loaiChiTieu: "DT",
                    thucHien: 0,
                    target: 0,
                  },
                  true
                );
              }}
            >
              <PlusCircle size={18} />
              <span>➕ Thêm 1 ngành hàng thủ công</span>
            </button>
            <button onClick={napDuLieuMau}>
              <Sparkles size={18} />
              <span>✨ Nạp dữ liệu mẫu thử</span>
            </button>
            <button className="cancel" onClick={() => setMoModalNhapMau(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: MENU THẺ DOANH THU */}
      {moModalMenuDoanhThu && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalMenuDoanhThu(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Doanh thu Thực & Quy đổi</h4>
            <button
              onClick={() => {
                setMoModalMenuDoanhThu(false);
                inputAnhDoanhThuRef.current?.click();
              }}
            >
              <Camera size={18} />
              <span>📷 Chọn 1 ảnh chụp màn hình Doanh thu</span>
            </button>
            <button
              onClick={() => {
                setMoModalMenuDoanhThu(false);
                const dt = duLieuHienTai.doanhThu;
                setFormDT({
                  thuc: dt.doanhThuThuc > 0 ? String(dt.doanhThuThuc) : "",
                  targetThuc: dt.targetThuc > 0 ? String(dt.targetThuc) : "",
                  qd: dt.doanhThuQuyDoi > 0 ? String(dt.doanhThuQuyDoi) : "",
                  targetQD: dt.targetQuyDoi > 0 ? String(dt.targetQuyDoi) : "",
                });
                setMoModalSuaDoanhThu(true);
              }}
            >
              <Pencil size={18} />
              <span>✏️ Nhập / Sửa tay số liệu Doanh thu</span>
            </button>
            {coDoanhThu && (
              <button
                className="danger"
                onClick={() => {
                  luuDuLieuNgay({
                    ...duLieuHienTai,
                    doanhThu: { doanhThuThuc: 0, targetThuc: 0, doanhThuQuyDoi: 0, targetQuyDoi: 0 },
                  });
                  setMoModalMenuDoanhThu(false);
                }}
              >
                <Trash2 size={18} />
                <span>🗑️ Xoá số liệu Doanh thu</span>
              </button>
            )}
            <button className="cancel" onClick={() => setMoModalMenuDoanhThu(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: FORM NHẬP / SỬA DOANH THU */}
      {moModalSuaDoanhThu && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalSuaDoanhThu(false)}>
          <div className="dmx-modal" onClick={e => e.stopPropagation()}>
            <div className="dmx-modal-head">
              <h3>Số liệu Doanh thu</h3>
              <button
                className="dmx-save-btn"
                onClick={() => {
                  const doc = (s: string) => Number(s.replace(",", ".").trim()) || 0;
                  luuDuLieuNgay({
                    ...duLieuHienTai,
                    doanhThu: {
                      doanhThuThuc: doc(formDT.thuc),
                      targetThuc: doc(formDT.targetThuc),
                      doanhThuQuyDoi: doc(formDT.qd),
                      targetQuyDoi: doc(formDT.targetQD),
                    },
                  });
                  setMoModalSuaDoanhThu(false);
                }}
              >
                Lưu
              </button>
            </div>
            <div className="dmx-form-grid">
              <label>
                <span>Doanh thu thực</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 8541"
                  value={formDT.thuc}
                  onChange={e => setFormDT(p => ({ ...p, thuc: e.target.value }))}
                />
              </label>
              <label>
                <span>Target thực</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 14466.40"
                  value={formDT.targetThuc}
                  onChange={e => setFormDT(p => ({ ...p, targetThuc: e.target.value }))}
                />
              </label>
              <label>
                <span>Doanh thu quy đổi</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 11438"
                  value={formDT.qd}
                  onChange={e => setFormDT(p => ({ ...p, qd: e.target.value }))}
                />
              </label>
              <label>
                <span>Target quy đổi</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 19444.10"
                  value={formDT.targetQD}
                  onChange={e => setFormDT(p => ({ ...p, targetQD: e.target.value }))}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: SỬA / THÊM NGÀNH HÀNG THI ĐUA */}
      {dongDangSua && (
        <div className="dmx-modal-backdrop" onClick={() => setDongDangSua(null)}>
          <div className="dmx-modal" onClick={e => e.stopPropagation()}>
            <div className="dmx-modal-head">
              <h3>{dongDangSua.laThemMoi ? "Thêm ngành hàng" : "Sửa ngành hàng"}</h3>
              <button className="dmx-save-btn" onClick={luuDongDangSua}>
                Lưu
              </button>
            </div>
            <div className="dmx-form-grid">
              <label>
                <span>Tên ngành hàng</span>
                <input
                  type="text"
                  placeholder="VD: T10 - AUDIO"
                  value={formDong.ten}
                  onChange={e => setFormDong(p => ({ ...p, ten: e.target.value }))}
                />
              </label>
              <label>
                <span>Đơn vị tính</span>
                <div className="dmx-seg-2">
                  <button
                    type="button"
                    className={formDong.dvt === "DT" ? "active" : ""}
                    onClick={() => setFormDong(p => ({ ...p, dvt: "DT" }))}
                  >
                    Doanh thu (DT)
                  </button>
                  <button
                    type="button"
                    className={formDong.dvt === "SL" ? "active" : ""}
                    onClick={() => setFormDong(p => ({ ...p, dvt: "SL" }))}
                  >
                    Số lượng (SL)
                  </button>
                </div>
              </label>
              <label>
                <span>Thực hiện</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 52.00"
                  value={formDong.thucHien}
                  onChange={e => setFormDong(p => ({ ...p, thucHien: e.target.value }))}
                />
              </label>
              <label>
                <span>Target</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 55.12"
                  value={formDong.target}
                  onChange={e => setFormDong(p => ({ ...p, target: e.target.value }))}
                />
              </label>
              {!dongDangSua.laThemMoi && (
                <button className="dmx-delete-row-btn" onClick={() => xoaDong(dongDangSua.dong.id)}>
                  <Trash2 size={15} />
                  <span>Xoá ngành hàng này</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: CHỌN NGÀY & LỊCH SỬ NGÀY */}
      {moModalNgay && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalNgay(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Chọn ngày báo cáo</h4>
            <div className="dmx-date-picker-row">
              <input
                type="date"
                value={khoaNgay}
                onChange={e => {
                  if (e.target.value) {
                    setKhoaNgay(e.target.value);
                    setMoModalNgay(false);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                setKhoaNgay(khoaHomNay());
                setMoModalNgay(false);
              }}
            >
              <span>Hôm nay ({hienThiNgayVN(khoaHomNay())})</span>
            </button>
            {Object.keys(cacNgay)
              .sort((a, b) => b.localeCompare(a))
              .slice(0, 10)
              .map(k => {
                const dl = cacNgay[k];
                if (!dl || (!dl.danhSachThiDua.length && !dl.doanhThu.doanhThuThuc)) return null;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setKhoaNgay(k);
                      setMoModalNgay(false);
                    }}
                  >
                    <span>
                      Ngày {hienThiNgayVN(k)} ({dl.danhSachThiDua.length} ngành hàng)
                    </span>
                  </button>
                );
              })}
            <button className="cancel" onClick={() => setMoModalNgay(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

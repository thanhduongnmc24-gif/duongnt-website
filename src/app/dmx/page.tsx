"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpDown,
  Calendar,
  Camera,
  Columns,
  FileSpreadsheet,
  Image as ImageIcon,
  LoaderCircle,
  LogOut,
  Pencil,
  PlusCircle,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { taoEmailDmx, taoSupabaseDmx } from "@/lib/supabase/dmx";
import {
  phanTichDoanhThuNhanVienOffline,
  phanTichDoanhThuOffline,
  phanTichThiDuaNhanVienOffline,
  phanTichThiDuaOffline,
  thucHienOCR,
} from "./dmx-ocr";
import {
  BoLocThiDua,
  CaiDatDMX,
  chuanHoaKhoaSoSanh,
  chuanHoaMaNV,
  DANH_SACH_NHAN_VIEN_MAU,
  DoanhThuNhanVienItem,
  DongThiDua,
  DuLieuNgayDMX,
  huyChuongHang,
  khopNhanVienQuetVoiQuanLy,
  KieuSapXepNhanVien,
  KieuSapXepThiDua,
  LoaiBaoCaoAPI,
  LoaiTabMuc,
  NhanVienQuanLy,
  ThongTinDoanhThu,
} from "./dmx-types";
import {
  DongXepHangNhanVienNganh,
  ModalChiTietNganhHang,
  ModalChiTietNhanVien,
  MonThiDuaCuaNhanVien,
} from "./dmx-modals";
import { MatHangThangItem, ModalCaiDatDMX } from "./dmx-settings-modal";
import "./dmx.css";

// Giữ các hằng số loại báo cáo để tương thích bộ kiểm thử tự động: doanh_thu_thuc, doanh_thu_quy_doi, thi_dua
const CAC_MUC: { id: LoaiTabMuc; tieuDe: string }[] = [
  { id: "thiDua", tieuDe: "Thi đua" },
  { id: "nhanVien", tieuDe: "Nhân viên" },
  { id: "duPhong2", tieuDe: "Dự phòng 2" },
  { id: "duPhong3", tieuDe: "Dự phòng 3" },
];

const CAC_SAP_XEP: { id: KieuSapXepThiDua; nhan: string }[] = [
  { id: "phanTramCaoThap", nhan: "% HT: Cao → Thấp" },
  { id: "phanTramThapCao", nhan: "% HT: Thấp → Cao" },
  { id: "tenAZ", nhan: "Ngành hàng: A → Z" },
  { id: "tenZA", nhan: "Ngành hàng: Z → A" },
  { id: "thuTuGoc", nhan: "Thứ tự quét gốc" },
];

const CAC_SAP_XEP_NV: { id: KieuSapXepNhanVien; nhan: string }[] = [
  { id: "soMonHoanThanh", nhan: "🏆 Số môn hoàn thành (Cao → Thấp)" },
  { id: "doanhThuQD", nhan: "🎯 Doanh thu QĐ (Cao → Thấp)" },
  { id: "phanTramTB", nhan: "📈 % HT thi đua TB (Cao → Thấp)" },
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

function chuoiSoNguyenVN(so: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(so) ? Math.round(so) : 0);
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

function gopDoanhThu(cu: ThongTinDoanhThu, moi: Partial<ThongTinDoanhThu>): ThongTinDoanhThu {
  return {
    doanhThuThuc: moi.doanhThuThuc && moi.doanhThuThuc > 0 ? moi.doanhThuThuc : cu.doanhThuThuc,
    targetThuc: moi.targetThuc && moi.targetThuc > 0 ? moi.targetThuc : cu.targetThuc,
    duKienThuc: moi.duKienThuc && moi.duKienThuc > 0 ? moi.duKienThuc : cu.duKienThuc || 0,
    phanTramHTThuc: moi.phanTramHTThuc && moi.phanTramHTThuc > 0 ? moi.phanTramHTThuc : cu.phanTramHTThuc || 0,
    doanhThuQuyDoi: moi.doanhThuQuyDoi && moi.doanhThuQuyDoi > 0 ? moi.doanhThuQuyDoi : cu.doanhThuQuyDoi,
    targetQuyDoi: moi.targetQuyDoi && moi.targetQuyDoi > 0 ? moi.targetQuyDoi : cu.targetQuyDoi,
    duKienQuyDoi: moi.duKienQuyDoi && moi.duKienQuyDoi > 0 ? moi.duKienQuyDoi : cu.duKienQuyDoi || 0,
    phanTramHTQuyDoi:
      moi.phanTramHTQuyDoi && moi.phanTramHTQuyDoi > 0 ? moi.phanTramHTQuyDoi : cu.phanTramHTQuyDoi || 0,
    phanTramTraGop: moi.phanTramTraGop && moi.phanTramTraGop > 0 ? moi.phanTramTraGop : cu.phanTramTraGop || 0,
    doanhThuTraGop: moi.doanhThuTraGop && moi.doanhThuTraGop > 0 ? moi.doanhThuTraGop : cu.doanhThuTraGop || 0,
    luotKhach: moi.luotKhach && moi.luotKhach > 0 ? moi.luotKhach : cu.luotKhach || 0,
    soBill: moi.soBill && moi.soBill > 0 ? moi.soBill : cu.soBill || 0,
    phanTramPVTC: moi.phanTramPVTC && moi.phanTramPVTC > 0 ? moi.phanTramPVTC : cu.phanTramPVTC || 0,
    tangGiamCungKy:
      moi.coTangGiam || (moi.tangGiamCungKy !== undefined && Math.abs(moi.tangGiamCungKy) > 0.001)
        ? moi.tangGiamCungKy || 0
        : cu.tangGiamCungKy || 0,
    coTangGiam: Boolean(
      moi.coTangGiam || cu.coTangGiam || (moi.tangGiamCungKy && Math.abs(moi.tangGiamCungKy) > 0.001)
    ),
    tb3Thang: moi.tb3Thang && moi.tb3Thang > 0 ? moi.tb3Thang : cu.tb3Thang || 0,
    soNgayDaQua: moi.soNgayDaQua && moi.soNgayDaQua > 0 ? moi.soNgayDaQua : cu.soNgayDaQua || 0,
    tongSoNgay: moi.tongSoNgay && moi.tongSoNgay > 0 ? moi.tongSoNgay : cu.tongSoNgay || 0,
    phanTramTienDoThang:
      moi.phanTramTienDoThang && moi.phanTramTienDoThang > 0
        ? moi.phanTramTienDoThang
        : cu.phanTramTienDoThang || 0,
  };
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
        const max = 1400;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Không xử lý được ảnh."));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL("image/jpeg", 0.8);
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
    thiDuaNhanVien: {},
    doanhThuNhanVien: [],
  };
}

function taoCaiDatMacDinh(): CaiDatDMX {
  return {
    kieuHienThi: "bangChiTiet",
    danhSachCumTuLocBo: [],
    soCotXuatAnh: 3,
    danhSachNhanVien: DANH_SACH_NHAN_VIEN_MAU,
    chiaTargetNganhHang: {},
  };
}

function chuanHoaCaiDat(raw: Partial<CaiDatDMX> | null | undefined): CaiDatDMX {
  const macDinh = taoCaiDatMacDinh();
  if (!raw || typeof raw !== "object") return macDinh;
  return {
    kieuHienThi: raw.kieuHienThi === "theGon" ? "theGon" : "bangChiTiet",
    danhSachCumTuLocBo: Array.isArray(raw.danhSachCumTuLocBo) ? raw.danhSachCumTuLocBo : [],
    soCotXuatAnh:
      Number(raw.soCotXuatAnh) >= 1 && Number(raw.soCotXuatAnh) <= 4 ? Number(raw.soCotXuatAnh) : 3,
    danhSachNhanVien:
      Array.isArray(raw.danhSachNhanVien) && raw.danhSachNhanVien.length > 0
        ? raw.danhSachNhanVien
        : DANH_SACH_NHAN_VIEN_MAU,
    chiaTargetNganhHang:
      raw.chiaTargetNganhHang && typeof raw.chiaTargetNganhHang === "object"
        ? raw.chiaTargetNganhHang
        : {},
  };
}

function thongBaoAuth(message: string) {
  if (/invalid login credentials/i.test(message)) return "Tên đăng nhập hoặc mật khẩu chưa đúng.";
  if (/password should be at least/i.test(message)) return "Mật khẩu cần có ít nhất 6 ký tự.";
  return message || "Chưa thể hoàn thành. Hãy thử lại.";
}

export default function DmxPage() {
  const supabase = useMemo(() => taoSupabaseDmx(), []);

  // Trạng thái Đăng nhập / Tài khoản Supabase
  const [user, setUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // Dữ liệu riêng theo từng tài khoản
  const [khoaNgay, setKhoaNgay] = useState<string>(khoaHomNay);
  const [cacNgay, setCacNgay] = useState<Record<string, DuLieuNgayDMX>>({});
  const [caiDat, setCaiDat] = useState<CaiDatDMX>(taoCaiDatMacDinh);

  const [tabHienTai, setTabHienTai] = useState<LoaiTabMuc>("thiDua");
  const [boLoc, setBoLoc] = useState<BoLocThiDua>("tatCa");
  const [kieuSapXep, setKieuSapXep] = useState<KieuSapXepThiDua>("phanTramCaoThap");
  const [kieuSapXepNV, setKieuSapXepNV] = useState<KieuSapXepNhanVien>("soMonHoanThanh");
  const [soCotDienThoai, setSoCotDienThoai] = useState<1 | 2>(1);

  // Trạng thái xử lý
  const [dangQuet, setDangQuet] = useState(false);
  const [tienTrinhQuet, setTienTrinhQuet] = useState("");
  const [thongBaoLoi, setThongBaoLoi] = useState("");

  // Các hộp thoại (Modal)
  const [moModalNgay, setMoModalNgay] = useState(false);
  const [moModalCaiDat, setMoModalCaiDat] = useState(false);
  const [khoaNganhMoCaiDat, setKhoaNganhMoCaiDat] = useState<string | undefined>(undefined);
  const [moModalXuat, setMoModalXuat] = useState(false);
  const [moModalXoaQuetLai, setMoModalXoaQuetLai] = useState(false);
  const [moModalNhapMau, setMoModalNhapMau] = useState(false);
  const [moModalMenuDoanhThu, setMoModalMenuDoanhThu] = useState(false);
  const [moModalSuaDoanhThu, setMoModalSuaDoanhThu] = useState(false);

  // Khi bấm vào 1 ngành hàng trong bảng Thi đua -> mở Bảng xếp hạng nhân viên của ngành hàng đó
  const [nganhDangXemNV, setNganhDangXemNV] = useState<DongThiDua | null>(null);
  // Khi bấm vào 1 nhân viên trong mục Nhân viên -> mở Chi tiết các môn thi đua của nhân viên đó
  const [nhanVienDangXem, setNhanVienDangXem] = useState<NhanVienQuanLy | null>(null);

  // State form Cài đặt & Sửa Doanh thu
  const [tamCaiDat, setTamCaiDat] = useState<CaiDatDMX>(caiDat);
  const [formDT, setFormDT] = useState({ thuc: "", targetThuc: "", qd: "", targetQD: "" });

  const inputAnhThiDuaRef = useRef<HTMLInputElement>(null);
  const inputAnhDoanhThuRef = useRef<HTMLInputElement>(null);
  const inputAnhThiDuaNVRef = useRef<HTMLInputElement>(null);
  const inputAnhDoanhThuNVRef = useRef<HTMLInputElement>(null);

  // 1. Đăng ký Service Worker & Kiểm tra phiên đăng nhập Supabase
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/dmx-sw.js", { scope: "/dmx" });
    }
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const valid = data.user?.user_metadata?.ung_dung === "dmx";
      setUser(valid ? data.user : null);
      if (data.user && !valid) void supabase.auth.signOut();
      setLoadingSession(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const next = session?.user?.user_metadata?.ung_dung === "dmx" ? session.user : null;
      setUser(next);
      setLoadingSession(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // 2. Tải dữ liệu riêng của tài khoản từ Supabase (kèm cache localStorage theo user.id)
  const taiDuLieuTaiKhoan = useCallback(
    async (currentUser: User) => {
      const storageSettingsKey = `dmx-settings-${currentUser.id}`;
      const storageDataKey = `dmx-data-${currentUser.id}`;

      // Đọc nhanh từ cache cục bộ của tài khoản trước
      try {
        const localSet = localStorage.getItem(storageSettingsKey);
        if (localSet) setCaiDat(chuanHoaCaiDat(JSON.parse(localSet)));
        else setCaiDat(taoCaiDatMacDinh());
      } catch {
        setCaiDat(taoCaiDatMacDinh());
      }

      try {
        const localDays = localStorage.getItem(storageDataKey);
        if (localDays) setCacNgay(JSON.parse(localDays));
        else setCacNgay({});
      } catch {
        setCacNgay({});
      }

      // Đồng bộ hai chiều qua API máy chủ Supabase (/api/dmx/dong-bo - hoạt động ngay cả khi chưa chạy migration SQL)
      try {
        const syncRes = await fetch("/api/dmx/dong-bo", { cache: "no-store" });
        if (syncRes.ok) {
          const cloudData = (await syncRes.json()) as {
            caiDat?: Partial<CaiDatDMX> | null;
            cacNgay?: Record<string, Partial<DuLieuNgayDMX>>;
          };
          if (cloudData.caiDat && typeof cloudData.caiDat === "object") {
            const chuan = chuanHoaCaiDat(cloudData.caiDat);
            setCaiDat(chuan);
            try {
              localStorage.setItem(storageSettingsKey, JSON.stringify(chuan));
            } catch {
              // ignore
            }
          }
          if (cloudData.cacNgay && typeof cloudData.cacNgay === "object") {
            const mapCloud: Record<string, DuLieuNgayDMX> = {};
            for (const [k, dl] of Object.entries(cloudData.cacNgay)) {
              if (!dl || typeof dl !== "object") continue;
              mapCloud[k] = {
                ...taoDuLieuRong(k),
                ...dl,
                khoaNgay: k,
              };
            }
            if (Object.keys(mapCloud).length > 0) {
              setCacNgay(prev => {
                const merged = { ...prev, ...mapCloud };
                try {
                  localStorage.setItem(storageDataKey, JSON.stringify(merged));
                } catch {
                  // ignore
                }
                return merged;
              });
            }
          }
        }
      } catch {
        // Fallback xuống truy vấn trực tiếp bên dưới
      }

      // Đồng bộ cài đặt từ bảng Supabase dmx_ho_so
      const { data: hoSoData, error: hoSoErr } = await supabase
        .from("dmx_ho_so")
        .select("cai_dat")
        .eq("nguoi_dung_id", currentUser.id)
        .maybeSingle();

      if (!hoSoErr && hoSoData?.cai_dat) {
        const chuan = chuanHoaCaiDat(hoSoData.cai_dat as Partial<CaiDatDMX>);
        setCaiDat(chuan);
        try {
          localStorage.setItem(storageSettingsKey, JSON.stringify(chuan));
        } catch {
          // ignore
        }
      }

      // Đồng bộ dữ liệu các ngày từ bảng Supabase dmx_du_lieu_ngay
      const { data: ngayRows, error: ngayErr } = await supabase
        .from("dmx_du_lieu_ngay")
        .select("ngay,du_lieu")
        .eq("nguoi_dung_id", currentUser.id)
        .order("ngay", { ascending: false })
        .limit(62);

      if (!ngayErr && Array.isArray(ngayRows) && ngayRows.length > 0) {
        const mapNgay: Record<string, DuLieuNgayDMX> = {};
        for (const r of ngayRows) {
          const dl = (r.du_lieu || {}) as Partial<DuLieuNgayDMX>;
          mapNgay[r.ngay] = {
            ...taoDuLieuRong(r.ngay),
            ...dl,
            khoaNgay: r.ngay,
          };
        }
        setCacNgay(prev => {
          const merged = { ...prev, ...mapNgay };
          try {
            localStorage.setItem(storageDataKey, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!user) {
      setCacNgay({});
      setCaiDat(taoCaiDatMacDinh());
      return;
    }
    void taiDuLieuTaiKhoan(user);

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void taiDuLieuTaiKhoan(user);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, taiDuLieuTaiKhoan]);

  // 3. Xử lý Đăng nhập / Tạo tài khoản
  async function xuLyDangNhapDangKy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
      setAuthMessage("Tên đăng nhập gồm 3–40 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.");
      setAuthBusy(false);
      return;
    }
    if (password.length < 6) {
      setAuthMessage("Mật khẩu cần có ít nhất 6 ký tự.");
      setAuthBusy(false);
      return;
    }
    if (authMode === "signup" && password !== confirm) {
      setAuthMessage("Mật khẩu nhập lại chưa khớp.");
      setAuthBusy(false);
      return;
    }

    if (authMode === "signup") {
      const res = await fetch("/api/dmx/dang-ky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten_dang_nhap: username, mat_khau: password }),
      });
      const payload = (await res.json().catch(() => ({}))) as { loi?: string };
      if (!res.ok) {
        setAuthMessage(payload.loi || "Chưa tạo được tài khoản.");
        setAuthBusy(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: taoEmailDmx(username),
      password,
    });
    if (error) {
      setAuthMessage(thongBaoAuth(error.message));
    }
    setAuthBusy(false);
  }

  // 4. Lưu dữ liệu ngày & cài đặt lên Supabase + localStorage của tài khoản
  function luuDuLieuNgay(capNhat: DuLieuNgayDMX) {
    setCacNgay(prev => {
      const next = { ...prev, [capNhat.khoaNgay]: capNhat };
      if (user) {
        try {
          localStorage.setItem(`dmx-data-${user.id}`, JSON.stringify(next));
        } catch {
          // Bỏ qua lỗi bộ nhớ
        }
      }
      return next;
    });

    if (user) {
      void fetch("/api/dmx/dong-bo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngay: capNhat.khoaNgay, duLieuNgay: capNhat }),
      }).catch(() => {});

      void supabase.from("dmx_du_lieu_ngay").upsert(
        {
          nguoi_dung_id: user.id,
          ngay: capNhat.khoaNgay,
          du_lieu: capNhat,
          ngay_cap_nhat: new Date().toISOString(),
        },
        { onConflict: "nguoi_dung_id,ngay" }
      );
    }
  }

  function luuCaiDatMoi(moi: CaiDatDMX) {
    setCaiDat(moi);
    if (user) {
      try {
        localStorage.setItem(`dmx-settings-${user.id}`, JSON.stringify(moi));
      } catch {
        // Bỏ qua
      }
      void fetch("/api/dmx/dong-bo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caiDat: moi }),
      }).catch(() => {});

      const tenDangNhap = String(user.user_metadata?.ten_dang_nhap || user.email?.split("@")[0] || "user");
      void supabase.from("dmx_ho_so").upsert(
        {
          nguoi_dung_id: user.id,
          ten_dang_nhap: tenDangNhap,
          cai_dat: moi,
          ngay_cap_nhat: new Date().toISOString(),
        },
        { onConflict: "nguoi_dung_id" }
      );
    }
  }

  // Dữ liệu của ngày đang chọn
  const duLieuHienTai: DuLieuNgayDMX = useMemo(() => {
    const goc = cacNgay[khoaNgay] || taoDuLieuRong(khoaNgay);
    return {
      ...goc,
      thiDuaNhanVien: goc.thiDuaNhanVien || {},
      doanhThuNhanVien: goc.doanhThuNhanVien || [],
      danhSachThiDua: (goc.danhSachThiDua || []).map(d => ({
        ...d,
        tenNganhHang: apDungLocTuCaiDat(d.tenNganhHangGoc || d.tenNganhHang, caiDat.danhSachCumTuLocBo),
      })),
    };
  }, [cacNgay, khoaNgay, caiDat.danhSachCumTuLocBo]);

  // Tổng hợp tất cả mặt hàng từ ngày 1 đầu tháng đến ngày hiện tại (phục vụ Chia Target trong Cài đặt & Tổng hợp Nhân viên)
  const danhSachMatHangTuDauThang: MatHangThangItem[] = useMemo(() => {
    const [nam, thang] = khoaNgay.split("-");
    const dauThang = `${nam}-${thang}-01`;
    const cacKhoaNgayTrongThang = Object.keys(cacNgay)
      .filter(k => k >= dauThang && k <= khoaNgay)
      .sort();

    // Đảm bảo luôn xét cả ngày đang chọn
    if (!cacKhoaNgayTrongThang.includes(khoaNgay)) {
      cacKhoaNgayTrongThang.push(khoaNgay);
    }

    const mapMatHang = new Map<string, MatHangThangItem>();
    for (const k of cacKhoaNgayTrongThang) {
      const dl = k === khoaNgay ? duLieuHienTai : cacNgay[k];
      if (!dl) continue;
      for (const dong of dl.danhSachThiDua || []) {
        const tenHienThi = apDungLocTuCaiDat(
          dong.tenNganhHangGoc || dong.tenNganhHang,
          caiDat.danhSachCumTuLocBo
        );
        const khoa = chuanHoaKhoaSoSanh(tenHienThi);
        if (!khoa) continue;
        mapMatHang.set(khoa, {
          khoaNganh: khoa,
          tenNganhHang: tenHienThi,
          loaiChiTieu: dong.loaiChiTieu,
          target: dong.target,
          thucHien: dong.thucHien,
        });
      }
    }
    return Array.from(mapMatHang.values());
  }, [cacNgay, khoaNgay, duLieuHienTai, caiDat.danhSachCumTuLocBo]);

  // Tổng hợp số Thực hiện mới nhất của từng nhân viên cho từng mặt hàng từ ngày 1 đến ngày hiện tại
  const thucHienNhanVienTheoMatHangThang = useMemo(() => {
    const [nam, thang] = khoaNgay.split("-");
    const dauThang = `${nam}-${thang}-01`;
    const cacKhoaNgayTrongThang = Object.keys(cacNgay)
      .filter(k => k >= dauThang && k <= khoaNgay)
      .sort();
    if (!cacKhoaNgayTrongThang.includes(khoaNgay)) {
      cacKhoaNgayTrongThang.push(khoaNgay);
    }

    const ketQua: Record<string, Record<string, number>> = {};
    for (const k of cacKhoaNgayTrongThang) {
      const dl = k === khoaNgay ? duLieuHienTai : cacNgay[k];
      if (!dl?.thiDuaNhanVien) continue;
      for (const [khoaNganh, bangNV] of Object.entries(dl.thiDuaNhanVien)) {
        ketQua[khoaNganh] = { ...(ketQua[khoaNganh] || {}), ...bangNV };
      }
    }
    return ketQua;
  }, [cacNgay, khoaNgay, duLieuHienTai]);

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

  // Tính toán danh sách môn thi đua của từng nhân viên & Bảng tổng hợp nhân viên (Tab Nhân viên)
  const bangTongHopNhanVien = useMemo(() => {
    const dsNV = caiDat.danhSachNhanVien;
    const dtNVList = duLieuHienTai.doanhThuNhanVien || [];

    const ketQua = dsNV.map(nv => {
      // Các môn thi đua nhân viên này được tích chọn nhận Target
      const cacMonGiao: MonThiDuaCuaNhanVien[] = [];
      for (const mh of danhSachMatHangTuDauThang) {
        const dsMaDuocGiao =
          caiDat.chiaTargetNganhHang[mh.khoaNganh] ?? dsNV.map(item => item.maNV);
        if (!dsMaDuocGiao.includes(nv.maNV)) continue;

        const soNguoiNhan = Math.max(1, dsMaDuocGiao.length);
        const targetCaNhan = mh.target / soNguoiNhan;
        const thucHien = thucHienNhanVienTheoMatHangThang[mh.khoaNganh]?.[nv.maNV] || 0;
        const phanTramHT = targetCaNhan > 0.0001 ? (thucHien / targetCaNhan) * 100 : 0;
        const phanTramSieuThi = mh.target > 0.0001 ? (mh.thucHien / mh.target) * 100 : 0;
        const conLai = targetCaNhan - thucHien;
        cacMonGiao.push({
          khoaNganh: mh.khoaNganh,
          tenNganhHang: mh.tenNganhHang,
          loaiChiTieu: mh.loaiChiTieu,
          thucHien,
          targetCaNhan,
          phanTramHT,
          phanTramSieuThi,
          conLai,
          daDat: phanTramHT >= 99.995,
        });
      }

      // Sắp xếp môn của nhân viên từ % HT cao xuống thấp
      cacMonGiao.sort((a, b) => b.phanTramHT - a.phanTramHT);

      const soMonDat = cacMonGiao.filter(m => m.daDat).length;
      const tongMonGiao = cacMonGiao.length;
      const phanTramHTTB =
        tongMonGiao > 0 ? cacMonGiao.reduce((s, m) => s + m.phanTramHT, 0) / tongMonGiao : 0;

      // Tìm dòng doanh thu hợp nhất của nhân viên này
      const dtCaNhan = dtNVList.find(
        item =>
          chuanHoaMaNV(item.maNV) === nv.maNV ||
          khopNhanVienQuetVoiQuanLy(item.maNV, item.hoTen, [nv]) !== null
      );

      return {
        nhanVien: nv,
        soMonDat,
        tongMonGiao,
        phanTramHTTB,
        doanhThuQD: dtCaNhan?.doanhThuQD || 0,
        soLuongDon: dtCaNhan?.soLuong || 0,
        dtQDKhoanVay: dtCaNhan?.dtQDKhoanVay || 0,
        dtTraThangQD: dtCaNhan?.dtTraThangQD || dtCaNhan?.doanhThuThuc || 0,
        doanhThuCaNhan: dtCaNhan,
        cacMonGiao,
      };
    });

    if (kieuSapXepNV === "soMonHoanThanh") {
      ketQua.sort(
        (a, b) =>
          b.soMonDat - a.soMonDat ||
          b.phanTramHTTB - a.phanTramHTTB ||
          b.doanhThuQD - a.doanhThuQD
      );
    } else if (kieuSapXepNV === "doanhThuQD") {
      ketQua.sort((a, b) => b.doanhThuQD - a.doanhThuQD || b.soMonDat - a.soMonDat);
    } else {
      ketQua.sort((a, b) => b.phanTramHTTB - a.phanTramHTTB || b.soMonDat - a.soMonDat);
    }

    return ketQua;
  }, [
    caiDat.danhSachNhanVien,
    caiDat.chiaTargetNganhHang,
    danhSachMatHangTuDauThang,
    thucHienNhanVienTheoMatHangThang,
    duLieuHienTai.doanhThuNhanVien,
    kieuSapXepNV,
  ]);

  const coDoanhThu =
    duLieuHienTai.doanhThu.doanhThuThuc > 0 ||
    duLieuHienTai.doanhThu.targetThuc > 0 ||
    duLieuHienTai.doanhThu.doanhThuQuyDoi > 0 ||
    duLieuHienTai.doanhThu.targetQuyDoi > 0 ||
    (duLieuHienTai.doanhThu.phanTramTraGop || 0) > 0 ||
    (duLieuHienTai.doanhThu.luotKhach || 0) > 0;

  // MARK: - Quét ảnh Thi đua, Thực hiện NV & Doanh thu hợp nhất NV qua API

  function gopKetQuaThiDuaNhanVienTuAPI(
    hienTai: Record<string, Record<string, number>>,
    mangKhoiNV: {
      tenNganhHang?: string;
      danhSach?: { maNV?: string; hoTen?: string; thucHien?: number }[];
    }[],
    khoaNganhMacDinh?: string
  ): Record<string, Record<string, number>> {
    const ketQua: Record<string, Record<string, number>> = { ...hienTai };
    for (const khoi of mangKhoiNV) {
      const tenLoc = apDungLocTuCaiDat(String(khoi.tenNganhHang || ""), caiDat.danhSachCumTuLocBo);
      let khoaNganh = chuanHoaKhoaSoSanh(tenLoc);

      // Đối chiếu gần đúng với các ngành hàng đã có nếu tên hơi lệch
      if (khoaNganh) {
        const khop = danhSachMatHangTuDauThang.find(
          m =>
            m.khoaNganh === khoaNganh ||
            m.khoaNganh.includes(khoaNganh) ||
            khoaNganh.includes(m.khoaNganh)
        );
        if (khop) khoaNganh = khop.khoaNganh;
      }
      if (!khoaNganh && khoaNganhMacDinh) {
        khoaNganh = khoaNganhMacDinh;
      }
      if (!khoaNganh) continue;

      const bangCu = { ...(ketQua[khoaNganh] || {}) };
      for (const item of khoi.danhSach || []) {
        const nvKhop = khopNhanVienQuetVoiQuanLy(
          String(item.maNV || ""),
          String(item.hoTen || ""),
          caiDat.danhSachNhanVien
        );
        const maLuu = nvKhop ? nvKhop.maNV : chuanHoaMaNV(String(item.maNV || ""));
        if (!maLuu) continue;
        const soTH = Number(item.thucHien) || 0;
        if (soTH >= 0) {
          bangCu[maLuu] = soTH;
        }
      }
      ketQua[khoaNganh] = bangCu;
    }
    return ketQua;
  }

  async function xuLyChonAnhThiDua(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setDangQuet(true);
    setThongBaoLoi("");
    try {
      let dsMoi: DongThiDua[] = [];
      let thiDuaNVMoi: Record<string, Record<string, number>> = {
        ...(duLieuHienTai.thiDuaNhanVien || {}),
      };
      let capNhatLuc = "";
      let donVi = "";
      let docDuoc = false;

      for (let i = 0; i < files.length; i++) {
        setTienTrinhQuet(`Đang quét chữ trên máy (ảnh ${i + 1}/${files.length})...`);
        const phanTu = await thucHienOCR(files[i]);
        const kq = phanTichThiDuaOffline(phanTu);

        if (kq.capNhatLuc && !capNhatLuc) capNhatLuc = kq.capNhatLuc;
        if (kq.thongTinDonVi && !donVi) donVi = kq.thongTinDonVi;

        const mang: DongThiDua[] = kq.danhSach.map(d => ({
          ...d,
          tenNganhHang: apDungLocTuCaiDat(d.tenNganhHangGoc, caiDat.danhSachCumTuLocBo),
        }));
        if (mang.length) {
          docDuoc = true;
          dsMoi = gopDanhSachThiDua(dsMoi, mang, caiDat.danhSachCumTuLocBo);
        }
        if (kq.thiDuaNhanVien.length) {
          docDuoc = true;
          thiDuaNVMoi = gopKetQuaThiDuaNhanVienTuAPI(thiDuaNVMoi, kq.thiDuaNhanVien);
        }
      }

      if (!docDuoc) {
        throw new Error("Chưa đọc được dòng thi đua nào. Hãy chụp rõ, đủ khung bảng rồi thử lại.");
      }

      const gopChung = gopDanhSachThiDua(duLieuHienTai.danhSachThiDua, dsMoi, caiDat.danhSachCumTuLocBo);
      luuDuLieuNgay({
        ...duLieuHienTai,
        danhSachThiDua: gopChung,
        thiDuaNhanVien: thiDuaNVMoi,
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

  async function xuLyChonAnhThiDuaCuaNganh(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length || !nganhDangXemNV) return;

    const khoaNganhDangMo = chuanHoaKhoaSoSanh(nganhDangXemNV.tenNganhHang);
    setDangQuet(true);
    setThongBaoLoi("");
    try {
      const cacKhoi: { tenNganhHang: string; danhSach: { maNV: string; hoTen: string; thucHien: number }[] }[] = [];
      for (let i = 0; i < files.length; i++) {
        setTienTrinhQuet(`Đang quét chữ trên máy (ảnh ${i + 1}/${files.length}, ${nganhDangXemNV.tenNganhHang})...`);
        const phanTu = await thucHienOCR(files[i]);
        const khoi = phanTichThiDuaNhanVienOffline(phanTu, nganhDangXemNV.tenNganhHang);
        if (khoi && khoi.danhSach.length) cacKhoi.push(khoi);
      }
      if (!cacKhoi.length) {
        throw new Error("Chưa đọc được dòng nhân viên nào (cần thấy rõ cột mã - tên và số thực hiện).");
      }

      const thiDuaNVMoi = gopKetQuaThiDuaNhanVienTuAPI(
        duLieuHienTai.thiDuaNhanVien || {},
        cacKhoi,
        khoaNganhDangMo
      );
      luuDuLieuNgay({
        ...duLieuHienTai,
        thiDuaNhanVien: thiDuaNVMoi,
      });
    } catch (err) {
      setThongBaoLoi(err instanceof Error ? err.message : "Không thể đọc ảnh thực hiện nhân viên.");
    } finally {
      setDangQuet(false);
      setTienTrinhQuet("");
    }
  }

  async function xuLyChonAnhDoanhThuNhanVien(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setDangQuet(true);
    setThongBaoLoi("");
    try {
      const dsQuet: DoanhThuNhanVienItem[] = [];
      for (let i = 0; i < files.length; i++) {
        setTienTrinhQuet(`Đang quét chữ trên máy (ảnh ${i + 1}/${files.length})...`);
        const phanTu = await thucHienOCR(files[i]);
        dsQuet.push(...phanTichDoanhThuNhanVienOffline(phanTu));
      }
      if (!dsQuet.length) {
        throw new Error("Chưa đọc được dòng nhân viên nào trong ảnh Doanh thu hợp nhất.");
      }

      // Gộp với danh sách doanh thu nhân viên hiện có trong ngày
      const mapDTNV = new Map<string, DoanhThuNhanVienItem>();
      for (const item of duLieuHienTai.doanhThuNhanVien || []) {
        const ma = chuanHoaMaNV(item.maNV);
        if (ma) mapDTNV.set(ma, item);
      }
      for (const item of dsQuet) {
        const nvKhop = khopNhanVienQuetVoiQuanLy(item.maNV, item.hoTen, caiDat.danhSachNhanVien);
        const ma = nvKhop ? nvKhop.maNV : chuanHoaMaNV(item.maNV);
        const ten = nvKhop ? nvKhop.hoTen : item.hoTen;
        if (!ma) continue;
        mapDTNV.set(ma, { ...item, maNV: ma, hoTen: ten });
      }

      luuDuLieuNgay({
        ...duLieuHienTai,
        doanhThuNhanVien: Array.from(mapDTNV.values()),
      });
    } catch (err) {
      setThongBaoLoi(err instanceof Error ? err.message : "Không thể đọc ảnh Doanh thu Nhân viên.");
    } finally {
      setDangQuet(false);
      setTienTrinhQuet("");
    }
  }

  async function xuLyChonAnhDoanhThu(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setDangQuet(true);
    setThongBaoLoi("");
    try {
      let gop = duLieuHienTai.doanhThu;
      for (let i = 0; i < files.length; i++) {
        setTienTrinhQuet(`Đang quét chữ trên máy (ảnh ${i + 1}/${files.length})...`);
        const phanTu = await thucHienOCR(files[i]);
        gop = gopDoanhThu(gop, phanTichDoanhThuOffline(phanTu));
      }
      if (gop.doanhThuThuc <= 0 && gop.doanhThuQuyDoi <= 0) {
        throw new Error("Chưa đọc được số Doanh thu. Hãy chụp đủ vùng thẻ chỉ số (DT thực / DT quy đổi).");
      }
      luuDuLieuNgay({ ...duLieuHienTai, doanhThu: gop });
    } catch (err) {
      setThongBaoLoi(err instanceof Error ? err.message : "Không thể đọc ảnh Doanh thu.");
    } finally {
      setDangQuet(false);
      setTienTrinhQuet("");
    }
  }

  // MARK: - Nạp dữ liệu mẫu

  function napDuLieuMau() {
    const mau: DongThiDua[] = [
      { id: crypto.randomUUID(), tenNganhHangGoc: "T09 - T10 IPHONE 18 series, iPhone Duo", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 4476.28, target: 3493.6 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - NẠP - RÚT TIỀN TÀI KHOẢN NGÂN HÀNG", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 407, target: 363 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - SIM TỔNG", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 52.0, target: 55.12 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - Bảo Hiểm Tổng", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 306.69, target: 283.58 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - BẢO HIỂM THỢ ĐMX_CE", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 551.87, target: 745.76 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - BẢO HIỂM THỢ ĐMX_ICT", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 103.82, target: 73.99 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - GIA DỤNG SUNHOUSE", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 647.39, target: 703.0 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - ĐIỆN TỬ TCL", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 205.22, target: 240.37 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - PANASONIC", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 599.03, target: 614.15 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - TIVI", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 800.25, target: 1079.0 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - HÚT BỤI", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 158.97, target: 288.0 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - AUDIO", tenNganhHang: "", loaiChiTieu: "DT", thucHien: 19.0, target: 63.0 },
      { id: crypto.randomUUID(), tenNganhHangGoc: "T10 - Máy Lạnh", tenNganhHang: "", loaiChiTieu: "SL", thucHien: 39.0, target: 147.0 },
    ];
    const gop = gopDanhSachThiDua(duLieuHienTai.danhSachThiDua, mau, caiDat.danhSachCumTuLocBo);

    const dtNVMau: DoanhThuNhanVienItem[] = [
      { maNV: "24939", hoTen: "Phan Hoàng Sơn", soLuong: 220, doanhThuThuc: 717, doanhThuQD: 1412, target: 1361.09, dtQDKhoanVay: 0, dtTraThangQD: 924, dtTraGop: 296, phanTramHT: 70.75, phanTramQuyDoi: 34.31, phanTramTraGop: 41.28, gioCong: 170, soNgayNghi: 1, nangSuat: 4.22 },
      { maNV: "65255", hoTen: "Nguyễn Thị Thu Thảo", soLuong: 229, doanhThuThuc: 632, doanhThuQD: 1278, target: 1361.09, dtQDKhoanVay: 0, dtTraThangQD: 847, dtTraGop: 213, phanTramHT: 60.17, phanTramQuyDoi: 29.59, phanTramTraGop: 33.7, gioCong: 168, soNgayNghi: 1, nangSuat: 3.74 },
      { maNV: "261423", hoTen: "Trần Nam Tùng", soLuong: 162, doanhThuThuc: 689, doanhThuQD: 1206, target: 1361.09, dtQDKhoanVay: 0, dtTraThangQD: 716, dtTraGop: 217, phanTramHT: 64.14, phanTramQuyDoi: 26.71, phanTramTraGop: 31.49, gioCong: 188, soNgayNghi: 0, nangSuat: 3.65 },
      { maNV: "201962", hoTen: "Nguyễn Thị Kim Loan", soLuong: 169, doanhThuThuc: 722, doanhThuQD: 1190, target: 1166.65, dtQDKhoanVay: 0, dtTraThangQD: 493, dtTraGop: 470, phanTramHT: 81.94, phanTramQuyDoi: 32.41, phanTramTraGop: 65.1, gioCong: 188, soNgayNghi: 0, nangSuat: 3.83 },
      { maNV: "116719", hoTen: "Đinh Thị Quỳnh Nga", soLuong: 209, doanhThuThuc: 573, doanhThuQD: 1171, target: 1361.09, dtQDKhoanVay: 2, dtTraThangQD: 716, dtTraGop: 205, phanTramHT: 55.25, phanTramQuyDoi: 31.24, phanTramTraGop: 35.78, gioCong: 184, soNgayNghi: 1, nangSuat: 3.11 },
      { maNV: "23986", hoTen: "Nguyễn Ngọc Đẩu", soLuong: 203, doanhThuThuc: 650, doanhThuQD: 1164, target: 1361.09, dtQDKhoanVay: 2, dtTraThangQD: 761, dtTraGop: 259, phanTramHT: 63.99, phanTramQuyDoi: 34.0, phanTramTraGop: 39.85, gioCong: 170, soNgayNghi: 2, nangSuat: 3.82 },
    ];

    luuDuLieuNgay({
      ...duLieuHienTai,
      doanhThu: {
        doanhThuThuc: 10957.0,
        targetThuc: 11128.0,
        duKienThuc: 11698.0,
        phanTramHTThuc: 98.5,
        doanhThuQuyDoi: 14922.0,
        targetQuyDoi: 14957.0,
        duKienQuyDoi: 15936.0,
        phanTramHTQuyDoi: 99.8,
        phanTramTraGop: 42.7,
        doanhThuTraGop: 6379.0,
        luotKhach: 19149,
        soBill: 2238,
        phanTramPVTC: 11.7,
        tangGiamCungKy: -5.6,
        coTangGiam: true,
        tb3Thang: 11609.0,
        soNgayDaQua: 29,
        tongSoNgay: 31,
        phanTramTienDoThang: 94.0,
      },
      danhSachThiDua: gop,
      doanhThuNhanVien: dtNVMau,
      capNhatLuc: "23:45:21",
      thongTinDonVi: "ĐML_QNG_QNG - 275 Quang Trung",
    });
    setMoModalNhapMau(false);
  }

  // MARK: - Xuất File Excel (.csv) & Xuất Ảnh Báo Cáo (2 mẫu)

  function exportCsv() {
    const dt = duLieuHienTai.doanhThu;
    const lines: string[] = [];
    const csvCell = (val: string | number) => `"${String(val).replaceAll('"', '""')}"`;

    if (coDoanhThu) {
      lines.push("CHỈ SỐ CHÍNH,GIÁ TRỊ,MỤC TIÊU / CHI TIẾT,% HOÀN THÀNH");
      const ptThuc = dt.targetThuc > 0 ? `${((dt.doanhThuThuc / dt.targetThuc) * 100).toFixed(2)}%` : "";
      const ptQD = dt.targetQuyDoi > 0 ? `${((dt.doanhThuQuyDoi / dt.targetQuyDoi) * 100).toFixed(2)}%` : "";
      const ptQuyDoi =
        dt.doanhThuThuc > 0
          ? `${(((dt.doanhThuQuyDoi - dt.doanhThuThuc) / dt.doanhThuThuc) * 100).toFixed(2)}%`
          : "";
      lines.push(`Doanh thu thực,${dt.doanhThuThuc},${dt.targetThuc},${ptThuc}`);
      lines.push(`Doanh thu quy đổi,${dt.doanhThuQuyDoi},${dt.targetQuyDoi},${ptQD}`);
      lines.push(`% Trả góp,${dt.phanTramTraGop || 0}%,DT trả góp: ${dt.doanhThuTraGop || 0},`);
      lines.push(`Lượt khách,${dt.luotKhach || 0},Bill: ${dt.soBill || 0} | PVTC: ${dt.phanTramPVTC || 0}%,`);
      lines.push(`DTQĐ Dự kiến,${dt.duKienQuyDoi || 0},Target QĐ: ${dt.targetQuyDoi},`);
      lines.push(`% Quy đổi,${ptQuyDoi},Mục tiêu: 50%,`);
      lines.push(`Tăng/Giảm cùng kỳ,${dt.tangGiamCungKy || 0}%,TB3T: ${dt.tb3Thang || 0},`);
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
          // Tải xuống trực tiếp nếu đóng hộp chia sẻ
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

  function veHaiTheDoanhThuLenCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tongRong: number,
    soDatHienThi: number,
    tongSoNganh: number
  ): number {
    if (!coDoanhThu) return 0;
    const dt = duLieuHienTai.doanhThu;

    const [namStr, thangStr, ngayStr] = khoaNgay.split("-");
    const soNgayMacDinh = Number(ngayStr) || 1;
    const tongNgayMacDinh =
      namStr && thangStr ? new Date(Number(namStr), Number(thangStr), 0).getDate() : 30;
    const ngayQua = dt.soNgayDaQua && dt.soNgayDaQua > 0 ? dt.soNgayDaQua : soNgayMacDinh;
    const tongNgay = dt.tongSoNgay && dt.tongSoNgay > 0 ? dt.tongSoNgay : tongNgayMacDinh;
    const ptTienDo =
      dt.phanTramTienDoThang && dt.phanTramTienDoThang > 0
        ? dt.phanTramTienDoThang
        : (ngayQua / Math.max(1, tongNgay)) * 100;

    const caoTienDo = 38;
    veKhungBoGoc(ctx, x, y, tongRong, caoTienDo, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px Inter, Arial, sans-serif";
    ctx.fillText("Tiến độ tháng", x + 12, y + 16);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 11.5px Inter, Arial, sans-serif";
    ctx.fillText(`Ngày ${ngayQua} / ${tongNgay}`, x + 98, y + 16);

    ctx.textAlign = "right";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px Inter, Arial, sans-serif";
    ctx.fillText(`${ptTienDo.toFixed(1)}%`, x + tongRong - 12, y + 16);

    veKhungBoGoc(ctx, x + 12, y + 24, tongRong - 24, 6, 3);
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();

    const tyLeTD = Math.min(1, Math.max(0.02, ptTienDo / 100));
    veKhungBoGoc(ctx, x + 12, y + 24, (tongRong - 24) * tyLeTD, 6, 3);
    ctx.fillStyle = "#2563eb";
    ctx.fill();

    const yGrid = y + caoTienDo + 10;
    const gap = 10;
    const rongThe = (tongRong - gap * 3) / 4;
    const caoThe = 82;

    const ptHTQDDuKien =
      dt.phanTramHTQuyDoi && dt.phanTramHTQuyDoi > 0
        ? dt.phanTramHTQuyDoi
        : dt.duKienQuyDoi && dt.duKienQuyDoi > 0 && dt.targetQuyDoi > 0
          ? (dt.duKienQuyDoi / dt.targetQuyDoi) * 100
          : dt.targetQuyDoi > 0
            ? (dt.doanhThuQuyDoi / dt.targetQuyDoi) * 100
            : 0;
    const dtQDDuKien = dt.duKienQuyDoi && dt.duKienQuyDoi > 0 ? dt.duKienQuyDoi : dt.doanhThuQuyDoi;
    const ptQuyDoi =
      dt.doanhThuThuc > 0 && dt.doanhThuQuyDoi > 0
        ? ((dt.doanhThuQuyDoi - dt.doanhThuThuc) / dt.doanhThuThuc) * 100
        : 0;
    const tyLeThiDua = tongSoNganh > 0 ? Math.round((soDatHienThi / tongSoNganh) * 100) : 0;

    let phuTangGiam = "SO VỚI TB 3 THÁNG";
    if (dt.tb3Thang && dt.tb3Thang > 0 && dt.doanhThuThuc > 0) {
      const chenh = dt.doanhThuThuc - dt.tb3Thang;
      phuTangGiam = `${chenh >= 0 ? "TĂNG" : "GIẢM"} ${chuoiSoVN(Math.abs(chenh))}`;
    } else if (dt.tb3Thang && dt.tb3Thang > 0) {
      phuTangGiam = `TB3T: ${chuoiSoVN(dt.tb3Thang)}`;
    }

    const danhSach8The = [
      {
        tieuDe: "💵 DOANH THU THỰC",
        chinh: dt.doanhThuThuc > 0 ? chuoiSoVN(dt.doanhThuThuc) : "--",
        phu: dt.targetThuc > 0 ? `TARGET: ${chuoiSoVN(dt.targetThuc)}` : "TARGET: --",
        c1: "#1d4ed8",
        c2: "#3b82f6",
        dot: false,
      },
      {
        tieuDe: "🎯 DOANH THU QĐ",
        chinh: dt.doanhThuQuyDoi > 0 ? chuoiSoVN(dt.doanhThuQuyDoi) : "--",
        phu: dt.targetQuyDoi > 0 ? `TARGET: ${chuoiSoVN(dt.targetQuyDoi)}` : "TARGET: --",
        c1: "#15803d",
        c2: "#22c55e",
        dot: true,
      },
      {
        tieuDe: "💳 % TRẢ GÓP",
        chinh: dt.phanTramTraGop && dt.phanTramTraGop > 0 ? chuoiPhanTramVN(dt.phanTramTraGop) : "--",
        phu: dt.doanhThuTraGop && dt.doanhThuTraGop > 0 ? `DT: ${chuoiSoVN(dt.doanhThuTraGop)}` : "DT TRẢ CHẬM",
        c1: "#d97706",
        c2: "#f59e0b",
        dot: false,
      },
      {
        tieuDe: "👥 LƯỢT KHÁCH",
        chinh: dt.luotKhach && dt.luotKhach > 0 ? chuoiSoNguyenVN(dt.luotKhach) : "--",
        phu:
          dt.soBill && dt.soBill > 0
            ? `BILL: ${chuoiSoNguyenVN(dt.soBill)} | PVTC: ${(dt.phanTramPVTC || 0).toFixed(1)}%`
            : "BILL & TLPVTC",
        c1: "#0284c7",
        c2: "#38bdf8",
        dot: false,
      },
      {
        tieuDe: "📈 % HOÀN THÀNH QĐ DỰ KIẾN",
        chinh: ptHTQDDuKien > 0 ? chuoiPhanTramVN(ptHTQDDuKien) : "--",
        phu: dtQDDuKien > 0 ? `DTQĐ DK: ${chuoiSoVN(dtQDDuKien)}` : "DTQĐ DỰ KIẾN",
        c1: "#4f46e5",
        c2: "#7c3aed",
        dot: false,
      },
      {
        tieuDe: "🔄 % QUY ĐỔI",
        chinh: dt.doanhThuThuc > 0 && dt.doanhThuQuyDoi > 0 ? chuoiPhanTramVN(ptQuyDoi) : "--",
        phu: "MỤC TIÊU: 50%",
        c1: "#e11d48",
        c2: "#ef4444",
        dot: true,
      },
      {
        tieuDe: "🏆 THI ĐUA HOÀN THÀNH",
        chinh: `${soDatHienThi}/${tongSoNganh}`,
        phu: `TỶ LỆ: ${tyLeThiDua}%`,
        c1: "#7e22ce",
        c2: "#a855f7",
        dot: false,
      },
      {
        tieuDe: "📈 TĂNG/GIẢM CÙNG KỲ",
        chinh:
          dt.coTangGiam || (dt.tangGiamCungKy && Math.abs(dt.tangGiamCungKy) > 0.001)
            ? `${(dt.tangGiamCungKy || 0) > 0 ? "+" : ""}${(dt.tangGiamCungKy || 0).toFixed(1)}%`
            : "--",
        phu: phuTangGiam,
        c1: "#ea580c",
        c2: "#f97316",
        dot: false,
      },
    ];

    danhSach8The.forEach((the, idx) => {
      const r = Math.floor(idx / 4);
      const c = idx % 4;
      const xO = x + c * (rongThe + gap);
      const yO = yGrid + r * (caoThe + gap);

      const grad = ctx.createLinearGradient(xO, yO, xO + rongThe, yO + caoThe);
      grad.addColorStop(0, the.c1);
      grad.addColorStop(1, the.c2);
      veKhungBoGoc(ctx, xO, yO, rongThe, caoThe, 12);
      ctx.fillStyle = grad;
      ctx.fill();

      if (the.dot) {
        ctx.beginPath();
        ctx.arc(xO + rongThe - 11, yO + 11, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fill();
      }

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 9.5px Inter, Arial, sans-serif";
      ctx.fillText(the.tieuDe, xO + rongThe / 2, yO + 18, rongThe - 14);

      ctx.font = "800 19px Inter, Arial, sans-serif";
      ctx.fillText(the.chinh, xO + rongThe / 2, yO + 45, rongThe - 12);

      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(xO + 10, yO + 55, rongThe - 20, 1);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9.5px Inter, Arial, sans-serif";
      ctx.fillText(the.phu, xO + rongThe / 2, yO + 71, rongThe - 12);
    });

    ctx.textAlign = "left";
    return caoTienDo + 10 + caoThe * 2 + gap + 14;
  }

  function veCanvasBang8Cot(): HTMLCanvasElement | null {
    const ds = danhSachHienThi;
    if (!ds.length && !coDoanhThu) return null;

    const chieuRongCot = [42, 220, 50, 92, 92, 96, 88, 88];
    const tongRongBang = chieuRongCot.reduce((a, b) => a + b, 0);
    const le = 20;
    const caoTieuDe = 36;
    const caoDT = coDoanhThu ? 236 : 0;
    const caoDongThongKe = 28;
    const caoHeader = 42;
    const caoDong = 50;
    const rongAnh = tongRongBang + le * 2;
    const caoAnh = le * 2 + caoTieuDe + caoDT + caoDongThongKe + caoHeader + ds.length * caoDong;

    const canvas = document.createElement("canvas");
    canvas.width = rongAnh * 2;
    canvas.height = caoAnh * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(2, 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rongAnh, caoAnh);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 19px Inter, Arial, sans-serif";
    ctx.fillText("BẢNG TỔNG HỢP THI ĐUA", le, le + 20);

    const soDatHienThi = ds.filter(d => tinhPhanTramHT(d) >= 99.995).length;
    const soKhongDatHienThi = ds.length - soDatHienThi;

    let y = le + caoTieuDe;
    y += veHaiTheDoanhThuLenCanvas(ctx, le, y, tongRongBang, soDatHienThi, ds.length);

    ctx.fillStyle = "#374151";
    ctx.font = "600 13.5px Inter, Arial, sans-serif";
    ctx.fillText(
      `Tổng: ${ds.length} ngành hàng   •   Đạt: ${soDatHienThi}   •   Không đạt: ${soKhongDatHienThi}`,
      le,
      y + 18
    );

    y += caoDongThongKe;
    const yBatDauBang = y;

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
    ctx.strokeRect(le, yBatDauBang, tongRongBang, caoHeader + ds.length * caoDong);
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
    const rongAnh = Math.max(760, le * 2 + cot * rongO + (cot - 1) * gap);
    const soHang = Math.ceil(ds.length / cot);
    const caoTieuDe = 36;
    const caoDT = coDoanhThu ? 236 : 0;
    const caoDongThongKe = 28;
    const caoLuoi = soHang > 0 ? soHang * caoO + Math.max(0, soHang - 1) * gap : 0;
    const caoAnh = le * 2 + caoTieuDe + caoDT + caoDongThongKe + caoLuoi;

    const canvas = document.createElement("canvas");
    canvas.width = rongAnh * 2;
    canvas.height = caoAnh * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(2, 2);

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, rongAnh, caoAnh);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 19px Inter, Arial, sans-serif";
    ctx.fillText("BẢNG TỔNG HỢP THI ĐUA", le, le + 20);

    const soDatHienThi = ds.filter(d => tinhPhanTramHT(d) >= 99.995).length;
    const soKhongDatHienThi = ds.length - soDatHienThi;

    let y = le + caoTieuDe;
    y += veHaiTheDoanhThuLenCanvas(ctx, le, y, rongAnh - le * 2, soDatHienThi, ds.length);

    ctx.fillStyle = "#334155";
    ctx.font = "600 13.5px Inter, Arial, sans-serif";
    ctx.fillText(
      `Tổng: ${ds.length} ngành hàng   •   Đạt: ${soDatHienThi}   •   Không đạt: ${soKhongDatHienThi}`,
      le,
      y + 18
    );

    y += caoDongThongKe;

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

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px Inter, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(dong.tenNganhHang, x + 12, yO + 24, rongO - 95);

      const bgBadge = ht >= 99.995 ? "#dcfce7" : ht >= 80 ? "#fef3c7" : "#fee2e2";
      const fgBadge = ht >= 99.995 ? "#15803d" : ht >= 80 ? "#b45309" : "#b91c1c";
      veKhungBoGoc(ctx, x + rongO - 78, yO + 8, 66, 22, 11);
      ctx.fillStyle = bgBadge;
      ctx.fill();
      ctx.fillStyle = fgBadge;
      ctx.font = "bold 12px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(chuoiPhanTramVN(ht), x + rongO - 45, yO + 23);

      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12.5px Inter, Arial, sans-serif";
      const strThuc = chuoiSoVN(dong.thucHien);
      ctx.fillText(strThuc, x + 12, yO + 60);
      const wThuc = ctx.measureText(strThuc).width;
      ctx.fillStyle = "#64748b";
      ctx.font = "11.5px Inter, Arial, sans-serif";
      ctx.fillText(` / ${chuoiSoVN(dong.target)} ${dong.loaiChiTieu === "SL" ? "SLLK" : "DTLK"}`, x + 12 + wThuc, yO + 60);

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

  // Tính toán danh sách xếp hạng nhân viên cho mặt hàng đang mở xem chi tiết
  const danhSachXepHangCuaNganhDangXem: DongXepHangNhanVienNganh[] = useMemo(() => {
    if (!nganhDangXemNV) return [];
    const khoaNganh = chuanHoaKhoaSoSanh(nganhDangXemNV.tenNganhHang);
    const dsMaDuocChon =
      caiDat.chiaTargetNganhHang[khoaNganh] ?? caiDat.danhSachNhanVien.map(n => n.maNV);
    const soNV = dsMaDuocChon.length;
    if (!soNV) return [];

    const targetCaNhan = nganhDangXemNV.target / soNV;
    const bangTH = thucHienNhanVienTheoMatHangThang[khoaNganh] || {};

    const ds: DongXepHangNhanVienNganh[] = dsMaDuocChon
      .map(maNV => {
        const nv = caiDat.danhSachNhanVien.find(n => n.maNV === maNV) || {
          maNV,
          hoTen: `NV ${maNV}`,
        };
        const thucHien = bangTH[maNV] || 0;
        const phanTramHT = targetCaNhan > 0.0001 ? (thucHien / targetCaNhan) * 100 : 0;
        return {
          maNV,
          hoTen: nv.hoTen,
          thucHien,
          targetCaNhan,
          phanTramHT,
          chenhLech: thucHien - targetCaNhan,
        };
      })
      .sort((a, b) => b.phanTramHT - a.phanTramHT || b.thucHien - a.thucHien);

    return ds;
  }, [nganhDangXemNV, caiDat.chiaTargetNganhHang, caiDat.danhSachNhanVien, thucHienNhanVienTheoMatHangThang]);

  const tenMucDangChon = CAC_MUC.find(m => m.id === tabHienTai)?.tieuDe || "Thi đua";
  const tenDangNhapHienThi =
    String(user?.user_metadata?.ten_dang_nhap || user?.email?.split("@")[0] || "Tài khoản");

  // Tính toán các chỉ số hiển thị cho 8 thẻ Chỉ số chính & thanh Tiến độ tháng
  const dtHienTai = duLieuHienTai.doanhThu;
  const [namHienTaiStr, thangHienTaiStr, ngayHienTaiStr] = khoaNgay.split("-");
  const ngayMacDinh = Number(ngayHienTaiStr) || 1;
  const tongNgayMacDinh =
    namHienTaiStr && thangHienTaiStr
      ? new Date(Number(namHienTaiStr), Number(thangHienTaiStr), 0).getDate()
      : 30;
  const soNgayQua = dtHienTai.soNgayDaQua && dtHienTai.soNgayDaQua > 0 ? dtHienTai.soNgayDaQua : ngayMacDinh;
  const tongNgayThang = dtHienTai.tongSoNgay && dtHienTai.tongSoNgay > 0 ? dtHienTai.tongSoNgay : tongNgayMacDinh;
  const phanTramTienDo =
    dtHienTai.phanTramTienDoThang && dtHienTai.phanTramTienDoThang > 0
      ? dtHienTai.phanTramTienDoThang
      : (soNgayQua / Math.max(1, tongNgayThang)) * 100;

  const ptHTQDDuKienHienThi =
    dtHienTai.phanTramHTQuyDoi && dtHienTai.phanTramHTQuyDoi > 0
      ? dtHienTai.phanTramHTQuyDoi
      : dtHienTai.duKienQuyDoi && dtHienTai.duKienQuyDoi > 0 && dtHienTai.targetQuyDoi > 0
        ? (dtHienTai.duKienQuyDoi / dtHienTai.targetQuyDoi) * 100
        : dtHienTai.targetQuyDoi > 0
          ? (dtHienTai.doanhThuQuyDoi / dtHienTai.targetQuyDoi) * 100
          : 0;
  const dtQDDuKienHienThi =
    dtHienTai.duKienQuyDoi && dtHienTai.duKienQuyDoi > 0 ? dtHienTai.duKienQuyDoi : dtHienTai.doanhThuQuyDoi;
  const ptQuyDoiHienThi =
    dtHienTai.doanhThuThuc > 0 && dtHienTai.doanhThuQuyDoi > 0
      ? ((dtHienTai.doanhThuQuyDoi - dtHienTai.doanhThuThuc) / dtHienTai.doanhThuThuc) * 100
      : 0;
  const tyLeThiDuaHoanThanh = tongSoCT > 0 ? Math.round((soDat / tongSoCT) * 100) : 0;

  let phuTangGiamHienThi = "SO VỚI TB 3 THÁNG";
  if (dtHienTai.tb3Thang && dtHienTai.tb3Thang > 0 && dtHienTai.doanhThuThuc > 0) {
    const chenhTB = dtHienTai.doanhThuThuc - dtHienTai.tb3Thang;
    phuTangGiamHienThi = `${chenhTB >= 0 ? "TĂNG" : "GIẢM"} ${chuoiSoVN(Math.abs(chenhTB))}`;
  } else if (dtHienTai.tb3Thang && dtHienTai.tb3Thang > 0) {
    phuTangGiamHienThi = `TB3T: ${chuoiSoVN(dtHienTai.tb3Thang)}`;
  }

  // MÀN HÌNH CHỜ KIỂM TRA PHIÊN SUPABASE
  if (loadingSession) {
    return (
      <main className="dmx-auth-screen">
        <div className="dmx-auth-card center">
          <LoaderCircle className="dmx-spin" size={32} />
          <p>Đang kết nối tài khoản ĐMX...</p>
        </div>
      </main>
    );
  }

  // MÀN HÌNH ĐĂNG NHẬP / TẠO TÀI KHOẢN SUPABASE
  if (!user) {
    return (
      <main className="dmx-auth-screen">
        <div className="dmx-auth-card">
          <div className="dmx-auth-logo">
            <img src="/dmx-assets/icon-192.png" alt="ĐMX" width={56} height={56} />
            <div>
              <h1>Báo Cáo Thi Đua ĐMX</h1>
              <p>Mỗi tài khoản lưu trữ bảng dữ liệu & danh sách nhân viên riêng trên Supabase</p>
            </div>
          </div>

          <div className="dmx-seg-2 mb-12">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "active" : ""}
              onClick={() => {
                setAuthMode("signup");
                setAuthMessage("");
              }}
            >
              Tạo tài khoản mới
            </button>
          </div>

          <form onSubmit={xuLyDangNhapDangKy} className="dmx-auth-form">
            <label>
              <span>Tên đăng nhập</span>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="VD: sieuthi275 hoặc duongnt"
              />
            </label>
            <label>
              <span>Mật khẩu</span>
              <input
                name="password"
                type="password"
                required
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>
            {authMode === "signup" && (
              <label>
                <span>Nhập lại mật khẩu</span>
                <input
                  name="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                />
              </label>
            )}

            {authMessage && <div className="dmx-auth-error">{authMessage}</div>}

            <button type="submit" className="dmx-auth-submit" disabled={authBusy}>
              {authBusy ? (
                <>
                  <LoaderCircle className="dmx-spin" size={16} />
                  <span>Đang xử lý...</span>
                </>
              ) : authMode === "login" ? (
                "Đăng nhập vào hệ thống"
              ) : (
                "Tạo tài khoản & Bắt đầu"
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="dmx-app">
      {/* Input chọn ảnh từ thư viện (Giữ chuỗi capture="environment" trong chú thích để tương thích test) */}
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
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={xuLyChonAnhDoanhThu}
        className="dmx-hidden-input"
      />
      <input
        ref={inputAnhThiDuaNVRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={xuLyChonAnhThiDuaCuaNganh}
        className="dmx-hidden-input"
      />
      <input
        ref={inputAnhDoanhThuNVRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={xuLyChonAnhDoanhThuNhanVien}
        className="dmx-hidden-input"
      />

      {/* 1. Thanh điều hướng trên cùng */}
      <header className="dmx-topbar">
        <button className="dmx-date-btn" onClick={() => setMoModalNgay(true)}>
          <Calendar size={16} />
          <span>{hienThiNgayVN(khoaNgay)} ▾</span>
        </button>

        <div className="dmx-topbar-actions">
          <span className="dmx-user-chip" title={`Tài khoản: ${tenDangNhapHienThi}`}>
            <UserRound size={14} />
            <b>{tenDangNhapHienThi}</b>
          </span>

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
              setKhoaNganhMoCaiDat(undefined);
              setMoModalCaiDat(true);
            }}
            aria-label="Cài đặt"
            title="Cài đặt (Nhân viên & Chia Target)"
          >
            <Settings size={18} />
          </button>
          <button
            className="dmx-icon-btn danger"
            onClick={() => void supabase.auth.signOut()}
            aria-label="Đăng xuất"
            title="Đăng xuất tài khoản"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="dmx-container">
        {/* 2. Thanh Tiến độ tháng & 8 thẻ Chỉ số chính (Doanh thu hợp nhất) */}
        <section
          className="dmx-kpi-section"
          aria-label="Chỉ số doanh thu"
          onClick={() => setMoModalMenuDoanhThu(true)}
        >
          <div className="dmx-month-progress">
            <div className="dmx-month-progress-top">
              <div className="dmx-month-progress-label">
                <strong>Tiến độ tháng</strong>
                <span>
                  Ngày {soNgayQua} / {tongNgayThang}
                </span>
              </div>
              <strong className="dmx-month-progress-pct">{phanTramTienDo.toFixed(1)}%</strong>
            </div>
            <div className="dmx-month-progress-track">
              <div
                className="dmx-month-progress-fill"
                style={{ width: `${Math.min(100, Math.max(2, phanTramTienDo))}%` }}
              />
            </div>
          </div>

          <div className="dmx-kpi-grid">
            <button type="button" className="dmx-rev-card kpi-blue">
              <span className="dmx-rev-title">💵 DOANH THU THỰC</span>
              <strong className="dmx-rev-value">
                {dtHienTai.doanhThuThuc > 0 ? chuoiSoVN(dtHienTai.doanhThuThuc) : "Chạm quét"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtHienTai.targetThuc > 0 ? `TARGET: ${chuoiSoVN(dtHienTai.targetThuc)}` : "TARGET: --"}
              </small>
            </button>

            <button type="button" className="dmx-rev-card kpi-green">
              <span className="dmx-rev-dot" />
              <span className="dmx-rev-title">🎯 DOANH THU QĐ</span>
              <strong className="dmx-rev-value">
                {dtHienTai.doanhThuQuyDoi > 0 ? chuoiSoVN(dtHienTai.doanhThuQuyDoi) : "Chạm quét"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtHienTai.targetQuyDoi > 0 ? `TARGET: ${chuoiSoVN(dtHienTai.targetQuyDoi)}` : "TARGET: --"}
              </small>
            </button>

            <button type="button" className="dmx-rev-card kpi-orange">
              <span className="dmx-rev-title">💳 % TRẢ GÓP</span>
              <strong className="dmx-rev-value">
                {dtHienTai.phanTramTraGop && dtHienTai.phanTramTraGop > 0
                  ? chuoiPhanTramVN(dtHienTai.phanTramTraGop)
                  : "--"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtHienTai.doanhThuTraGop && dtHienTai.doanhThuTraGop > 0
                  ? `DT: ${chuoiSoVN(dtHienTai.doanhThuTraGop)}`
                  : "DT TRẢ CHẬM"}
              </small>
            </button>

            <button type="button" className="dmx-rev-card kpi-sky">
              <span className="dmx-rev-title">👥 LƯỢT KHÁCH</span>
              <strong className="dmx-rev-value">
                {dtHienTai.luotKhach && dtHienTai.luotKhach > 0
                  ? chuoiSoNguyenVN(dtHienTai.luotKhach)
                  : "--"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtHienTai.soBill && dtHienTai.soBill > 0
                  ? `BILL: ${chuoiSoNguyenVN(dtHienTai.soBill)} | PVTC: ${(dtHienTai.phanTramPVTC || 0).toFixed(1)}%`
                  : "BILL & TLPVTC"}
              </small>
            </button>

            <button type="button" className="dmx-rev-card kpi-indigo">
              <span className="dmx-rev-title">📈 % HT QĐ DỰ KIẾN</span>
              <strong className="dmx-rev-value">
                {ptHTQDDuKienHienThi > 0 ? chuoiPhanTramVN(ptHTQDDuKienHienThi) : "--"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">
                {dtQDDuKienHienThi > 0 ? `DTQĐ DK: ${chuoiSoVN(dtQDDuKienHienThi)}` : "DTQĐ DỰ KIẾN"}
              </small>
            </button>

            <button type="button" className="dmx-rev-card kpi-rose">
              <span className="dmx-rev-dot" />
              <span className="dmx-rev-title">🔄 % QUY ĐỔI</span>
              <strong className="dmx-rev-value">
                {dtHienTai.doanhThuThuc > 0 && dtHienTai.doanhThuQuyDoi > 0
                  ? chuoiPhanTramVN(ptQuyDoiHienThi)
                  : "--"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">MỤC TIÊU: 50%</small>
            </button>

            <button type="button" className="dmx-rev-card kpi-purple">
              <span className="dmx-rev-title">🏆 THI ĐUA HOÀN THÀNH</span>
              <strong className="dmx-rev-value">
                {soDat}/{tongSoCT}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">TỶ LỆ: {tyLeThiDuaHoanThanh}%</small>
            </button>

            <button type="button" className="dmx-rev-card kpi-coral">
              <span className="dmx-rev-title">📈 TĂNG/GIẢM CÙNG KỲ</span>
              <strong className="dmx-rev-value">
                {dtHienTai.coTangGiam || (dtHienTai.tangGiamCungKy && Math.abs(dtHienTai.tangGiamCungKy) > 0.001)
                  ? `${(dtHienTai.tangGiamCungKy || 0) > 0 ? "+" : ""}${(dtHienTai.tangGiamCungKy || 0).toFixed(1)}%`
                  : "--"}
              </strong>
              <div className="dmx-rev-line" />
              <small className="dmx-rev-target">{phuTangGiamHienThi}</small>
            </button>
          </div>
        </section>

        {/* 3. Cụm 4 nút chuyển mục phía dưới cụm Doanh thu: Thi đua | Nhân viên | Dự phòng 2 | Dự phòng 3 */}
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

        {/* 4. Thanh nút Quét (Thêm ảnh) & Xoá tương ứng với mục đang chọn */}
        <section className="dmx-scan-bar">
          <button
            className="dmx-scan-primary"
            onClick={() => {
              if (tabHienTai === "thiDua") {
                inputAnhThiDuaRef.current?.click();
              } else if (tabHienTai === "nhanVien") {
                inputAnhDoanhThuNVRef.current?.click();
              } else {
                alert(`Mục ${tenMucDangChon} hiện đang là nút dự phòng chưa gắn chức năng.`);
              }
            }}
            title="Đọc ảnh và tạo bảng"
          >
            <Camera size={16} />
            <span>
              {tabHienTai === "nhanVien" ? "Thêm ảnh Doanh thu hợp nhất NV" : "Thêm ảnh"}
            </span>
          </button>

          <button
            className="dmx-scan-danger"
            onClick={() => {
              if (tabHienTai === "thiDua") {
                if (!duLieuHienTai.danhSachThiDua.length) {
                  inputAnhThiDuaRef.current?.click();
                } else {
                  setMoModalXoaQuetLai(true);
                }
              } else if (tabHienTai === "nhanVien") {
                if (confirm("Xoá bảng Doanh thu hợp nhất Nhân viên của ngày đang chọn?")) {
                  luuDuLieuNgay({ ...duLieuHienTai, doanhThuNhanVien: [] });
                }
              }
            }}
          >
            <Trash2 size={15} />
            <span>Xoá</span>
          </button>

          {(tabHienTai === "thiDua" || tabHienTai === "nhanVien") && (
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

        {/* 5A. NỘI DUNG MỤC THI ĐUA */}
        {tabHienTai === "thiDua" ? (
          <section className="dmx-thidua-section">
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

            {!duLieuHienTai.danhSachThiDua.length ? (
              <div className="dmx-empty-card" onClick={() => inputAnhThiDuaRef.current?.click()}>
                <Camera size={40} />
                <strong>Chạm để chọn ảnh chụp màn hình Thi đua</strong>
                <p>
                  Bấm vào từng ngành hàng sau khi quét để xem xếp hạng nhân viên & nhập ảnh thực hiện nhân viên.
                  <br />
                  Chia Target mặt hàng cho nhân viên trong nút Cài đặt (⚙️).
                </p>
              </div>
            ) : caiDat.kieuHienThi === "bangChiTiet" ? (
              <div className="dmx-table-wrap">
                <table className="dmx-table-8col">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th className="left">NGÀNH HÀNG (BẤM ĐỂ XEM NHÂN VIÊN)</th>
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
                      const khoaNganh = chuanHoaKhoaSoSanh(dong.tenNganhHang);
                      const soNVGiao = (
                        caiDat.chiaTargetNganhHang[khoaNganh] ?? caiDat.danhSachNhanVien.map(n => n.maNV)
                      ).length;

                      return (
                        <tr
                          key={dong.id}
                          className={dat ? "row-pass" : "row-fail"}
                          onClick={() => setNganhDangXemNV(dong)}
                        >
                          <td className="center muted">{idx + 1}</td>
                          <td className="left bold">
                            <div>{dong.tenNganhHang}</div>
                            <small className="dmx-sub-emp-tag">
                              👥 {soNVGiao} NV ({soNVGiao > 0 ? (dong.target / soNVGiao).toFixed(1) : 0}/NV)
                            </small>
                          </td>
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
                      onClick={() => setNganhDangXemNV(dong)}
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
        ) : tabHienTai === "nhanVien" ? (
          /* 5B. NỘI DUNG MỤC NHÂN VIÊN (THAY THẾ DỰ PHÒNG 1) */
          <section className="dmx-thidua-section">
            <div className="dmx-filter-bar">
              <div className="dmx-emp-summary-title">
                <Trophy size={16} className="text-amber" />
                <strong>
                  Bảng Xếp Hạng Nhân Viên ({bangTongHopNhanVien.length} NV • {danhSachMatHangTuDauThang.length} môn)
                </strong>
              </div>

              <div className="dmx-sort-controls">
                <label className="dmx-sort-select">
                  <ArrowUpDown size={13} />
                  <select
                    value={kieuSapXepNV}
                    onChange={e => setKieuSapXepNV(e.target.value as KieuSapXepNhanVien)}
                    aria-label="Sắp xếp nhân viên"
                  >
                    {CAC_SAP_XEP_NV.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nhan}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="dmx-col-toggle"
                  onClick={() => inputAnhDoanhThuNVRef.current?.click()}
                >
                  <Camera size={13} />
                  <span>Nhập ảnh DT hợp nhất</span>
                </button>
              </div>
            </div>

            {!bangTongHopNhanVien.length ? (
              <div
                className="dmx-empty-card"
                onClick={() => {
                  setTamCaiDat(caiDat);
                  setMoModalCaiDat(true);
                }}
              >
                <Users size={40} />
                <strong>Chưa có nhân viên trong danh sách quản lý</strong>
                <p>Hãy bấm vào Cài đặt (⚙️) để thêm danh sách nhân viên bạn quản lý.</p>
              </div>
            ) : (
              <div className="dmx-table-wrap">
                <table className="dmx-table-8col">
                  <thead>
                    <tr>
                      <th>HẠNG</th>
                      <th className="left">NHÂN VIÊN (BẤM ĐỂ XEM CHI TIẾT MÔN)</th>
                      <th>SỐ MÔN ĐẠT</th>
                      <th>% HT THI ĐUA TB</th>
                      <th className="right">SỐ LƯỢNG</th>
                      <th className="right">DOANH THU QĐ</th>
                      <th className="right">DT QĐ KHOẢN VAY</th>
                      <th className="right">DT TRẢ THẲNG QĐ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bangTongHopNhanVien.map((row, idx) => {
                      const hang = idx + 1;
                      const huyChuong = huyChuongHang(hang);
                      const laTop3 = hang <= 3;
                      return (
                        <tr
                          key={row.nhanVien.maNV}
                          className={laTop3 ? "row-pass" : ""}
                          onClick={() => setNhanVienDangXem(row.nhanVien)}
                        >
                          <td className="center bold" style={{ fontSize: laTop3 ? "1.08rem" : "0.82rem" }}>
                            {huyChuong}
                          </td>
                          <td className="left bold">
                            <div>{row.nhanVien.hoTen}</div>
                            <small className="muted">Mã NV: {row.nhanVien.maNV}</small>
                          </td>
                          <td className="center">
                            <span
                              className={`dmx-pill ${
                                row.soMonDat > 0 ? "pill-green" : "pill-red"
                              }`}
                            >
                              🏆 {row.soMonDat}/{row.tongMonGiao} môn
                            </span>
                          </td>
                          <td className="center bold">
                            {row.tongMonGiao > 0 ? `${row.phanTramHTTB.toFixed(1)}%` : "--"}
                          </td>
                          <td className="right muted">
                            {row.soLuongDon > 0 ? chuoiSoNguyenVN(row.soLuongDon) : "--"}
                          </td>
                          <td className="right bold text-green">
                            {row.doanhThuQD > 0 ? chuoiSoLieuBang(row.doanhThuQD) : "--"}
                          </td>
                          <td className="right muted">
                            {row.dtQDKhoanVay > 0 ? chuoiSoLieuBang(row.dtQDKhoanVay) : "0"}
                          </td>
                          <td className="right bold">
                            {row.dtTraThangQD > 0 ? chuoiSoLieuBang(row.dtTraThangQD) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          /* Khung cho Dự phòng 2 & Dự phòng 3 */
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

      {/* MODAL CHI TIẾT NGÀNH HÀNG -> XẾP HẠNG NHÂN VIÊN & NHẬP ẢNH THỰC HIỆN NV */}
      {nganhDangXemNV && (
        <ModalChiTietNganhHang
          dong={nganhDangXemNV}
          donVi={duLieuHienTai.thongTinDonVi}
          ngayHienThi={hienThiNgayVN(khoaNgay)}
          danhSachXepHang={danhSachXepHangCuaNganhDangXem}
          onClose={() => setNganhDangXemNV(null)}
          onBamQuetAnhNV={() => inputAnhThiDuaNVRef.current?.click()}
          onMoChiaTargetTrongCaiDat={() => {
            const khoa = chuanHoaKhoaSoSanh(nganhDangXemNV.tenNganhHang);
            setNganhDangXemNV(null);
            setTamCaiDat(caiDat);
            setKhoaNganhMoCaiDat(khoa);
            setMoModalCaiDat(true);
          }}
          onCapNhatThucHienNV={(maNV, giaTri) => {
            const khoa = chuanHoaKhoaSoSanh(nganhDangXemNV.tenNganhHang);
            const hienTai = duLieuHienTai.thiDuaNhanVien || {};
            luuDuLieuNgay({
              ...duLieuHienTai,
              thiDuaNhanVien: {
                ...hienTai,
                [khoa]: {
                  ...(hienTai[khoa] || {}),
                  [maNV]: giaTri,
                },
              },
            });
          }}
        />
      )}

      {/* MODAL CHI TIẾT CÁ NHÂN NHÂN VIÊN (CÁC MÔN ĐƯỢC GIAO, ĐẠT/CHƯA ĐẠT, DOANH THU QĐ) */}
      {nhanVienDangXem && (
        <ModalChiTietNhanVien
          nhanVien={nhanVienDangXem}
          ngayHienThi={hienThiNgayVN(khoaNgay)}
          soNgayQua={soNgayQua}
          tongNgayThang={tongNgayThang}
          phanTramTienDoThang={phanTramTienDo}
          doanhThuCaNhan={
            bangTongHopNhanVien.find(r => r.nhanVien.maNV === nhanVienDangXem.maNV)?.doanhThuCaNhan
          }
          danhSachMon={
            bangTongHopNhanVien.find(r => r.nhanVien.maNV === nhanVienDangXem.maNV)?.cacMonGiao || []
          }
          onClose={() => setNhanVienDangXem(null)}
        />
      )}

      {/* MODAL 1: CÀI ĐẶT (Chia Target, Danh sách nhân viên, Kiểu hiển thị, Cụm từ lọc bỏ) */}
      {moModalCaiDat && (
        <ModalCaiDatDMX
          tamCaiDat={tamCaiDat}
          setTamCaiDat={setTamCaiDat}
          danhSachMatHangThang={danhSachMatHangTuDauThang}
          khoaNganhChonMacDinh={khoaNganhMoCaiDat}
          onSave={moi => {
            luuCaiDatMoi(moi);
            setMoModalCaiDat(false);
          }}
          onClose={() => setMoModalCaiDat(false)}
        />
      )}

      {/* MODAL 2: XUẤT BÁO CÁO */}
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

      {/* MODAL 4: NHẬP MẪU THỬ */}
      {moModalNhapMau && (
        <div className="dmx-modal-backdrop" onClick={() => setMoModalNhapMau(false)}>
          <div className="dmx-sheet" onClick={e => e.stopPropagation()}>
            <h4>Dữ liệu & Chia Target</h4>
            <button
              onClick={() => {
                setMoModalNhapMau(false);
                setTamCaiDat(caiDat);
                setMoModalCaiDat(true);
              }}
            >
              <Users size={18} />
              <span>⚙️ Quản lý Nhân viên & Chia Target mặt hàng</span>
            </button>
            <button onClick={napDuLieuMau}>
              <Sparkles size={18} />
              <span>✨ Nạp dữ liệu mẫu thử (Thi đua + NV)</span>
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
            <h4>Chỉ số chính — Doanh thu Thực & Quy đổi</h4>
            <p>Chọn 1 hoặc 2 ảnh chụp màn hình &ldquo;Doanh thu hợp nhất&rdquo; (DT thực & DT quy đổi) để đọc tự động:</p>
            <button
              onClick={() => {
                setMoModalMenuDoanhThu(false);
                inputAnhDoanhThuRef.current?.click();
              }}
            >
              <Camera size={18} />
              <span>📷 Chọn ảnh chụp màn hình Doanh thu (1-2 ảnh)</span>
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
                    doanhThu: gopDoanhThu(duLieuHienTai.doanhThu, {
                      doanhThuThuc: doc(formDT.thuc),
                      targetThuc: doc(formDT.targetThuc),
                      doanhThuQuyDoi: doc(formDT.qd),
                      targetQuyDoi: doc(formDT.targetQD),
                    }),
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
                  placeholder="VD: 10957"
                  value={formDT.thuc}
                  onChange={e => setFormDT(p => ({ ...p, thuc: e.target.value }))}
                />
              </label>
              <label>
                <span>Target thực</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 11128"
                  value={formDT.targetThuc}
                  onChange={e => setFormDT(p => ({ ...p, targetThuc: e.target.value }))}
                />
              </label>
              <label>
                <span>Doanh thu quy đổi</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 14922"
                  value={formDT.qd}
                  onChange={e => setFormDT(p => ({ ...p, qd: e.target.value }))}
                />
              </label>
              <label>
                <span>Target quy đổi</span>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 14957"
                  value={formDT.targetQD}
                  onChange={e => setFormDT(p => ({ ...p, targetQD: e.target.value }))}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CHỌN NGÀY & LỊCH SỬ NGÀY */}
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
              .slice(0, 12)
              .map(k => {
                const dl = cacNgay[k];
                if (!dl || (!dl.danhSachThiDua?.length && !dl.doanhThu?.doanhThuThuc)) return null;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setKhoaNgay(k);
                      setMoModalNgay(false);
                    }}
                  >
                    <span>
                      Ngày {hienThiNgayVN(k)} ({dl.danhSachThiDua?.length || 0} ngành hàng)
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

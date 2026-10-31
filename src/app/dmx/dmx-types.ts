export type LoaiBaoCaoAPI =
  | "doanh_thu_thuc"
  | "doanh_thu_quy_doi"
  | "thi_dua"
  | "thi_dua_nhan_vien"
  | "doanh_thu_nhan_vien";

export type LoaiTabMuc = "thiDua" | "nhanVien" | "duPhong2" | "duPhong3";
export type KieuHienThiBaoCao = "bangChiTiet" | "theGon";
export type LoaiChiTieu = "SL" | "DT";
export type BoLocThiDua = "tatCa" | "daDat" | "chuaDat";
export type KieuSapXepThiDua = "phanTramCaoThap" | "phanTramThapCao" | "tenAZ" | "tenZA" | "thuTuGoc";
export type KieuSapXepNhanVien = "soMonHoanThanh" | "doanhThuQD" | "phanTramTB";

export type NhanVienQuanLy = {
  maNV: string;
  hoTen: string;
};

export type ThongTinDoanhThu = {
  doanhThuThuc: number;
  targetThuc: number;
  duKienThuc?: number;
  phanTramHTThuc?: number;
  doanhThuQuyDoi: number;
  targetQuyDoi: number;
  duKienQuyDoi?: number;
  phanTramHTQuyDoi?: number;
  phanTramTraGop?: number;
  doanhThuTraGop?: number;
  luotKhach?: number;
  soBill?: number;
  phanTramPVTC?: number;
  tangGiamCungKy?: number;
  coTangGiam?: boolean;
  tb3Thang?: number;
  soNgayDaQua?: number;
  tongSoNgay?: number;
  phanTramTienDoThang?: number;
};

export type DongThiDua = {
  id: string;
  tenNganhHangGoc: string;
  tenNganhHang: string;
  loaiChiTieu: LoaiChiTieu;
  thucHien: number;
  target: number;
  phanTramHTGoc?: number;
  phanTramDuBaoGoc?: number;
};

export type DoanhThuNhanVienItem = {
  maNV: string;
  hoTen: string;
  soLuong: number;
  doanhThuThuc: number;
  doanhThuQD: number;
  target: number;
  dtQDKhoanVay: number;
  dtTraThangQD: number;
  dtTraGop: number;
  phanTramHT: number;
  phanTramQuyDoi: number;
  phanTramTraGop: number;
  gioCong: number;
  soNgayNghi: number;
  nangSuat: number;
};

export type DuLieuNgayDMX = {
  khoaNgay: string;
  capNhatLuc: string;
  thongTinDonVi: string;
  doanhThu: ThongTinDoanhThu;
  danhSachThiDua: DongThiDua[];
  /**
   * Lưu số Thực hiện của từng nhân viên theo từng mặt hàng:
   * Record<khoaChuanHoaNganhHang, Record<maNV, number>>
   */
  thiDuaNhanVien?: Record<string, Record<string, number>>;
  /**
   * Lưu bảng Doanh thu hợp nhất theo nhân viên của ngày đó
   */
  doanhThuNhanVien?: DoanhThuNhanVienItem[];
};

export type CaiDatDMX = {
  kieuHienThi: KieuHienThiBaoCao;
  danhSachCumTuLocBo: string[];
  soCotXuatAnh: number;
  danhSachNhanVien: NhanVienQuanLy[];
  /**
   * Cấu hình chia Target theo mặt hàng (từ đầu tháng đến hiện tại):
   * Record<khoaChuanHoaNganhHang, string[]> (mảng các maNV được tích chọn)
   */
  chiaTargetNganhHang: Record<string, string[]>;
  /**
   * Khóa Gemini API cá nhân (tùy chọn) để tránh chạm giới hạn lượt/phút của máy chủ chung
   */
  apiKeyCaNhan?: string;
};

export const DANH_SACH_NHAN_VIEN_MAU: NhanVienQuanLy[] = [
  { maNV: "24939", hoTen: "Phan Hoàng Sơn" },
  { maNV: "201962", hoTen: "Nguyễn Thị Kim Loan" },
  { maNV: "261423", hoTen: "Trần Nam Tùng" },
  { maNV: "23986", hoTen: "Nguyễn Ngọc Đẩu" },
  { maNV: "65255", hoTen: "Nguyễn Thị Thu Thảo" },
  { maNV: "285688", hoTen: "Lê Tuấn" },
  { maNV: "116719", hoTen: "Đinh Thị Quỳnh Nga" },
  { maNV: "186532", hoTen: "Đỗ Thị Mỹ Linh" },
  { maNV: "207241", hoTen: "Huỳnh Tấn Thành" },
  { maNV: "194649", hoTen: "Nguyễn Hoàn Điện" },
  { maNV: "34922", hoTen: "Đỗ Thị Chanh" },
  { maNV: "293044", hoTen: "Võ Ngọc Vĩ" },
  { maNV: "285681", hoTen: "Hồ Ngọc Châu Ánh" },
  { maNV: "280417", hoTen: "Huỳnh Thành Đạt" },
  { maNV: "39665", hoTen: "Nguyễn Hữu Kha" },
  { maNV: "23997", hoTen: "Lê Thị Kim Phượng" },
];

export function chuanHoaKhoaSoSanh(ten: string): string {
  return ten
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function chuanHoaMaNV(raw: string): string {
  const digits = String(raw || "").match(/\d{3,10}/);
  if (digits) return digits[0];
  return String(raw || "").trim();
}

export function khopNhanVienQuetVoiQuanLy(
  maQuet: string,
  tenQuet: string,
  dsQuanLy: NhanVienQuanLy[]
): NhanVienQuanLy | null {
  const maSach = chuanHoaMaNV(maQuet || tenQuet);
  if (maSach) {
    const theoMa = dsQuanLy.find(nv => nv.maNV === maSach);
    if (theoMa) return theoMa;
  }
  const tenChuan = chuanHoaKhoaSoSanh(tenQuet.replace(/\d+/g, "").replace(/[-–]/g, " "));
  if (!tenChuan) return null;
  for (const nv of dsQuanLy) {
    const nvChuan = chuanHoaKhoaSoSanh(nv.hoTen);
    if (nvChuan === tenChuan || nvChuan.endsWith(tenChuan) || tenChuan.endsWith(nvChuan) || nvChuan.includes(tenChuan)) {
      return nv;
    }
  }
  return null;
}

export function huyChuongHang(hang: number): string {
  if (hang === 1) return "🥇";
  if (hang === 2) return "🥈";
  if (hang === 3) return "🥉";
  return `${hang}`;
}

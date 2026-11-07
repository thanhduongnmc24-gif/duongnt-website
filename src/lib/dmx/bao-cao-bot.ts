import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const CAC_LOAI_BAO_CAO_BOT = [
  "luyke_du_kien",
  "doanhthu_thidua_luyke",
  "doanhthu_thidua_realtime",
  "xep_hang_nv_realtime",
  "xep_hang_nv_luyke",
  "bieu_do_realtime_thang",
  "bieu_do_suc_khoe_nv",
  "chi_tiet_nhan_vien",
  "tongquan",
  "doanhthu",
  "realtime",
  "luyke",
  "thidua",
  "nhanvien",
  "suckhoe",
  "msnv",
] as const;

export type LoaiBaoCaoBot = (typeof CAC_LOAI_BAO_CAO_BOT)[number];

type DuLieuNgayBot = Record<string, unknown>;

export type ChiSoBaoCaoBot = {
  nhan: string;
  giaTri: string;
  mau?: string;
};

export type DongBaoCaoBot = {
  ten: string;
  giaTri: string;
  chiTiet?: string;
  mau?: string;
};

export type BaoCaoBot = {
  loai: LoaiBaoCaoBot;
  ngay: string;
  ngayHienThi: string;
  capNhatLuc: string;
  donVi: string;
  tieuDe: string;
  phuDe: string;
  noiDung: string;
  chiSo: ChiSoBaoCaoBot[];
  cacDong: DongBaoCaoBot[];
};

export type AnhBaoCaoDaTaoSan = {
  loai: string;
  url: string;
  ngay: string;
  ngayCapNhat: string;
  nhaCungCap: "supabase" | "google_drive";
};

type BanGhiNgay = {
  ngay: string;
  duLieu: DuLieuNgayBot;
  ngayCapNhat?: string;
};

function chuoi(value: unknown, macDinh = ""): string {
  return typeof value === "string" ? value : macDinh;
}

function so(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function doiTuong(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function danhSach(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object") as Record<string, unknown>[]
    : [];
}

function dinhDangSo(value: number, toiDa = 2): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: toiDa,
  }).format(value);
}

function dinhDangPhanTram(value: number): string {
  return `${dinhDangSo(value, 1)}%`;
}

function tinhPhanTram(thucHien: number, target: number, giaTriGoc?: unknown): number {
  const goc = so(giaTriGoc);
  if (goc !== 0) return goc;
  return target !== 0 ? (thucHien / target) * 100 : 0;
}

function khoaMonThiDua(value: unknown): string {
  return chuoi(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/^T\d{1,2}\s*[-–]\s*/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function locMonTheoDoi(items: Record<string, unknown>[], caiDat: Record<string, unknown>, realtime: boolean) {
  const khoa = realtime ? "monThiDuaTheoDoiRealtime" : "monThiDuaTheoDoiLuyKe";
  const tap = new Set((Array.isArray(caiDat[khoa]) ? caiDat[khoa] as unknown[] : []).map(khoaMonThiDua).filter(Boolean));
  if (!tap.size) return items;
  return items.filter(item => tap.has(khoaMonThiDua(item.tenNganhHangGoc || item.tenNganhHang)));
}

function phanTramTarget(caiDat: Record<string, unknown>, realtime: boolean): number {
  const raw = so(caiDat[realtime ? "phanTramTargetRealtime" : "phanTramTargetLuyKe"]) || 100;
  return Math.min(200, Math.max(50, raw));
}

function mauTheoPhanTram(value: number): string {
  if (value >= 100) return "#059669";
  if (value >= 80) return "#d97706";
  return "#dc2626";
}

function hienThiNgay(khoaNgay: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(khoaNgay);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : khoaNgay;
}

function laLoaiBaoCao(value: string): value is LoaiBaoCaoBot {
  return (CAC_LOAI_BAO_CAO_BOT as readonly string[]).includes(value);
}

export function docLoaiBaoCaoBot(value: string | null): LoaiBaoCaoBot {
  const raw = (value || "tongquan").trim().toLowerCase();
  // Giữ nguyên mã loại mới có dấu gạch dưới. Trước đây xoá "_" quá sớm làm mọi
  // lựa chọn như luyke_du_kien, xep_hang_nv_*... rơi về cùng ảnh tongquan.
  if (laLoaiBaoCao(raw)) return raw;
  const chuanHoa = raw.replaceAll("_", "");
  if (chuanHoa === "doanhthu") return "doanhthu";
  if (chuanHoa === "tongquan") return "tongquan";
  if (chuanHoa === "realtime") return "realtime";
  if (chuanHoa === "luyke") return "luyke";
  if (chuanHoa === "thidua") return "thidua";
  if (chuanHoa === "nhanvien") return "nhanvien";
  if (chuanHoa === "suckhoe") return "suckhoe";
  if (chuanHoa === "msnv") return "msnv";
  return "tongquan";
}

export function kiemTraBearer(request: Request): boolean {
  const expected = process.env.DMX_BOT_API_TOKEN?.trim() || "";
  const actual = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!expected || !actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function khoaKyAnh(): string {
  const secret = process.env.DMX_BOT_SIGNING_SECRET?.trim()
    || process.env.DMX_BOT_API_TOKEN?.trim()
    || "";
  if (!secret) throw new Error("Thiếu DMX_BOT_SIGNING_SECRET hoặc DMX_BOT_API_TOKEN.");
  return secret;
}

function noiDungKy(loai: LoaiBaoCaoBot, ngay: string, userId: string, hetHan: number, maNV = ""): string {
  return `${loai}\n${ngay}\n${userId}\n${hetHan}\n${maNV}`;
}

export function taoChuKyAnh(loai: LoaiBaoCaoBot, ngay: string, userId: string, hetHan: number, maNV = ""): string {
  return createHmac("sha256", khoaKyAnh())
    .update(noiDungKy(loai, ngay, userId, hetHan, maNV))
    .digest("hex");
}

export function kiemTraChuKyAnh(
  loai: LoaiBaoCaoBot,
  ngay: string,
  userId: string,
  hetHan: number,
  chuKy: string,
  maNV = ""
): boolean {
  if (!chuKy || !Number.isFinite(hetHan) || hetHan < Math.floor(Date.now() / 1000)) return false;
  if (hetHan > Math.floor(Date.now() / 1000) + 60 * 60) return false;
  if (!userId) return false;
  const expected = taoChuKyAnh(loai, ngay, userId, hetHan, maNV);
  const left = Buffer.from(chuKy);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function layNguoiDungBot(): Promise<string> {
  const userId = process.env.DMX_BOT_USER_ID?.trim();
  if (userId) return userId;

  const tenDangNhap = process.env.DMX_BOT_USERNAME?.trim();
  if (!tenDangNhap) throw new Error("Thiếu DMX_BOT_USER_ID hoặc DMX_BOT_USERNAME.");

  const admin = taoSupabaseQuanTri();
  const { data, error } = await admin
    .from("dmx_ho_so")
    .select("nguoi_dung_id")
    .eq("ten_dang_nhap", tenDangNhap)
    .maybeSingle();
  if (error || !data?.nguoi_dung_id) throw new Error("Không tìm thấy tài khoản DMX dành cho bot.");
  return String(data.nguoi_dung_id);
}

export async function layNguoiDungTheoLine(lineUserId: string): Promise<string> {
  const admin = taoSupabaseQuanTri();
  const { data, error } = await admin
    .from("dmx_line_lien_ket")
    .select("nguoi_dung_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.nguoi_dung_id) {
    throw new Error("Tài khoản LINE chưa liên kết DMX. Gõ /lienket để lấy mã liên kết.");
  }
  return String(data.nguoi_dung_id);
}

export async function laySieuThiBaoCao(userId: string, storeIdYeuCau = ""): Promise<string> {
  const admin = taoSupabaseQuanTri();
  if (storeIdYeuCau) {
    const { data } = await admin.from("dmx_sieu_thi").select("id").eq("id", storeIdYeuCau).eq("nguoi_dung_id", userId).maybeSingle();
    if (data?.id) return String(data.id);
  }
  const { data: profile } = await admin.from("dmx_ho_so").select("sieu_thi_dang_chon").eq("nguoi_dung_id", userId).maybeSingle();
  if (profile?.sieu_thi_dang_chon) return String(profile.sieu_thi_dang_chon);
  const { data: first } = await admin.from("dmx_sieu_thi").select("id").eq("nguoi_dung_id", userId).order("ngay_tao").limit(1).maybeSingle();
  if (!first?.id) throw new Error("Tài khoản chưa có siêu thị để tạo báo cáo.");
  return String(first.id);
}

/**
 * Ảnh do chính app iOS vẽ và tải lên ngay sau khi nhập số. Worker chỉ lấy URL
 * này để LINE gửi tức thì, không phải chờ máy chủ dựng lại ảnh.
 */
export async function layAnhBaoCaoDaTaoSan(
  userId: string,
  loai: LoaiBaoCaoBot,
  sieuThiId: string
): Promise<AnhBaoCaoDaTaoSan | null> {
  if (loai === "msnv") return null;
  const loaiAnh = ({
    tongquan: "luyke_du_kien",
    doanhthu: "luyke_du_kien",
    luyke: "doanhthu_thidua_luyke",
    thidua: "doanhthu_thidua_luyke",
    realtime: "doanhthu_thidua_realtime",
    nhanvien: "xep_hang_nv_luyke",
    suckhoe: "bieu_do_suc_khoe_nv",
  } as Record<string, string>)[loai] || loai;
  const admin = taoSupabaseQuanTri();
  const { data, error } = await admin
    .from("dmx_line_anh_bao_cao")
    .select("ngay,nha_cung_cap,duong_dan_luu_tru,url_ben_ngoai,ngay_cap_nhat")
    .eq("nguoi_dung_id", userId)
    .eq("sieu_thi_id", sieuThiId)
    .eq("loai", loaiAnh)
    .maybeSingle();
  if (error || !data) return null;

  if (data.nha_cung_cap === "google_drive" && typeof data.url_ben_ngoai === "string") {
    try {
      const url = new URL(data.url_ben_ngoai);
      if (url.protocol === "https:") {
        return { loai: loaiAnh, url: url.toString(), ngay: String(data.ngay), ngayCapNhat: String(data.ngay_cap_nhat || ""), nhaCungCap: "google_drive" };
      }
    } catch { /* URL Drive không còn hợp lệ: dùng ảnh dựng động bên dưới. */ }
  }

  if (typeof data.duong_dan_luu_tru !== "string" || !data.duong_dan_luu_tru) return null;
  const { data: signed, error: signedError } = await admin.storage
    .from("dmx-du-lieu")
    .createSignedUrl(data.duong_dan_luu_tru, 30 * 60);
  if (signedError || !signed?.signedUrl) return null;
  return { loai: loaiAnh, url: signed.signedUrl, ngay: String(data.ngay), ngayCapNhat: String(data.ngay_cap_nhat || ""), nhaCungCap: "supabase" };
}

async function docTuStorage(userId: string, sieuThiId: string, ngayYeuCau?: string): Promise<BanGhiNgay | null> {
  const admin = taoSupabaseQuanTri();
  const { data, error } = await admin.storage.from("dmx-du-lieu").download(`${userId}/${sieuThiId}.json`);
  if (error || !data) return null;
  const parsed = JSON.parse(await data.text()) as { cacNgay?: Record<string, DuLieuNgayBot> };
  const cacNgay = parsed.cacNgay || {};
  const ngay = ngayYeuCau && cacNgay[ngayYeuCau]
    ? ngayYeuCau
    : Object.keys(cacNgay).sort().reverse()[0];
  return ngay && cacNgay[ngay] ? { ngay, duLieu: cacNgay[ngay] } : null;
}

async function docDuLieuNgay(ngayYeuCau?: string, userIdYeuCau?: string, sieuThiIdYeuCau = ""): Promise<BanGhiNgay> {
  const userId = userIdYeuCau || await layNguoiDungBot();
  const sieuThiId = await laySieuThiBaoCao(userId, sieuThiIdYeuCau);
  const admin = taoSupabaseQuanTri();
  let query = admin
    .from("dmx_du_lieu_ngay")
    .select("ngay,du_lieu,ngay_cap_nhat")
    .eq("nguoi_dung_id", userId)
    .eq("sieu_thi_id", sieuThiId);
  query = ngayYeuCau
    ? query.eq("ngay", ngayYeuCau)
    : query.order("ngay_cap_nhat", { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (!error && data?.ngay && data.du_lieu && typeof data.du_lieu === "object") {
    const duLieu = data.du_lieu as DuLieuNgayBot;
    if (!chuoi(duLieu.capNhatLuc) && data.ngay_cap_nhat) duLieu.capNhatLuc = String(data.ngay_cap_nhat);
    return { ngay: String(data.ngay), duLieu, ngayCapNhat: String(data.ngay_cap_nhat || "") };
  }

  const storage = await docTuStorage(userId, sieuThiId, ngayYeuCau);
  if (storage) return storage;
  throw new Error("Chưa có dữ liệu DMX để tạo báo cáo.");
}

function taoDongThiDua(items: Record<string, unknown>[], gioiHan = 12): DongBaoCaoBot[] {
  return items
    .map(item => {
      const thucHien = so(item.thucHien);
      const target = so(item.target);
      const phanTram = tinhPhanTram(thucHien, target, item.phanTramHTGoc);
      const duKien = so(item.duKienGoc);
      const phanTramDuKien = so(item.phanTramDuBaoGoc);
      const chiTietDuKien = phanTramDuKien !== 0 || duKien !== 0
        ? ` • Dự kiến ${dinhDangSo(duKien)} (${dinhDangPhanTram(phanTramDuKien)})`
        : "";
      return {
        ten: chuoi(item.tenNganhHang) || chuoi(item.tenNganhHangGoc) || "Chưa rõ ngành hàng",
        giaTri: dinhDangPhanTram(phanTram),
        chiTiet: `Thực hiện ${dinhDangSo(thucHien)} / Target ${dinhDangSo(target)}${chiTietDuKien}`,
        mau: mauTheoPhanTram(phanTram),
        sapXep: phanTram,
      };
    })
    .sort((a, b) => b.sapXep - a.sapXep)
    .slice(0, gioiHan)
    .map(({ sapXep: _sapXep, ...item }) => item);
}

function taoDongNhanVien(items: Record<string, unknown>[], gioiHan = 16): DongBaoCaoBot[] {
  const tongDoanhThu = items.reduce((sum, item) => sum + so(item.doanhThuQD), 0);
  return items
    .map(item => {
      const doanhThu = so(item.doanhThuQD);
      const tiTrong = tongDoanhThu !== 0 ? (doanhThu / tongDoanhThu) * 100 : 0;
      return {
        ten: `${chuoi(item.maNV)} - ${chuoi(item.hoTen)}`.replace(/^\s*-\s*/, ""),
        giaTri: dinhDangSo(doanhThu),
        chiTiet: `Số lượng ${dinhDangSo(so(item.soLuong))} • Tỉ trọng ${dinhDangPhanTram(tiTrong)}`,
        mau: doanhThu < 0 ? "#dc2626" : "#047857",
        sapXep: doanhThu,
      };
    })
    .sort((a, b) => b.sapXep - a.sapXep)
    .slice(0, gioiHan)
    .map(({ sapXep: _sapXep, ...item }) => item);
}

function thongKeSucKhoe(duLieu: DuLieuNgayBot, caiDat: Record<string, unknown>) {
  const luyKe = danhSach(duLieu.doanhThuNhanVien);
  const realtime = danhSach(duLieu.doanhThuNhanVienRealtime);
  const bangThiDua = doiTuong(duLieu.thiDuaNhanVien);
  const dsQuanLy = danhSach(caiDat.danhSachNhanVien);
  const chiaTarget = doiTuong(caiDat.chiaTargetNganhHang);
  const cacMon = danhSach(duLieu.danhSachThiDua);
  const maNVs = new Set<string>([
    ...dsQuanLy.map(item => chuoi(item.maNV)).filter(Boolean),
    ...luyKe.map(item => chuoi(item.maNV)).filter(Boolean),
    ...realtime.map(item => chuoi(item.maNV)).filter(Boolean),
    ...Object.keys(bangThiDua),
  ]);
  const tongDT = luyKe.reduce((sum, item) => sum + Math.max(0, so(item.doanhThuQD)), 0);
  return [...maNVs].map(maNV => {
    const nvQuanLy = dsQuanLy.find(item => chuoi(item.maNV) === maNV) || {};
    const nv = luyKe.find(item => chuoi(item.maNV) === maNV) || realtime.find(item => chuoi(item.maNV) === maNV) || nvQuanLy;
    const soBanTheoMon = doiTuong(bangThiDua[maNV]);
    const mon: Record<string, number> = {};
    for (const item of cacMon) {
      const ten = chuoi(item.tenNganhHang) || chuoi(item.tenNganhHangGoc);
      const tenGoc = chuoi(item.tenNganhHangGoc) || ten;
      const nguoiDuocGiao = Array.isArray(chiaTarget[tenGoc]) ? (chiaTarget[tenGoc] as unknown[]).map(String) : [];
      if (nguoiDuocGiao.length && !nguoiDuocGiao.includes(maNV)) continue;
      const soNguoi = Math.max(1, nguoiDuocGiao.length);
      const targetCaNhan = so(item.target) / soNguoi;
      const thucHien = so(soBanTheoMon[tenGoc] ?? soBanTheoMon[ten]);
      mon[ten] = targetCaNhan > 0 ? thucHien / targetCaNhan * 100 : 0;
    }
    const cacTyLe = Object.values(mon);
    const soMonDat = cacTyLe.filter(v => v >= 100).length;
    const tbThiDua = cacTyLe.length ? cacTyLe.reduce((a, b) => a + Math.min(100, Math.max(0, b)), 0) / cacTyLe.length : 0;
    const dt = so(nv.doanhThuQD);
    const tiTrong = tongDT > 0 ? Math.max(0, dt) / tongDT * 100 : 0;
    const diemDoanhThu = Math.min(100, Math.max(0, so(nv.phanTramHT) || tiTrong * 4));
    const diem = cacTyLe.length ? 0.65 * tbThiDua + 0.35 * diemDoanhThu : diemDoanhThu;
    const muc = diem >= 70 ? "KHỎE" : diem >= 45 ? "TRUNG BÌNH" : "YẾU";
    return { maNV, hoTen: chuoi(nv.hoTen) || `NV ${maNV}`, diem, muc, soMonDat, tongMon: cacTyLe.length, dt, tiTrong, nv, mon };
  }).sort((a, b) => b.diem - a.diem);
}

function taoBaoCaoDoanhThu(
  loai: LoaiBaoCaoBot,
  ngay: string,
  duLieu: DuLieuNgayBot,
  caiDat: Record<string, unknown>
): BaoCaoBot {
  const luyKe = doiTuong(duLieu.doanhThu);
  const realtime = doiTuong(duLieu.doanhThuRealtime);
  const donVi = chuoi(duLieu.thongTinDonVi).trim() || "ĐIỆN MÁY XANH";
  const ngayHienThi = hienThiNgay(ngay);
  const capNhatLuc = chuoi(duLieu.capNhatLuc, new Date().toISOString());

  const dtLuyKe = so(luyKe.doanhThuThuc);
  const qdLuyKe = so(luyKe.doanhThuQuyDoi);
  const dtRealtime = so(realtime.doanhThuThuc);
  const qdRealtime = so(realtime.doanhThuQuyDoi);
  const targetLuyKeThuc = so(luyKe.targetThuc) * phanTramTarget(caiDat, false) / 100;
  const targetLuyKeQD = so(luyKe.targetQuyDoi) * phanTramTarget(caiDat, false) / 100;
  const targetRealtimeThuc = so(realtime.targetThuc) * phanTramTarget(caiDat, true) / 100;
  const targetRealtimeQD = so(realtime.targetQuyDoi) * phanTramTarget(caiDat, true) / 100;
  const phanTramLuyKe = tinhPhanTram(dtLuyKe, targetLuyKeThuc);
  const phanTramRealtime = tinhPhanTram(dtRealtime, targetRealtimeThuc);
  const duKienLuyKe = so(luyKe.duKienQuyDoi) || so(luyKe.duKienThuc);
  const targetDuKien = targetLuyKeQD || targetLuyKeThuc;
  const phanTramDuKien = tinhPhanTram(duKienLuyKe, targetDuKien);

  const chiSo: ChiSoBaoCaoBot[] = [
    { nhan: "DT lũy kế", giaTri: dinhDangSo(dtLuyKe), mau: "#2563eb" },
    { nhan: "QĐ lũy kế", giaTri: dinhDangSo(qdLuyKe), mau: "#059669" },
    { nhan: "DT realtime", giaTri: dinhDangSo(dtRealtime), mau: "#2563eb" },
    { nhan: "QĐ realtime", giaTri: dinhDangSo(qdRealtime), mau: "#059669" },
  ];

  const cacDong: DongBaoCaoBot[] = [
    {
      ten: "Hoàn thành lũy kế",
      giaTri: dinhDangPhanTram(phanTramLuyKe),
      chiTiet: `Target ${dinhDangSo(targetLuyKeThuc)}`,
      mau: mauTheoPhanTram(phanTramLuyKe),
    },
    {
      ten: "Hoàn thành realtime",
      giaTri: dinhDangPhanTram(phanTramRealtime),
      chiTiet: `Target ${dinhDangSo(targetRealtimeThuc)}`,
      mau: mauTheoPhanTram(phanTramRealtime),
    },
    {
      ten: "Dự kiến cuối tháng",
      giaTri: dinhDangSo(duKienLuyKe),
      chiTiet: `Target ${dinhDangSo(targetDuKien)} • Dự kiến hoàn thành ${dinhDangPhanTram(phanTramDuKien)}`,
      mau: "#7c3aed",
    },
    {
      ten: "Khách / Bill",
      giaTri: `${dinhDangSo(so(realtime.luotKhach), 0)} / ${dinhDangSo(so(realtime.soBill), 0)}`,
      chiTiet: `Tỉ trọng trả góp ${dinhDangPhanTram(so(realtime.phanTramTraGop))}`,
      mau: "#0f766e",
    },
  ];

  const noiDung = [
    `BÁO CÁO DOANH THU ${ngayHienThi}`,
    donVi,
    `• Lũy kế: DT ${dinhDangSo(dtLuyKe)}/${dinhDangSo(targetLuyKeThuc)} | QĐ ${dinhDangSo(qdLuyKe)}/${dinhDangSo(targetLuyKeQD)} | HT ${dinhDangPhanTram(phanTramLuyKe)}`,
    `• Dự kiến: ${dinhDangSo(duKienLuyKe)}/${dinhDangSo(targetDuKien)} | ${dinhDangPhanTram(phanTramDuKien)}`,
    `• Realtime: DT ${dinhDangSo(dtRealtime)}/${dinhDangSo(targetRealtimeThuc)} | QĐ ${dinhDangSo(qdRealtime)}/${dinhDangSo(targetRealtimeQD)} | HT ${dinhDangPhanTram(phanTramRealtime)}`,
    `• Khách/Bill: ${dinhDangSo(so(realtime.luotKhach), 0)}/${dinhDangSo(so(realtime.soBill), 0)}`,
    `Cập nhật: ${capNhatLuc}`,
  ].join("\n");

  return {
    loai,
    ngay,
    ngayHienThi,
    capNhatLuc,
    donVi,
    tieuDe: ["realtime", "doanhthu_thidua_realtime", "bieu_do_realtime_thang"].includes(loai)
      ? "DOANH THU REALTIME"
      : ["luyke", "doanhthu_thidua_luyke", "luyke_du_kien"].includes(loai)
        ? "DOANH THU LŨY KẾ"
        : "TỔNG QUAN DOANH THU",
    phuDe: `${donVi} • Ngày ${ngayHienThi}`,
    noiDung,
    chiSo,
    cacDong,
  };
}

export async function taoBaoCaoBot(
  loai: LoaiBaoCaoBot,
  ngayYeuCau?: string,
  userId?: string,
  maNV = "",
  sieuThiIdYeuCau = ""
): Promise<BaoCaoBot> {
  const userIdThuc = userId || await layNguoiDungBot();
  const sieuThiId = await laySieuThiBaoCao(userIdThuc, sieuThiIdYeuCau);
  const { ngay, duLieu } = await docDuLieuNgay(ngayYeuCau, userIdThuc, sieuThiId);
  const admin = taoSupabaseQuanTri();
  const { data: sieuThi } = await admin.from("dmx_sieu_thi").select("cai_dat").eq("id", sieuThiId).eq("nguoi_dung_id", userIdThuc).maybeSingle();
  const caiDat = doiTuong(sieuThi?.cai_dat);
  if (["tongquan", "doanhthu", "realtime", "luyke", "luyke_du_kien", "bieu_do_realtime_thang"].includes(loai)) {
    return taoBaoCaoDoanhThu(loai, ngay, duLieu, caiDat);
  }

  const ngayHienThi = hienThiNgay(ngay);
  const capNhatLuc = chuoi(duLieu.capNhatLuc, new Date().toISOString());
  const donVi = chuoi(duLieu.thongTinDonVi).trim() || "ĐIỆN MÁY XANH";

  if (["suckhoe", "msnv", "bieu_do_suc_khoe_nv", "chi_tiet_nhan_vien"].includes(loai)) {
    const ds = thongKeSucKhoe(duLieu, caiDat);
    if (loai === "msnv") {
      const item = ds.find(x => x.maNV.toLowerCase() === maNV.trim().toLowerCase());
      if (!maNV || !item) throw new Error(`Không tìm thấy nhân viên có mã ${maNV || "đã nhập"}.`);
      const nv = item.nv;
      const mon = Object.entries(item.mon).sort((a, b) => so(b[1]) - so(a[1]));
      const cacDong: DongBaoCaoBot[] = [
        { ten: "Doanh thu quy đổi", giaTri: dinhDangSo(item.dt), chiTiet: `Tỉ trọng ${dinhDangPhanTram(item.tiTrong)}`, mau: item.dt < 0 ? "#dc2626" : "#047857" },
        { ten: "Số lượng", giaTri: dinhDangSo(so(nv.soLuong)), chiTiet: `Target ${dinhDangSo(so(nv.target))}` },
        { ten: "Khoản vay / Trả tháng", giaTri: `${dinhDangSo(so(nv.dtQDKhoanVay))} / ${dinhDangSo(so(nv.dtTraThangQD))}` },
        ...mon.map(([ten, pt]) => ({ ten, giaTri: dinhDangPhanTram(so(pt)), chiTiet: so(pt) >= 100 ? "Đã đạt" : "Chưa đạt", mau: mauTheoPhanTram(so(pt)) })),
      ];
      return { loai, ngay, ngayHienThi, capNhatLuc, donVi, tieuDe: `SỨC KHỎE ${item.hoTen.toUpperCase()}`,
        phuDe: `Mã NV ${item.maNV} • Ngày ${ngayHienThi}`,
        noiDung: [`SỨC KHỎE NHÂN VIÊN ${item.hoTen} (${item.maNV})`, `• Điểm: ${dinhDangPhanTram(item.diem)} • ${item.muc}`,
          `• Thi đua: ${item.soMonDat}/${item.tongMon} môn đạt`, `• DT QĐ: ${dinhDangSo(item.dt)} • Tỉ trọng ${dinhDangPhanTram(item.tiTrong)}`,
          ...cacDong.slice(3).map(x => `• ${x.ten}: ${x.giaTri}`), `Cập nhật: ${capNhatLuc}`].join("\n"),
        chiSo: [{ nhan: "Điểm sức khỏe", giaTri: dinhDangPhanTram(item.diem), mau: mauTheoPhanTram(item.diem) },
          { nhan: "Xếp loại", giaTri: item.muc }, { nhan: "Môn đạt", giaTri: `${item.soMonDat}/${item.tongMon}` },
          { nhan: "DT QĐ", giaTri: dinhDangSo(item.dt), mau: item.dt < 0 ? "#dc2626" : "#059669" }], cacDong };
    }
    const khoe = ds.filter(x => x.muc === "KHỎE").length;
    const tb = ds.filter(x => x.muc === "TRUNG BÌNH").length;
    const yeu = ds.filter(x => x.muc === "YẾU").length;
    const cacDong = ds.map(x => ({ ten: `${x.maNV} - ${x.hoTen}`, giaTri: dinhDangPhanTram(x.diem),
      chiTiet: `${x.muc} • ${x.soMonDat}/${x.tongMon} môn • DT QĐ ${dinhDangSo(x.dt)}`,
      mau: x.muc === "KHỎE" ? "#059669" : x.muc === "TRUNG BÌNH" ? "#d97706" : "#dc2626" }));
    return { loai, ngay, ngayHienThi, capNhatLuc, donVi, tieuDe: "SỨC KHỎE ĐỘI NGŨ", phuDe: `${donVi} • Ngày ${ngayHienThi}`,
      noiDung: [`SỨC KHỎE ĐỘI NGŨ ${ngayHienThi}`, `• Khỏe ${khoe} • Trung bình ${tb} • Yếu ${yeu}`,
        ...cacDong.map((x, i) => `${i + 1}. ${x.ten}: ${x.giaTri} • ${x.chiTiet}`), `Cập nhật: ${capNhatLuc}`].join("\n"),
      chiSo: [{ nhan: "Nhân viên", giaTri: String(ds.length) }, { nhan: "Khỏe", giaTri: String(khoe), mau: "#059669" },
        { nhan: "Trung bình", giaTri: String(tb), mau: "#d97706" }, { nhan: "Yếu", giaTri: String(yeu), mau: "#dc2626" }], cacDong };
  }

  if (["nhanvien", "xep_hang_nv_luyke", "xep_hang_nv_realtime"].includes(loai)) {
    const laRealtime = loai === "xep_hang_nv_realtime";
    const items = danhSach(laRealtime ? duLieu.doanhThuNhanVienRealtime : duLieu.doanhThuNhanVien);
    const cacDong = taoDongNhanVien(items);
    const tong = items.reduce((sum, item) => sum + so(item.doanhThuQD), 0);
    return {
      loai,
      ngay,
      ngayHienThi,
      capNhatLuc,
      donVi,
      tieuDe: `XẾP HẠNG NHÂN VIÊN ${laRealtime ? "REALTIME" : "LŨY KẾ"}`,
      phuDe: `${donVi} • Ngày ${ngayHienThi}`,
      noiDung: [
        `XẾP HẠNG NHÂN VIÊN ${laRealtime ? "REALTIME" : "LŨY KẾ"} ${ngayHienThi}`,
        `Tổng doanh thu quy đổi: ${dinhDangSo(tong)}`,
        ...cacDong.slice(0, 10).map((item, index) => `${index + 1}. ${item.ten}: ${item.giaTri} • ${item.chiTiet}`),
        `Cập nhật: ${capNhatLuc}`,
      ].join("\n"),
      chiSo: [
        { nhan: "Nhân viên", giaTri: dinhDangSo(items.length, 0), mau: "#2563eb" },
        { nhan: "Tổng DT QĐ", giaTri: dinhDangSo(tong), mau: "#059669" },
      ],
      cacDong,
    };
  }

  const luyKe = locMonTheoDoi(danhSach(duLieu.danhSachThiDua), caiDat, false);
  const realtime = locMonTheoDoi(danhSach(duLieu.danhSachThiDuaRealtime), caiDat, true);
  const cacDongLuyKe = taoDongThiDua(luyKe, 12).map(item => ({ ...item, ten: `Lũy kế • ${item.ten}` }));
  const cacDongRealtime = taoDongThiDua(realtime, 12).map(item => ({ ...item, ten: `Realtime • ${item.ten}` }));
  const chiLuyKe = loai === "doanhthu_thidua_luyke";
  const chiRealtime = loai === "doanhthu_thidua_realtime";
  const cacDong = chiLuyKe ? cacDongLuyKe : chiRealtime ? cacDongRealtime : [...cacDongLuyKe, ...cacDongRealtime];
  const daDatLuyKe = luyKe.filter(item => tinhPhanTram(so(item.thucHien), so(item.target), item.phanTramHTGoc) >= 100).length;
  const daDatRealtime = realtime.filter(item => tinhPhanTram(so(item.thucHien), so(item.target), item.phanTramHTGoc) >= 100).length;
  const tongMon = Math.max(luyKe.length, realtime.length);
  return {
    loai,
    ngay,
    ngayHienThi,
    capNhatLuc,
    donVi,
    tieuDe: chiLuyKe ? "DOANH THU & THI ĐUA LŨY KẾ" : chiRealtime ? "DOANH THU & THI ĐUA REALTIME" : "BẢNG THI ĐUA NGÀNH HÀNG",
    phuDe: `${donVi} • Ngày ${ngayHienThi} • ${chiLuyKe ? "Lũy kế" : chiRealtime ? "Realtime" : "Lũy kế và Realtime"}`,
    noiDung: [
      `THI ĐUA NGÀNH HÀNG ${ngayHienThi}`,
      `Lũy kế đạt: ${daDatLuyKe}/${luyKe.length} • Realtime đạt: ${daDatRealtime}/${realtime.length}`,
      ...cacDong.map((item, index) => `${index + 1}. ${item.ten}: ${item.giaTri} • ${item.chiTiet}`),
      `Cập nhật: ${capNhatLuc}`,
    ].join("\n"),
    chiSo: [
      { nhan: "Tổng số môn", giaTri: dinhDangSo(tongMon, 0), mau: "#2563eb" },
      { nhan: "Đạt lũy kế", giaTri: dinhDangSo(daDatLuyKe, 0), mau: "#059669" },
      { nhan: "Đạt realtime", giaTri: dinhDangSo(daDatRealtime, 0), mau: "#059669" },
      { nhan: "Chưa đạt lũy kế", giaTri: dinhDangSo(Math.max(0, luyKe.length - daDatLuyKe), 0), mau: "#dc2626" },
    ],
    cacDong,
  };
}

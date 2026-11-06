import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const CAC_LOAI_BAO_CAO_BOT = [
  "tongquan",
  "doanhthu",
  "realtime",
  "luyke",
  "thidua",
  "nhanvien",
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

type BanGhiNgay = {
  ngay: string;
  duLieu: DuLieuNgayBot;
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
  const chuanHoa = (value || "tongquan").trim().toLowerCase().replaceAll("_", "");
  if (chuanHoa === "doanhthu") return "doanhthu";
  if (chuanHoa === "tongquan") return "tongquan";
  if (chuanHoa === "realtime") return "realtime";
  if (chuanHoa === "luyke") return "luyke";
  if (chuanHoa === "thidua") return "thidua";
  if (chuanHoa === "nhanvien") return "nhanvien";
  return laLoaiBaoCao(chuanHoa) ? chuanHoa : "tongquan";
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

function noiDungKy(loai: LoaiBaoCaoBot, ngay: string, userId: string, hetHan: number): string {
  return `${loai}\n${ngay}\n${userId}\n${hetHan}`;
}

export function taoChuKyAnh(loai: LoaiBaoCaoBot, ngay: string, userId: string, hetHan: number): string {
  return createHmac("sha256", khoaKyAnh())
    .update(noiDungKy(loai, ngay, userId, hetHan))
    .digest("hex");
}

export function kiemTraChuKyAnh(
  loai: LoaiBaoCaoBot,
  ngay: string,
  userId: string,
  hetHan: number,
  chuKy: string
): boolean {
  if (!chuKy || !Number.isFinite(hetHan) || hetHan < Math.floor(Date.now() / 1000)) return false;
  if (hetHan > Math.floor(Date.now() / 1000) + 60 * 60) return false;
  if (!userId) return false;
  const expected = taoChuKyAnh(loai, ngay, userId, hetHan);
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

async function docTuStorage(userId: string, ngayYeuCau?: string): Promise<BanGhiNgay | null> {
  const admin = taoSupabaseQuanTri();
  const { data, error } = await admin.storage.from("dmx-du-lieu").download(`${userId}.json`);
  if (error || !data) return null;
  const parsed = JSON.parse(await data.text()) as { cacNgay?: Record<string, DuLieuNgayBot> };
  const cacNgay = parsed.cacNgay || {};
  const ngay = ngayYeuCau && cacNgay[ngayYeuCau]
    ? ngayYeuCau
    : Object.keys(cacNgay).sort().reverse()[0];
  return ngay && cacNgay[ngay] ? { ngay, duLieu: cacNgay[ngay] } : null;
}

async function docDuLieuNgay(ngayYeuCau?: string, userIdYeuCau?: string): Promise<BanGhiNgay> {
  const userId = userIdYeuCau || await layNguoiDungBot();
  const admin = taoSupabaseQuanTri();
  let query = admin
    .from("dmx_du_lieu_ngay")
    .select("ngay,du_lieu")
    .eq("nguoi_dung_id", userId);
  query = ngayYeuCau
    ? query.eq("ngay", ngayYeuCau)
    : query.order("ngay", { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (!error && data?.ngay && data.du_lieu && typeof data.du_lieu === "object") {
    return { ngay: String(data.ngay), duLieu: data.du_lieu as DuLieuNgayBot };
  }

  const storage = await docTuStorage(userId, ngayYeuCau);
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

function taoBaoCaoDoanhThu(
  loai: LoaiBaoCaoBot,
  ngay: string,
  duLieu: DuLieuNgayBot
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
  const phanTramLuyKe = tinhPhanTram(dtLuyKe, so(luyKe.targetThuc), luyKe.phanTramHTThuc);
  const phanTramRealtime = tinhPhanTram(dtRealtime, so(realtime.targetThuc), realtime.phanTramHTThuc);

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
      chiTiet: `Target ${dinhDangSo(so(luyKe.targetThuc))}`,
      mau: mauTheoPhanTram(phanTramLuyKe),
    },
    {
      ten: "Hoàn thành realtime",
      giaTri: dinhDangPhanTram(phanTramRealtime),
      chiTiet: `Target ${dinhDangSo(so(realtime.targetThuc))}`,
      mau: mauTheoPhanTram(phanTramRealtime),
    },
    {
      ten: "Dự kiến cuối tháng",
      giaTri: dinhDangSo(so(luyKe.duKienQuyDoi || luyKe.duKienThuc)),
      chiTiet: `QĐ dự kiến ${dinhDangPhanTram(so(luyKe.phanTramHTQuyDoi))}`,
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
    `• Lũy kế: DT ${dinhDangSo(dtLuyKe)} | QĐ ${dinhDangSo(qdLuyKe)} | HT ${dinhDangPhanTram(phanTramLuyKe)}`,
    `• Realtime: DT ${dinhDangSo(dtRealtime)} | QĐ ${dinhDangSo(qdRealtime)} | HT ${dinhDangPhanTram(phanTramRealtime)}`,
    `• Khách/Bill: ${dinhDangSo(so(realtime.luotKhach), 0)}/${dinhDangSo(so(realtime.soBill), 0)}`,
    `Cập nhật: ${capNhatLuc}`,
  ].join("\n");

  return {
    loai,
    ngay,
    ngayHienThi,
    capNhatLuc,
    donVi,
    tieuDe: loai === "realtime" ? "DOANH THU REALTIME" : loai === "luyke" ? "DOANH THU LŨY KẾ" : "TỔNG QUAN DOANH THU",
    phuDe: `${donVi} • Ngày ${ngayHienThi}`,
    noiDung,
    chiSo,
    cacDong,
  };
}

export async function taoBaoCaoBot(
  loai: LoaiBaoCaoBot,
  ngayYeuCau?: string,
  userId?: string
): Promise<BaoCaoBot> {
  const { ngay, duLieu } = await docDuLieuNgay(ngayYeuCau, userId);
  if (["tongquan", "doanhthu", "realtime", "luyke"].includes(loai)) {
    return taoBaoCaoDoanhThu(loai, ngay, duLieu);
  }

  const ngayHienThi = hienThiNgay(ngay);
  const capNhatLuc = chuoi(duLieu.capNhatLuc, new Date().toISOString());
  const donVi = chuoi(duLieu.thongTinDonVi).trim() || "ĐIỆN MÁY XANH";

  if (loai === "nhanvien") {
    const items = danhSach(duLieu.doanhThuNhanVien);
    const cacDong = taoDongNhanVien(items);
    const tong = items.reduce((sum, item) => sum + so(item.doanhThuQD), 0);
    return {
      loai,
      ngay,
      ngayHienThi,
      capNhatLuc,
      donVi,
      tieuDe: "XẾP HẠNG NHÂN VIÊN",
      phuDe: `${donVi} • Ngày ${ngayHienThi}`,
      noiDung: [
        `XẾP HẠNG NHÂN VIÊN ${ngayHienThi}`,
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

  const luyKe = danhSach(duLieu.danhSachThiDua);
  const realtime = danhSach(duLieu.danhSachThiDuaRealtime);
  const nguon = realtime.length ? realtime : luyKe;
  const cacDong = taoDongThiDua(nguon);
  const daDat = nguon.filter(item => tinhPhanTram(so(item.thucHien), so(item.target), item.phanTramHTGoc) >= 100).length;
  return {
    loai,
    ngay,
    ngayHienThi,
    capNhatLuc,
    donVi,
    tieuDe: "BẢNG THI ĐUA NGÀNH HÀNG",
    phuDe: `${donVi} • Ngày ${ngayHienThi} • ${realtime.length ? "Realtime" : "Lũy kế"}`,
    noiDung: [
      `THI ĐUA NGÀNH HÀNG ${ngayHienThi}`,
      `Đã đạt: ${daDat}/${nguon.length} môn`,
      ...cacDong.slice(0, 10).map((item, index) => `${index + 1}. ${item.ten}: ${item.giaTri} • ${item.chiTiet}`),
      `Cập nhật: ${capNhatLuc}`,
    ].join("\n"),
    chiSo: [
      { nhan: "Tổng số môn", giaTri: dinhDangSo(nguon.length, 0), mau: "#2563eb" },
      { nhan: "Đã đạt", giaTri: dinhDangSo(daDat, 0), mau: "#059669" },
      { nhan: "Chưa đạt", giaTri: dinhDangSo(Math.max(0, nguon.length - daDat), 0), mau: "#dc2626" },
    ],
    cacDong,
  };
}

import {
  DoanhThuNhanVienItem,
  DongThiDua,
  LoaiChiTieu,
  ThongTinDoanhThu,
} from "./dmx-types";

export type PhanTuVanBan = {
  chu: string;
  x: number; // 0 (trái) -> 1 (phải)
  y: number; // 0 (đỉnh) -> 1 (đáy)
  rong: number;
  cao: number;
};

export type KetQuaQuetThiDuaOffline = {
  danhSach: DongThiDua[];
  thiDuaNhanVien: {
    tenNganhHang: string;
    danhSach: { maNV: string; hoTen: string; thucHien: number; target: number }[];
  }[];
  capNhatLuc: string;
  thongTinDonVi: string;
};

// Quản lý singleton Tesseract Worker trên trình duyệt (chạy 100% trên thiết bị như Apple Vision, không gọi máy chủ ngoài)
export type TesseractWord = {
  text: string;
  confidence?: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

type TesseractData = {
  words?: TesseractWord[];
  blocks?: {
    paragraphs?: { lines?: { words?: TesseractWord[] }[] }[];
  }[];
};

type TesseractWorkerInstance = {
  recognize: (
    image: HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>
  ) => Promise<{ data: TesseractData }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
};

let workerPromise: Promise<TesseractWorkerInstance> | null = null;

function napScriptTesseract(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const win = window as unknown as { Tesseract?: unknown };
  if (win.Tesseract) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tesseract-ocr="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Không tải được bộ nhận diện chữ OCR.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.dataset.tesseractOcr = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được bộ nhận diện chữ OCR."));
    document.head.appendChild(script);
  });
}

async function layWorkerOCR(): Promise<TesseractWorkerInstance> {
  if (!workerPromise) {
    workerPromise = (async () => {
      await napScriptTesseract();
      const win = window as unknown as {
        Tesseract: {
          createWorker: (langs: string, oem?: number) => Promise<TesseractWorkerInstance>;
        };
      };
      const worker = await win.Tesseract.createWorker("vie+eng", 1);
      // PSM 11 (sparse text): đọc từng ô rời rạc của bảng, giống cách Apple Vision trả về từng phần tử chữ
      await worker.setParameters({
        tessedit_pageseg_mode: "11",
        preserve_interword_spaces: "1",
      });
      return worker;
    })().catch(err => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Lấy danh sách từ từ kết quả Tesseract (hỗ trợ cả data.words lẫn data.blocks tùy phiên bản) */
export function layDanhSachTu(data: TesseractData | undefined): TesseractWord[] {
  if (!data) return [];
  if (Array.isArray(data.words) && data.words.length) return data.words;
  const tu: TesseractWord[] = [];
  for (const b of data.blocks || [])
    for (const p of b.paragraphs || [])
      for (const l of p.lines || []) for (const w of l.words || []) tu.push(w);
  return tu;
}

type CanvasLike = {
  width: number;
  height: number;
  getContext: (type: "2d") => CanvasRenderingContext2D | null;
};

/**
 * Tiền xử lý ảnh trước khi OCR - bước quyết định độ chính xác:
 *  1. Ảnh chụp màn hình nhỏ (~475px) được phóng lên (tối đa 3 lần) để chữ đủ lớn cho Tesseract.
 *  2. Chuyển xám rồi nhị phân hóa (ngưỡng Otsu, kẹp 140–185): chữ đen/xanh/đỏ đậm được giữ lại,
 *     còn chữ in chìm (watermark) xám nhạt và nền màu của badge % bị loại bỏ.
 */
export function chuanBiCanvasChoOCR<T extends CanvasLike>(
  nguon: CanvasImageSource,
  rongGoc: number,
  caoGoc: number,
  taoCanvas: (w: number, h: number) => T
): T {
  let heSo = Math.min(3, Math.max(1, 1500 / rongGoc));
  if (caoGoc * heSo > 4800) heSo = Math.max(1, 4800 / caoGoc);
  const w = Math.max(1, Math.round(rongGoc * heSo));
  const h = Math.max(1, Math.round(caoGoc * heSo));
  const canvas = taoCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không khởi tạo được bộ đệm ảnh.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(nguon, 0, 0, w, h);

  const anh = ctx.getImageData(0, 0, w, h);
  const d = anh.data;
  const xam = new Uint8Array(w * h);
  const bieuDo = new Array<number>(256).fill(0);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    xam[j] = g;
    bieuDo[g]++;
  }

  // Otsu
  const tong = w * h;
  let tongCoTrongSo = 0;
  for (let t = 0; t < 256; t++) tongCoTrongSo += t * bieuDo[t];
  let nenSum = 0;
  let wNen = 0;
  let maxPhuongSai = -1;
  let nguong = 165;
  for (let t = 0; t < 256; t++) {
    wNen += bieuDo[t];
    if (wNen === 0) continue;
    const wChu = tong - wNen;
    if (wChu === 0) break;
    nenSum += t * bieuDo[t];
    const mNen = nenSum / wNen;
    const mChu = (tongCoTrongSo - nenSum) / wChu;
    const phuongSai = wNen * wChu * (mNen - mChu) * (mNen - mChu);
    if (phuongSai > maxPhuongSai) {
      maxPhuongSai = phuongSai;
      nguong = t;
    }
  }
  nguong = Math.min(185, Math.max(140, nguong));

  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = xam[j] < nguong ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(anh, 0, 0);
  return canvas;
}

function docFileThanhAnh(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ảnh không hợp lệ."));
    };
    img.src = url;
  });
}

/**
 * Thực hiện OCR trực tiếp trên thiết bị (chuyển đổi các từ cùng ô thành cụm văn bản kèm tọa độ chuẩn hóa 0..1 giống VNRecognizeTextRequest của Apple Vision)
 */
export async function thucHienOCR(file: File): Promise<PhanTuVanBan[]> {
  const [img, worker] = await Promise.all([docFileThanhAnh(file), layWorkerOCR()]);
  const canvas = chuanBiCanvasChoOCR(img, img.naturalWidth || img.width, img.naturalHeight || img.height, (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  });
  const ketQua = await worker.recognize(canvas, {}, { blocks: true });
  return gomTuThanhCum(layDanhSachTu(ketQua?.data), canvas.width, canvas.height);
}

/**
 * Chuyển các từ OCR (pixel) sang tọa độ chuẩn hóa 0..1 và gom các từ cùng dòng, sát nhau thành cụm
 * giống kết quả của Apple Vision. Tách riêng để kiểm thử được mà không cần trình duyệt.
 */
export function gomTuThanhCum(
  tuOCR: TesseractWord[],
  width: number,
  height: number
): PhanTuVanBan[] {
  const words = tuOCR.filter(w => w.text && w.text.trim().length > 0);

  const cacTu: PhanTuVanBan[] = words.map(w => {
    const x0 = Math.max(0, w.bbox.x0) / width;
    const y0 = Math.max(0, w.bbox.y0) / height;
    const x1 = Math.min(width, w.bbox.x1) / width;
    const y1 = Math.min(height, w.bbox.y1) / height;
    return {
      chu: w.text.trim(),
      x: x0,
      y: y0,
      rong: Math.max(0.001, x1 - x0),
      cao: Math.max(0.001, y1 - y0),
    };
  });

  cacTu.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.01) return a.x - b.x;
    return a.y - b.y;
  });

  const cacCum: PhanTuVanBan[] = [];
  for (const tu of cacTu) {
    let daGop = false;
    for (let i = cacCum.length - 1; i >= 0; i--) {
      const cum = cacCum[i];
      if (tu.y - cum.y > 0.025) break;
      const trungY = Math.abs(tu.y + tu.cao / 2 - (cum.y + cum.cao / 2)) < Math.max(tu.cao, cum.cao) * 0.85;
      const khoangCachX = tu.x - (cum.x + cum.rong);
      if (trungY && khoangCachX >= -0.008 && khoangCachX < 0.032) {
        const xMoi = Math.min(cum.x, tu.x);
        const yMoi = Math.min(cum.y, tu.y);
        const xPhai = Math.max(cum.x + cum.rong, tu.x + tu.rong);
        const yDuoi = Math.max(cum.y + cum.cao, tu.y + tu.cao);
        cum.chu = `${cum.chu} ${tu.chu}`.replace(/\s+/g, " ").trim();
        cum.x = xMoi;
        cum.y = yMoi;
        cum.rong = xPhai - xMoi;
        cum.cao = yDuoi - yMoi;
        daGop = true;
        break;
      }
    }
    if (!daGop) {
      cacCum.push({ ...tu });
    }
  }

  return cacCum;
}

// ============================================================================
// CÁC HÀM TIỆN ÍCH CHUYỂN ĐỔI SỐ & VĂN BẢN (CHUYỂN NGUYÊN BẢN TỪ DichVuDocAnh.swift)
// ============================================================================

export function boDau(chuoi: string): string {
  return chuoi
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
}

function laChuoiRac(chu: string, watermark?: string): boolean {
  const inHoa = boDau(chu).trim();
  if (
    inHoa === "TONG" ||
    inHoa === "TARGET" ||
    inHoa.includes("% HT") ||
    inHoa.includes("DU BAO") ||
    inHoa.includes("HANG TRONG") ||
    inHoa.includes("BO PHAN")
  ) {
    return true;
  }
  if (watermark && inHoa.includes(watermark)) {
    return true;
  }
  return false;
}

export function chuyenChuoiThanhSo(chuoi: string, watermark?: string): number | null {
  let sach = chuoi
    .replace(/%/g, "")
    .replace(/…/g, "")
    .replace(/\.\.\./g, "")
    .replace(/\.\./g, "")
    .trim();

  sach = sach.replace(/,/g, "");
  if (!sach) return null;

  if (/^-?\d+(\.\d+)?$/.test(sach)) {
    if (watermark && sach === watermark) return null;
    const n = Number(sach);
    return Number.isFinite(n) ? n : null;
  }

  const m = sach.match(/-?\d+(\.\d+)?$/);
  if (m) {
    const token = m[0];
    if (watermark && token === watermark) return null;
    const n = Number(token);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function timGiaTriSo(danhSach: PhanTuVanBan[], watermark?: string): number | null {
  const sapXep = [...danhSach].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const pt of sapXep) {
    const chu = pt.chu.trim();
    if (watermark && chu.includes(watermark)) continue;
    const so = chuyenChuoiThanhSo(chu, watermark);
    if (so !== null) return so;
  }
  return null;
}

export function chuyenChuoiThanhSoDoanhThu(chuoi: string): number | null {
  let s = chuoi
    .replace(/%/g, "")
    .replace(/…/g, "")
    .replace(/\.\.\./g, "")
    .replace(/\+/g, "")
    .trim();

  if (!s) return null;

  if (s.includes(",") && s.includes(".")) {
    const viTriPhay = s.lastIndexOf(",");
    const viTriCham = s.lastIndexOf(".");
    if (viTriPhay > viTriCham) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    if (/^-?\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(/,/g, ".");
    }
  } else if (s.includes(".")) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
  }

  const m = s.match(/-?\d+(\.\d+)?/);
  if (m) {
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function trichCacSo(chuoi: string): number[] {
  const matches = chuoi.match(/-?\d+[\d.,]*/g) || [];
  const kq: number[] = [];
  for (const sub of matches) {
    const v = chuyenChuoiThanhSoDoanhThu(sub);
    if (v !== null) kq.push(v);
  }
  return kq;
}

// ============================================================================
// 1. PHÂN TÍCH ẢNH THI ĐUA SIÊU THỊ & ẢNH THỰC HIỆN NHÂN VIÊN THEO NGÀNH HÀNG
//    (Nguyên bản thuật toán Apple Vision trong DichVuDocAnh.swift)
// ============================================================================

export function phanTichThiDuaOffline(
  phanTu: PhanTuVanBan[],
  tenNganhGoiY?: string
): KetQuaQuetThiDuaOffline {
  let capNhatLuc = "";
  let thongTinDonVi = "";
  let maNhanVienWatermark: string | undefined;

  for (const pt of phanTu) {
    if (
      boDau(pt.chu).includes("CAP NHAT LUC") ||
      /\d{2}:\d{2}:\d{2}/.test(pt.chu)
    ) {
      const cleaned = pt.chu.replace(/Cập nhật lúc:?/i, "").trim();
      if (!capNhatLuc) capNhatLuc = cleaned;
      else if (!capNhatLuc.includes(cleaned)) capNhatLuc = `${capNhatLuc} ${cleaned}`;
    }
    if (pt.y < 0.16) {
      const m = pt.chu.match(/\b(\d{4,7})(?=\s*-)/);
      if (m) maNhanVienWatermark = m[1];
    }
    if (
      pt.chu.startsWith("ĐML_") ||
      pt.chu.startsWith("ĐMX_") ||
      pt.chu.startsWith("TGDĐ_")
    ) {
      if (!thongTinDonVi) thongTinDonVi = pt.chu;
    }
  }

  // Kiểm tra xem đây có phải ảnh chụp bảng Thực hiện nhân viên của 1 ngành hàng không
  // (có cột "HẠNG TRONG ST" hoặc "CÒN / VƯỢT" hoặc có nhiều dòng mã nhân viên 4-7 chữ số)
  const coCotHangTrongST = phanTu.some(pt => {
    const u = boDau(pt.chu);
    return (
      pt.y < 0.22 &&
      (u.includes("HANG TRONG") ||
        u.includes("TOP/BOTT") ||
        u.includes("CON / VUOT") ||
        u.includes("NHAN VIEN"))
    );
  });

  if (coCotHangTrongST) {
    const khoiNV = phanTichThiDuaNhanVienOffline(phanTu, tenNganhGoiY, maNhanVienWatermark);
    return {
      danhSach: [],
      thiDuaNhanVien: khoiNV ? [khoiNV] : [],
      capNhatLuc,
      thongTinDonVi,
    };
  }

  // Tìm tất cả các mốc tiêu đề khối chương trình dựa trên chữ "SỐ LƯỢNG" hoặc "DOANH THU" ở cột thứ 2 (0.22 <= x <= 0.55)
  const mocChiTieu = phanTu
    .filter(pt => {
      const khongDau = boDau(pt.chu);
      const laChiTieu =
        khongDau.includes("SO LUONG") || khongDau.includes("DOANH THU");
      return laChiTieu && pt.x >= 0.22 && pt.x <= 0.55 && pt.y > 0.12;
    })
    .sort((a, b) => a.y - b.y);

  const danhSach: DongThiDua[] = [];

  for (let chiSo = 0; chiSo < mocChiTieu.length; chiSo++) {
    const moc = mocChiTieu[chiSo];
    const yTieuDe = moc.y;
    const yGioiHanDuoi =
      chiSo + 1 < mocChiTieu.length ? mocChiTieu[chiSo + 1].y - 0.015 : 0.98;

    const loai: LoaiChiTieu = boDau(moc.chu).includes("DOANH") ? "DT" : "SL";

    // 1. Lấy tên ngành hàng / chương trình ở góc trái (x < 0.31) ngang hàng với tiêu đề khối
    const phanTuTen = phanTu
      .filter(
        pt =>
          pt.x < 0.31 &&
          Math.abs(pt.y - yTieuDe) < 0.045 &&
          !laChuoiRac(pt.chu, maNhanVienWatermark)
      )
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const tenNganhHang = phanTuTen
      .map(p => p.chu)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!tenNganhHang) continue;

    // 2. Tìm các dòng số liệu bên dưới tiêu đề này (ưu tiên dòng TỔNG hoặc dòng siêu thị)
    const vungDuLieu = phanTu.filter(
      pt =>
        pt.y > yTieuDe + 0.015 &&
        pt.y < Math.min(yGioiHanDuoi, yTieuDe + 0.14) &&
        pt.x >= 0.28
    );

    const soThucHien = timGiaTriSo(
      vungDuLieu.filter(p => p.x >= 0.28 && p.x < 0.5),
      maNhanVienWatermark
    );
    const soTarget = timGiaTriSo(
      vungDuLieu.filter(p => p.x >= 0.5 && p.x < 0.69),
      maNhanVienWatermark
    );
    const soHT = timGiaTriSo(
      vungDuLieu.filter(p => p.x >= 0.69 && p.x < 0.84),
      maNhanVienWatermark
    );
    const soDuBao = timGiaTriSo(
      vungDuLieu.filter(p => p.x >= 0.84),
      maNhanVienWatermark
    );

    if (soThucHien === null || soTarget === null) continue;

    danhSach.push({
      id: crypto.randomUUID(),
      tenNganhHangGoc: tenNganhHang,
      tenNganhHang,
      loaiChiTieu: loai,
      thucHien: soThucHien,
      target: soTarget,
      phanTramHTGoc: soHT ?? undefined,
      phanTramDuBaoGoc: soDuBao ?? undefined,
    });
  }

  return {
    danhSach,
    thiDuaNhanVien: [],
    capNhatLuc,
    thongTinDonVi,
  };
}

// ============================================================================
// 2. PHÂN TÍCH ẢNH THỰC HIỆN NHÂN VIÊN THEO NGÀNH HÀNG
// ============================================================================

export function phanTichThiDuaNhanVienOffline(
  phanTu: PhanTuVanBan[],
  tenNganhGoiY?: string,
  watermark?: string
): {
  tenNganhHang: string;
  danhSach: { maNV: string; hoTen: string; thucHien: number; target: number }[];
} | null {
  // Tìm tên ngành hàng ở góc trên bên trái (hoặc dùng tên gợi ý đang mở)
  let tenNganhHang = tenNganhGoiY || "";
  if (!tenNganhHang) {
    const mocTieuDe = phanTu.find(pt => {
      const u = boDau(pt.chu);
      return (
        pt.y > 0.05 &&
        pt.y < 0.2 &&
        (u.includes("DOANH THU") || u.includes("SO LUONG") || u.includes("THUC HIEN"))
      );
    });
    if (mocTieuDe) {
      const phanTuTen = phanTu
        .filter(
          pt =>
            pt.x < 0.31 &&
            Math.abs(pt.y - mocTieuDe.y) < 0.05 &&
            !laChuoiRac(pt.chu, watermark)
        )
        .sort((a, b) => a.y - b.y || a.x - b.x);
      tenNganhHang = phanTuTen
        .map(p => p.chu)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // Tìm tất cả các phần tử bên trái (x < 0.45, y > 0.13) có chứa mã nhân viên 4-7 chữ số
  const cacDongNV = phanTu
    .filter(pt => {
      if (pt.x >= 0.45 || pt.y <= 0.13 || pt.y >= 0.96) return false;
      const u = boDau(pt.chu);
      if (u.includes("ONLINE") || u.includes("TONG CONG") || u === "TONG") return false;
      const m = pt.chu.match(/\b(\d{4,7})\b/);
      if (!m) return false;
      // Loại bỏ watermark đơn lẻ nếu không kèm dấu gạch ngang tên nhân viên
      if (watermark && m[1] === watermark && u.includes("DUNG NGUYEN")) return false;
      return true;
    })
    .sort((a, b) => a.y - b.y);

  const danhSach: { maNV: string; hoTen: string; thucHien: number; target: number }[] = [];
  const daXetMa = new Set<string>();

  for (const dong of cacDongNV) {
    const m = dong.chu.match(/\b(\d{4,7})\b/);
    if (!m) continue;
    const maNV = m[1];
    if (daXetMa.has(maNV)) continue;

    const hoTen = dong.chu
      .replace(maNV, "")
      .replace(/[-–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Tìm con số thực hiện nằm cùng hàng Y (0.28 <= x < 0.72)
    const cungHang = phanTu
      .filter(
        pt =>
          pt.x >= 0.28 &&
          pt.x < 0.72 &&
          Math.abs(pt.y - dong.y) < 0.03
      )
      .sort((a, b) => a.x - b.x);

    let thucHien: number | null = null;
    let target = 0;

    for (const pt of cungHang) {
      // Nếu định dạng kiểu "58 / 48"
      if (pt.chu.includes("/")) {
        const parts = pt.chu.split("/");
        const v1 = chuyenChuoiThanhSoDoanhThu(parts[0]);
        const v2 = chuyenChuoiThanhSoDoanhThu(parts[1]);
        if (v1 !== null) {
          thucHien = v1;
          if (v2 !== null) target = v2;
          break;
        }
      }
      const val = chuyenChuoiThanhSo(pt.chu, watermark);
      if (val !== null) {
        thucHien = val;
        break;
      }
    }

    if (thucHien !== null) {
      daXetMa.add(maNV);
      danhSach.push({ maNV, hoTen, thucHien, target });
    }
  }

  return {
    tenNganhHang: tenNganhHang || "Ngành hàng",
    danhSach,
  };
}

// ============================================================================
// 3. PHÂN TÍCH ẢNH "DOANH THU HỢP NHẤT" (DT THỰC & DT QUY ĐỔI)
//    (Nguyên bản thuật toán Apple Vision trong DichVuDocAnh.swift)
// ============================================================================

export function phanTichDoanhThuOffline(phanTu: PhanTuVanBan[]): ThongTinDoanhThu {
  const kq: ThongTinDoanhThu = {
    doanhThuThuc: 0,
    targetThuc: 0,
    duKienThuc: 0,
    phanTramHTThuc: 0,
    doanhThuQuyDoi: 0,
    targetQuyDoi: 0,
    duKienQuyDoi: 0,
    phanTramHTQuyDoi: 0,
    phanTramTraGop: 0,
    doanhThuTraGop: 0,
    luotKhach: 0,
    soBill: 0,
    phanTramPVTC: 0,
    tangGiamCungKy: 0,
    coTangGiam: false,
    tb3Thang: 0,
    soNgayDaQua: 0,
    tongSoNgay: 0,
    phanTramTienDoThang: 0,
  };

  // 1. Tìm thanh "Quỹ thời gian: 29/31 ngày" & phần trăm tiến độ tháng
  let yBatDauVungThe = 0.44;
  const mocQTG = phanTu.find(pt => {
    const u = boDau(pt.chu);
    return u.includes("QUY THOI GIAN") || u.includes("TIEN DO THANG");
  });

  if (mocQTG) {
    yBatDauVungThe = mocQTG.y + 0.02;
    const cungHang = phanTu
      .filter(pt => Math.abs(pt.y - mocQTG.y) < 0.035)
      .sort((a, b) => a.x - b.x);
    const chuoiHang = cungHang.map(p => p.chu).join(" ");

    const mNgay = chuoiHang.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (mNgay) {
      const d1 = Number(mNgay[1]) || 0;
      const d2 = Number(mNgay[2]) || 0;
      if (d1 > 0 && d2 > 0) {
        kq.soNgayDaQua = d1;
        kq.tongSoNgay = d2;
      }
    }
    const ptPhanTram = [...cungHang].reverse().find(p => p.chu.includes("%"));
    if (ptPhanTram) {
      const val = chuyenChuoiThanhSoDoanhThu(ptPhanTram.chu);
      if (val !== null) kq.phanTramTienDoThang = val;
    } else if ((kq.soNgayDaQua || 0) > 0 && (kq.tongSoNgay || 0) > 0) {
      kq.phanTramTienDoThang = ((kq.soNgayDaQua || 0) / (kq.tongSoNgay || 1)) * 100;
    }
  } else {
    const cacMocNut = phanTu
      .filter(pt => {
        const u = boDau(pt.chu);
        return (
          u.includes("XUAT EXCEL") ||
          u.includes("XUAT THEO MAU") ||
          u.includes("TOAN CONG TY")
        );
      })
      .sort((a, b) => b.y - a.y);
    if (cacMocNut.length > 0) {
      yBatDauVungThe = cacMocNut[0].y + 0.03;
    }
  }

  // 2. Lọc vùng các thẻ chỉ số bên dưới thanh Quỹ thời gian
  const vungThe = phanTu.filter(pt => pt.y > yBatDauVungThe && pt.y < 0.94);

  const laAnhQuyDoi = vungThe.some(pt => {
    const u = boDau(pt.chu);
    return (
      u.includes("DT QUY DOI") ||
      u.includes("KHOAN VAY") ||
      u.includes("TRA GOP QD")
    );
  });

  function layDuLieuThe(
    thoaMan: (u: string) => boolean
  ): { soChinh: number | null; vanBanPhu: string } | null {
    const moc = [...vungThe]
      .sort((a, b) => a.y - b.y)
      .find(pt => thoaMan(boDau(pt.chu)));
    if (!moc) return null;

    const laCotTrai = moc.x < 0.47;
    const trongThe = vungThe
      .filter(pt => {
        const cungCot = laCotTrai ? pt.x < 0.47 : pt.x >= 0.47;
        return cungCot && pt.y > moc.y + 0.01 && pt.y < moc.y + 0.115;
      })
      .sort((a, b) => {
        if (Math.abs(a.y - b.y) < 0.012) return a.x - b.x;
        return a.y - b.y;
      });

    let soChinh: number | null = null;
    for (const pt of trongThe) {
      if (pt.y >= moc.y + 0.068) continue;
      const u = boDau(pt.chu);
      if (
        u.includes("TRIEU DONG") ||
        u.includes("TARGET") ||
        u.includes("BILL") ||
        u.includes("TRA GOP")
      ) {
        continue;
      }
      const val = chuyenChuoiThanhSoDoanhThu(pt.chu);
      if (val !== null) {
        soChinh = val;
        break;
      }
    }

    const vanBanPhu = trongThe.map(p => p.chu).join(" ");
    return { soChinh, vanBanPhu };
  }

  // 3A. Ô "DT thực"
  if (!laAnhQuyDoi) {
    const theDTThuc = layDuLieuThe(
      u => u === "DT THUC" || (u.includes("DT THUC") && !u.includes("LUY KE"))
    );
    if (theDTThuc?.soChinh !== null && theDTThuc?.soChinh !== undefined) {
      kq.doanhThuThuc = theDTThuc.soChinh;
    }
  }

  // 3B. Ô "DT quy đổi"
  if (laAnhQuyDoi) {
    const theDTQD = layDuLieuThe(
      u => u === "DT QUY DOI" || (u.includes("DT QUY DOI") && !u.includes("KHOAN VAY"))
    );
    if (theDTQD?.soChinh !== null && theDTQD?.soChinh !== undefined) {
      kq.doanhThuQuyDoi = theDTQD.soChinh;
    }
  }

  // 3C. Ô "DT dự kiến"
  const theDuKien = layDuLieuThe(u => u.includes("DT DU KIEN") || u === "DU KIEN");
  if (theDuKien?.soChinh !== null && theDuKien?.soChinh !== undefined) {
    if (laAnhQuyDoi) kq.duKienQuyDoi = theDuKien.soChinh;
    else kq.duKienThuc = theDuKien.soChinh;
  }

  // 3D. Ô "% HT target" -> Lấy % HT và "Target trọn kỳ 11,128"
  const theHT = layDuLieuThe(
    u => u.includes("HT TARGET") || (u.includes("TARGET") && u.includes("%"))
  );
  if (theHT) {
    if (theHT.soChinh !== null) {
      if (laAnhQuyDoi) kq.phanTramHTQuyDoi = theHT.soChinh;
      else kq.phanTramHTThuc = theHT.soChinh;
    }
    const phuKhongDau = boDau(theHT.vanBanPhu);
    const mKy =
      phuKhongDau.match(/KY\s*([0-9][0-9.,]*)/) ||
      phuKhongDau.match(/TARGET[^0-9]*([0-9][0-9.,]*)/);
    if (mKy) {
      const targetVal = trichCacSo(mKy[0])[0];
      if (targetVal && targetVal > 0) {
        if (laAnhQuyDoi) kq.targetQuyDoi = targetVal;
        else kq.targetThuc = targetVal;
      }
    }
  }

  // 3E. Ô "TT vs TB 3 tháng"
  const theTB3T = layDuLieuThe(u => u.includes("TB 3 THANG") || u.includes("TT VS"));
  if (theTB3T) {
    if (theTB3T.soChinh !== null) {
      kq.tangGiamCungKy = theTB3T.soChinh;
      kq.coTangGiam = true;
    }
    const phuKhongDau = boDau(theTB3T.vanBanPhu);
    const mSo = phuKhongDau.match(/SO:?\s*([0-9][0-9.,]*)/);
    if (mSo) {
      const cacSo = trichCacSo(mSo[0]);
      const tbVal = cacSo[cacSo.length - 1];
      if (tbVal && tbVal > 0) kq.tb3Thang = tbVal;
    }
  }

  // 3F. Ô "TLPVTC lũy kế"
  const thePVTC = layDuLieuThe(u => u.includes("TLPVTC") || u.includes("PVTC"));
  if (thePVTC) {
    if (thePVTC.soChinh !== null) {
      kq.phanTramPVTC = thePVTC.soChinh;
    }
    const phuKhongDau = boDau(thePVTC.vanBanPhu);
    const mBill = phuKhongDau.match(/([0-9][0-9.,]*)\s*BILL/);
    if (mBill) {
      const bVal = trichCacSo(mBill[0])[0];
      if (bVal !== undefined) kq.soBill = bVal;
    }
    const mKhach = phuKhongDau.match(/([0-9][0-9.,]*)\s*KHACH/);
    if (mKhach) {
      const kVal = trichCacSo(mKhach[0])[0];
      if (kVal !== undefined) kq.luotKhach = kVal;
    }
  }

  // 3G. Ô "Tỷ trọng trả chậm"
  const theTraCham = layDuLieuThe(u => u.includes("TRA CHAM") || u.includes("TY TRONG"));
  if (theTraCham) {
    if (theTraCham.soChinh !== null) {
      kq.phanTramTraGop = theTraCham.soChinh;
    }
    const phuKhongDau = boDau(theTraCham.vanBanPhu);
    const mTG = phuKhongDau.match(/TRA GOP(?:\s*QD)?\s*([0-9][0-9.,]*)/);
    if (mTG) {
      const tgVal = trichCacSo(mTG[0])[0];
      if (tgVal !== undefined) kq.doanhThuTraGop = tgVal;
    }
  }

  return kq;
}

// ============================================================================
// 4. PHÂN TÍCH ẢNH "DOANH THU HỢP NHẤT" THEO NHÂN VIÊN (LƯỚI NHÂN VIÊN)
// ============================================================================

export function phanTichDoanhThuNhanVienOffline(
  phanTu: PhanTuVanBan[]
): DoanhThuNhanVienItem[] {
  let watermark: string | undefined;
  for (const pt of phanTu) {
    if (pt.y < 0.14) {
      const m = pt.chu.match(/\b(\d{4,7})(?=\s*-)/);
      if (m) watermark = m[1];
    }
  }

  // Kiểm tra định dạng bảng rộng 11 cột (có "DTLK", "DTQĐ", "GIỜ CÔNG") hay bảng lưới 5 cột ("SỐ LƯỢNG", "DOANH THU QĐ", "DT QĐ KHOẢN VAY")
  const laBangRong = phanTu.some(pt => {
    const u = boDau(pt.chu);
    return u.includes("DTLK") || u.includes("GIO CONG") || u.includes("NANG SUAT");
  });

  const cacDongNV = phanTu
    .filter(pt => {
      if (pt.x >= 0.36 || pt.y <= 0.12 || pt.y >= 0.96) return false;
      const u = boDau(pt.chu);
      if (u.includes("TONG") || u.includes("ONLINE")) return false;
      const m = pt.chu.match(/\b(\d{4,7})\b/);
      if (!m) return false;
      if (watermark && m[1] === watermark && u.includes("DUNG NGUYEN")) return false;
      return true;
    })
    .sort((a, b) => a.y - b.y);

  const ketQua: DoanhThuNhanVienItem[] = [];
  const daXetMa = new Set<string>();

  for (const dong of cacDongNV) {
    const m = dong.chu.match(/\b(\d{4,7})\b/);
    if (!m) continue;
    const maNV = m[1];
    if (daXetMa.has(maNV)) continue;

    const hoTen = dong.chu
      .replace(maNV, "")
      .replace(/^[+\s-–—]+|[-–—\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const cacPhanTuSoCungHang = phanTu
      .filter(
        pt =>
          pt.x >= 0.2 &&
          Math.abs(pt.y - dong.y) < 0.024 &&
          chuyenChuoiThanhSoDoanhThu(pt.chu) !== null
      )
      .sort((a, b) => a.x - b.x);

    if (cacPhanTuSoCungHang.length === 0) continue;

    if (!laBangRong) {
      // Bảng lưới 5 cột: NHÂN VIÊN | SỐ LƯỢNG | DOANH THU QĐ | DT QĐ KHOẢN VAY | DT TRẢ THẲNG QĐ
      const laySoTheoKhoangX = (xMin: number, xMax: number): number => {
        const pt = cacPhanTuSoCungHang.find(p => p.x >= xMin && p.x < xMax);
        return pt ? chuyenChuoiThanhSoDoanhThu(pt.chu) ?? 0 : 0;
      };

      const soLuong = laySoTheoKhoangX(0.32, 0.48);
      const doanhThuQD = laySoTheoKhoangX(0.48, 0.65);
      const dtQDKhoanVay = laySoTheoKhoangX(0.65, 0.8);
      const dtTraThangQD = laySoTheoKhoangX(0.8, 1.0);

      daXetMa.add(maNV);
      ketQua.push({
        maNV,
        hoTen,
        soLuong,
        doanhThuThuc: 0,
        doanhThuQD,
        target: 0,
        dtQDKhoanVay,
        dtTraThangQD,
        dtTraGop: 0,
        phanTramHT: 0,
        phanTramQuyDoi: 0,
        phanTramTraGop: 0,
        gioCong: 0,
        soNgayNghi: 0,
        nangSuat: 0,
      });
    } else {
      // Bảng rộng: HỌ VÀ TÊN | DTLK | DTQĐ | TARGET | % HT | % QĐ | % TRẢ GÓP | DT TRẢ GÓP | GIỜ CÔNG | SỐ NGÀY NGHỈ | NĂNG SUẤT
      const cacSo = cacPhanTuSoCungHang.map(
        p => chuyenChuoiThanhSoDoanhThu(p.chu) ?? 0
      );
      daXetMa.add(maNV);
      ketQua.push({
        maNV,
        hoTen,
        soLuong: 0,
        doanhThuThuc: cacSo[0] || 0,
        doanhThuQD: cacSo[1] || 0,
        target: cacSo[2] || 0,
        phanTramHT: cacSo[3] || 0,
        phanTramQuyDoi: cacSo[4] || 0,
        phanTramTraGop: cacSo[5] || 0,
        dtTraGop: cacSo[6] || 0,
        gioCong: cacSo[7] || 0,
        soNgayNghi: cacSo[8] || 0,
        nangSuat: cacSo[9] || 0,
        dtQDKhoanVay: 0,
        dtTraThangQD: cacSo[0] || 0,
      });
    }
  }

  return ketQua;
}

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const AnhSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(100).max(8_000_000),
});

const BodySchema = z.object({
  loai: z.enum([
    "doanh_thu_thuc",
    "doanh_thu_quy_doi",
    "thi_dua",
    "thi_dua_nhan_vien",
    "doanh_thu_nhan_vien",
  ]),
  tenNganhHangGoiY: z.string().max(200).optional(),
  anh: z.array(AnhSchema).min(1).max(10),
});

function chuoiToiDa(max: number) {
  return z.preprocess(value => (value == null ? "" : String(value)), z.string().max(max));
}

const SoSchema = z.preprocess(value => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%….\s]+$/g, "").replace(/,/g, "").trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}, z.number());

const DongThiDuaSchema = z.object({
  tenNganhHang: chuoiToiDa(200),
  loaiChiTieu: chuoiToiDa(20).default("DT"),
  thucHien: SoSchema.default(0),
  target: SoSchema.default(0),
  phanTramHT: SoSchema.optional(),
  phanTramDuBao: SoSchema.optional(),
});

const DoanhThuSchema = z.object({
  doanhThuThuc: SoSchema.default(0),
  targetThuc: SoSchema.default(0),
  duKienThuc: SoSchema.default(0),
  phanTramHTThuc: SoSchema.default(0),
  doanhThuQuyDoi: SoSchema.default(0),
  targetQuyDoi: SoSchema.default(0),
  duKienQuyDoi: SoSchema.default(0),
  phanTramHTQuyDoi: SoSchema.default(0),
  phanTramTraGop: SoSchema.default(0),
  doanhThuTraGop: SoSchema.default(0),
  luotKhach: SoSchema.default(0),
  soBill: SoSchema.default(0),
  phanTramPVTC: SoSchema.default(0),
  tangGiamCungKy: SoSchema.default(0),
  coTangGiam: z.boolean().default(false),
  tb3Thang: SoSchema.default(0),
  soNgayDaQua: SoSchema.default(0),
  tongSoNgay: SoSchema.default(0),
  phanTramTienDoThang: SoSchema.default(0),
});

const NhanVienThiDuaItemSchema = z.object({
  maNV: chuoiToiDa(50).default(""),
  hoTen: chuoiToiDa(120).default(""),
  thucHien: SoSchema.default(0),
  target: SoSchema.default(0),
});

const KhoiThiDuaNhanVienSchema = z.object({
  tenNganhHang: chuoiToiDa(200).default(""),
  danhSach: z.array(NhanVienThiDuaItemSchema).max(300).default([]),
});

const DoanhThuNhanVienItemSchema = z.object({
  maNV: chuoiToiDa(50).default(""),
  hoTen: chuoiToiDa(120).default(""),
  soLuong: SoSchema.default(0),
  doanhThuThuc: SoSchema.default(0),
  doanhThuQD: SoSchema.default(0),
  target: SoSchema.default(0),
  dtQDKhoanVay: SoSchema.default(0),
  dtTraThangQD: SoSchema.default(0),
  dtTraGop: SoSchema.default(0),
  phanTramHT: SoSchema.default(0),
  phanTramQuyDoi: SoSchema.default(0),
  phanTramTraGop: SoSchema.default(0),
  gioCong: SoSchema.default(0),
  soNgayNghi: SoSchema.default(0),
  nangSuat: SoSchema.default(0),
});

const KetQuaSchema = z.object({
  tieuDe: chuoiToiDa(180).default("Kết quả tổng hợp ĐMX"),
  kyBaoCao: chuoiToiDa(120).default(""),
  donVi: chuoiToiDa(120).default(""),
  danhSachThiDua: z.array(DongThiDuaSchema).max(200).default([]),
  doanhThu: DoanhThuSchema.optional(),
  thiDuaNhanVien: z.array(KhoiThiDuaNhanVienSchema).max(100).default([]),
  doanhThuNhanVien: z.array(DoanhThuNhanVienItemSchema).max(300).default([]),
});

function docJsonGemini(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

const luotDoc = new Map<string, number[]>();

function vuotGioiHan(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const ganDay = (luotDoc.get(ip) || []).filter(time => now - time < 10 * 60_000);
  if (ganDay.length >= 40) return true;
  ganDay.push(now);
  luotDoc.set(ip, ganDay);
  return false;
}

export async function POST(request: Request) {
  if (vuotGioiHan(request)) {
    return NextResponse.json({ loi: "Đã đọc quá nhiều ảnh. Hãy thử lại sau ít phút." }, { status: 429 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ loi: "Ảnh hoặc loại báo cáo không hợp lệ." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ loi: "Máy chủ chưa có khóa Gemini API." }, { status: 503 });
  }

  let prompt = "";
  if (body.loai === "thi_dua" || body.loai === "thi_dua_nhan_vien") {
    prompt = `Bạn là hệ thống đọc ảnh báo cáo Thi Đua của Điện Máy Xanh (ĐMX).
Hãy đọc ${body.anh.length} ảnh chụp màn hình và phân loại theo 2 trường hợp:

TRƯỜNG HỢP A — Ảnh Thi đua tổng hợp siêu thị (có cột TARGET, % HT THÁNG, % DỰ BÁO):
Trích xuất vào mảng danhSachThiDua:
- Ô tiêu đề bên trái: Tên ngành hàng / chương trình (ví dụ: "T10 - Máy Lạnh", "T09 - T10 IPHONE 18 series, iPhone Duo", "T10 - NẠP - RÚT TIỀN TÀI KHOẢN NGÂN HÀNG", "T10 - Bảo Hiểm Tổng"...). Giữ nguyên tên chương trình trong ô tiêu đề, KHÔNG ghép tên siêu thị (như "ĐML_QNG_QNG - 275 Quang Trung") hay chữ "TỔNG" vào tên ngành hàng.
- Cột 2: Tiêu đề là "SỐ LƯỢNG" (loaiChiTieu = "SL") hoặc "DOANH THU" (loaiChiTieu = "DT"), bên dưới là số Thực hiện (thucHien).
- Cột 3: Tiêu đề là "TARGET", bên dưới là số Mục tiêu (target).
- Cột 4: "% HT THÁNG" -> phanTramHT.
- Cột 5: "% DỰ BÁO" -> phanTramDuBao.

TRƯỜNG HỢP B — Ảnh Thi đua chi tiết từng nhân viên của một ngành hàng (ví dụ: góc trên bên trái có tên ngành hàng như "T09 - T10 IPHONE 18 series, iPhone Duo" hoặc "T10 - BẢO HIỂM THỢ ĐMX_CE", cột 2 là "DOANH THU" hoặc "SỐ LƯỢNG" hoặc "THỰC HIỆN", cột 3 là "HẠNG TRONG ST" hoặc "CÒN / VƯỢT", bên dưới liệt kê các dòng nhân viên như "261423 - Trần Nam Tùng | 583.19", "65255 - Nguyễn Thị Thu Thảo | 539.23" hoặc "Thị Chanh - 34922 | 58 / 48"):
Trích xuất vào mảng thiDuaNhanVien:
- tenNganhHang: Tên ngành hàng của bảng đó${body.tenNganhHangGoiY ? ` (nếu ảnh bị khuất tiêu đề thì dùng "${body.tenNganhHangGoiY}")` : ""}.
- danhSach: Mảng các nhân viên trong bảng đó (bỏ qua dòng "TỔNG" hoặc "online - Online"):
  + maNV: Mã số nhân viên (chỉ lấy chuỗi số, ví dụ "261423" từ "261423 - Trần Nam Tùng" hoặc "34922" từ "Thị Chanh - 34922").
  + hoTen: Họ tên nhân viên (ví dụ "Trần Nam Tùng" hoặc "Thị Chanh").
  + thucHien: Con số Thực hiện của nhân viên đó (ví dụ 583.19 hoặc 58).
  + target: Con số Target cá nhân nếu có trong ảnh (ví dụ 48 trong "58 / 48", nếu không có thì để 0).

Quy tắc quan trọng:
1. Bỏ qua chữ in chìm (watermark) chéo trên nền như mã nhân viên (ví dụ "54453 - Dũng Nguyễn Thanh").
2. Nếu một khối ở sát đáy ảnh bị cắt khuất dòng số liệu bên dưới, hãy bỏ qua khối bị cắt đó.
3. Chuyển đổi đúng dấu phân cách hàng nghìn ("4,476.28" -> 4476.28).`;
  } else if (body.loai === "doanh_thu_nhan_vien") {
    prompt = `Bạn là hệ thống đọc ảnh bảng "Doanh thu hợp nhất" theo nhân viên (hoặc bảng "Doanh thu nhân viên") của Điện Máy Xanh (ĐMX).
Hãy đọc ${body.anh.length} ảnh chụp màn hình và trích xuất danh sách nhân viên vào mảng doanhThuNhanVien.
Trong ảnh có thể là:
1) Bảng lưới "Doanh thu hợp nhất" có các cột:
   - "NHÂN VIÊN / NGÀ...": hiển thị dạng "24939 - Phan Ho..." hoặc "65255 - Nguyễn..." -> tách maNV = "24939", hoTen = "Phan Ho".
   - "SỐ LƯỢNG": ví dụ 220 -> soLuong = 220.
   - "DOANH THU QĐ": ví dụ "1,412" -> doanhThuQD = 1412.
   - "DT QĐ KHOẢN VAY": ví dụ 0 hoặc 2 -> dtQDKhoanVay = 2.
   - "DT TRẢ THẲNG QĐ": ví dụ 924 -> dtTraThangQD = 924.
2) Hoặc bảng "Doanh thu nhân viên" có các cột:
   - "HỌ VÀ TÊN": ví dụ "Hoàng Sơn - 24939" -> tách maNV = "24939", hoTen = "Hoàng Sơn".
   - "DTLK": doanhThuThuc.
   - "DTQĐ": doanhThuQD.
   - "TARGET": target.
   - "% HOÀN THÀNH": phanTramHT.
   - "% QUY ĐỔI": phanTramQuyDoi.
   - "% TRẢ GÓP": phanTramTraGop.
   - "DT TRẢ GÓP": dtTraGop.
   - "GIỜ CÔNG": gioCong.
   - "SỐ NGÀY NGHỈ": soNgayNghi.
   - "NĂNG SUẤT": nangSuat.

Quy tắc:
- Bỏ qua chữ in chìm (watermark) chéo trên nền (như "54453 - Dũng Nguyễn Thanh").
- Bỏ qua dòng "Tổng" ở cuối bảng hoặc dòng bị cắt một nửa ở sát mép dưới ảnh.
- Dấu phẩy trong "1,412", "1,278" là dấu phân cách hàng nghìn -> chuyển thành 1412, 1278. Nếu định dạng kiểu "1.361,09" thì chuyển thành 1361.09.`;
  } else {
    prompt = `Bạn là hệ thống đọc ảnh màn hình "Doanh thu hợp nhất" (Lũy kế DT thực & DT quy đổi) của Điện Máy Xanh (ĐMX).
Người dùng có thể gửi 1 hoặc 2 ảnh chụp màn hình:
- Ảnh chế độ "DT thực": bên dưới thanh "Quỹ thời gian" có thẻ đầu tiên là "DT thực" (kèm "DT dự kiến", "% HT target" có dòng phụ "Target trọn kỳ ...", "TT vs TB 3 tháng", "TLPVTC lũy kế", "Tỷ trọng trả chậm").
- Ảnh chế độ "DT quy đổi": bên dưới thanh "Quỹ thời gian" có thẻ đầu tiên là "DT quy đổi" (kèm "DT quy đổi khoản vay", "DT dự kiến", "% HT target" có dòng phụ "Target trọn kỳ ...", "TT vs TB 3 tháng", "TLPVTC lũy kế", "Tỷ trọng trả chậm").
(Lưu ý: Trên thanh nút chuyển đổi phía trên "Quỹ thời gian" luôn có cả 2 chữ "DT thực" và "DT quy đổi"; hãy phân biệt ảnh đang ở chế độ nào dựa vào tiêu đề của thẻ đầu tiên bên dưới thanh "Quỹ thời gian" hoặc nút nào đang tô màu xanh đậm).

Hãy tổng hợp tất cả các ảnh được gửi và trích xuất vào đối tượng doanhThu:
- soNgayDaQua, tongSoNgay, phanTramTienDoThang: Đọc từ thanh "Quỹ thời gian: 29/31 ngày ... 94%" (hoặc "Tiến độ tháng Ngày 21 / 31 ... 67.7%") -> soNgayDaQua = 29, tongSoNgay = 31, phanTramTienDoThang = 94.
- doanhThuThuc: Số lớn trong thẻ "DT thực" (ví dụ "10,957" -> 10957).
- targetThuc: Số "Target trọn kỳ ..." trong thẻ "% HT target" của ảnh DT thực (ví dụ "Target trọn kỳ 11,128" -> 11128).
- duKienThuc: Số lớn trong thẻ "DT dự kiến" của ảnh DT thực (ví dụ "11,698" -> 11698).
- phanTramHTThuc: Số % trong thẻ "% HT target" của ảnh DT thực (ví dụ "98.5%" -> 98.5).
- doanhThuQuyDoi: Số lớn trong thẻ "DT quy đổi" (ví dụ "14,922" -> 14922).
- targetQuyDoi: Số "Target trọn kỳ ..." trong thẻ "% HT target" của ảnh DT quy đổi (ví dụ "Target trọn kỳ 14,957" -> 14957).
- duKienQuyDoi: Số lớn trong thẻ "DT dự kiến" của ảnh DT quy đổi (ví dụ "15,936" -> 15936).
- phanTramHTQuyDoi: Số % trong thẻ "% HT target" của ảnh DT quy đổi (ví dụ "99.8%" -> 99.8).
- phanTramTraGop: Số % trong thẻ "Tỷ trọng trả chậm" hoặc "% TRẢ GÓP" (ví dụ "41.9%" hoặc "42.7%" -> 42.7).
- doanhThuTraGop: Số doanh thu trả góp ở dòng phụ bên dưới thẻ "Tỷ trọng trả chậm" (ví dụ "DT trả góp 4,587 / 10,957" -> 4587, hoặc "DT trả góp QĐ 6,379 / 14,922" -> 6379).
- phanTramPVTC: Số % lớn trong thẻ "TLPVTC lũy kế" (ví dụ "11.7%" -> 11.7).
- soBill: Số bill ở dòng phụ thẻ "TLPVTC lũy kế" (ví dụ "2,238 bill / 19,149 khách" -> 2238).
- luotKhach: Số khách ở dòng phụ thẻ "TLPVTC lũy kế" (ví dụ "2,238 bill / 19,149 khách" -> 19149).
- tangGiamCungKy: Số % (giữ nguyên dấu âm/dương) trong thẻ "TT vs TB 3 tháng" hoặc "TĂNG/GIẢM CÙNG KỲ" (ví dụ "-5.6%" -> -5.6). Đặt coTangGiam = true nếu đọc được chỉ số này.
- tb3Thang: Số "TB3T cùng cửa sổ: ..." ở dòng phụ thẻ "TT vs TB 3 tháng" (ví dụ "11,609" -> 11609).

Lưu ý định dạng số: Dấu phẩy trong "10,957", "14,922", "19,149" là dấu phân cách hàng nghìn -> chuyển thành 10957, 14922, 19149. Nếu ảnh định dạng kiểu "8.541,00" thì chuyển thành 8541.00.`;
  }

  const responseSchema = {
    type: "object",
    properties: {
      tieuDe: { type: "string" },
      kyBaoCao: { type: "string" },
      donVi: { type: "string" },
      danhSachThiDua: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tenNganhHang: { type: "string" },
            loaiChiTieu: { type: "string" },
            thucHien: { type: "number" },
            target: { type: "number" },
            phanTramHT: { type: "number" },
            phanTramDuBao: { type: "number" },
          },
          required: ["tenNganhHang", "loaiChiTieu", "thucHien", "target"],
        },
      },
      doanhThu: {
        type: "object",
        properties: {
          doanhThuThuc: { type: "number" },
          targetThuc: { type: "number" },
          duKienThuc: { type: "number" },
          phanTramHTThuc: { type: "number" },
          doanhThuQuyDoi: { type: "number" },
          targetQuyDoi: { type: "number" },
          duKienQuyDoi: { type: "number" },
          phanTramHTQuyDoi: { type: "number" },
          phanTramTraGop: { type: "number" },
          doanhThuTraGop: { type: "number" },
          luotKhach: { type: "number" },
          soBill: { type: "number" },
          phanTramPVTC: { type: "number" },
          tangGiamCungKy: { type: "number" },
          coTangGiam: { type: "boolean" },
          tb3Thang: { type: "number" },
          soNgayDaQua: { type: "number" },
          tongSoNgay: { type: "number" },
          phanTramTienDoThang: { type: "number" },
        },
        required: ["doanhThuThuc", "targetThuc", "doanhThuQuyDoi", "targetQuyDoi"],
      },
      thiDuaNhanVien: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tenNganhHang: { type: "string" },
            danhSach: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  maNV: { type: "string" },
                  hoTen: { type: "string" },
                  thucHien: { type: "number" },
                  target: { type: "number" },
                },
                required: ["maNV", "hoTen", "thucHien"],
              },
            },
          },
          required: ["tenNganhHang", "danhSach"],
        },
      },
      doanhThuNhanVien: {
        type: "array",
        items: {
          type: "object",
          properties: {
            maNV: { type: "string" },
            hoTen: { type: "string" },
            soLuong: { type: "number" },
            doanhThuThuc: { type: "number" },
            doanhThuQD: { type: "number" },
            target: { type: "number" },
            dtQDKhoanVay: { type: "number" },
            dtTraThangQD: { type: "number" },
            dtTraGop: { type: "number" },
            phanTramHT: { type: "number" },
            phanTramQuyDoi: { type: "number" },
            phanTramTraGop: { type: "number" },
            gioCong: { type: "number" },
            soNgayNghi: { type: "number" },
            nangSuat: { type: "number" },
          },
          required: ["maNV", "hoTen", "doanhThuQD"],
        },
      },
    },
    required: ["tieuDe", "kyBaoCao", "donVi", "danhSachThiDua"],
  };

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                ...body.anh.map(anh => ({ inlineData: { mimeType: anh.mimeType, data: anh.data } })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 32768,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
        signal: AbortSignal.timeout(80_000),
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      console.error("Gemini DMX failed", response.status, String(payload?.error?.message || "").slice(0, 300));
      const invalidKey = response.status === 400 || response.status === 401 || response.status === 403;
      return NextResponse.json(
        {
          loi:
            response.status === 429
              ? "Hệ thống đang bận. Hãy thử lại sau ít giây."
              : invalidKey
                ? "Khóa Gemini API trên máy chủ chưa hợp lệ."
                : "Chưa đọc được ảnh này.",
        },
        { status: response.status === 429 ? 429 : invalidKey ? 503 : 502 }
      );
    }

    const candidate = payload?.candidates?.[0];
    const text =
      candidate?.content?.parts
        ?.filter((part: { text?: string }) => typeof part.text === "string")
        .map((part: { text: string }) => part.text)
        .join("") || "";

    if (!text) {
      return NextResponse.json({ loi: "Không nhận diện được số liệu trong ảnh." }, { status: 502 });
    }

    let raw: unknown;
    try {
      raw = docJsonGemini(text);
    } catch {
      return NextResponse.json({ loi: "Dữ liệu trả về chưa đúng cấu trúc. Hãy thử lại." }, { status: 502 });
    }

    const checked = KetQuaSchema.safeParse(raw);
    if (!checked.success) {
      return NextResponse.json({ loi: "Bảng số liệu chưa đầy đủ cấu trúc. Hãy thử lại." }, { status: 502 });
    }

    return NextResponse.json(checked.data);
  } catch (error) {
    console.error("Unable to read DMX images", error instanceof Error ? error.message : error);
    return NextResponse.json({ loi: "Không thể kết nối đọc ảnh. Hãy thử lại." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const AnhSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(100).max(8_000_000),
});

const BodySchema = z.object({
  loai: z.enum(["doanh_thu_thuc", "doanh_thu_quy_doi", "thi_dua"]),
  anh: z.array(AnhSchema).min(1).max(10),
});

function chuoiToiDa(max: number) {
  return z.preprocess(value => value == null ? "" : String(value), z.string().max(max));
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

const KetQuaSchema = z.object({
  tieuDe: chuoiToiDa(180).default("Kết quả tổng hợp ĐMX"),
  kyBaoCao: chuoiToiDa(120).default(""),
  donVi: chuoiToiDa(120).default(""),
  danhSachThiDua: z.array(DongThiDuaSchema).max(200).default([]),
  doanhThu: DoanhThuSchema.optional(),
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

  const laThiDua = body.loai === "thi_dua";

  const prompt = laThiDua
    ? `Bạn là hệ thống đọc ảnh báo cáo Thi Đua của Điện Máy Xanh (ĐMX).
Hãy đọc ${body.anh.length} ảnh chụp màn hình mục "Thi đua" và trích xuất danh sách các chương trình thi đua.
Mỗi khối chương trình trong ảnh có:
- Ô tiêu đề bên trái: Tên ngành hàng / chương trình (ví dụ: "T10 - Máy Lạnh", "T09 - T10 IPHONE 18 series, iPhone Duo", "T10 - NẠP - RÚT TIỀN TÀI KHOẢN NGÂN HÀNG", "T10 - Bảo Hiểm Tổng"...). Giữ nguyên tên chương trình trong ô tiêu đề, KHÔNG ghép tên siêu thị (như "ĐML_QNG_QNG - 275 Quang Trung") hay chữ "TỔNG" vào tên ngành hàng.
- Cột 2: Tiêu đề là "SỐ LƯỢNG" (loaiChiTieu = "SL") hoặc "DOANH THU" (loaiChiTieu = "DT"), bên dưới là số Thực hiện (thucHien).
- Cột 3: Tiêu đề là "TARGET", bên dưới là số Mục tiêu (target).
- Cột 4: Tiêu đề là "% HT THÁNG", bên dưới là số % hoàn thành tháng (phanTramHT).
- Cột 5: Tiêu đề là "% DỰ BÁO", bên dưới là số % dự báo (phanTramDuBao).

Quy tắc quan trọng:
1. Bỏ qua chữ in chìm (watermark) chéo trên nền như mã nhân viên (ví dụ "54453") và tên nhân viên.
2. Nếu một khối ở sát đáy ảnh bị cắt khuất dòng số liệu bên dưới (chưa thấy số Thực hiện và Target), hãy bỏ qua khối bị cắt đó.
3. Dấu phẩy trong số kiểu "4,476.28" là dấu phân cách hàng nghìn -> chuyển thành số thực 4476.28. Nếu ảnh định dạng kiểu "1.055,10" thì chuyển thành 1055.10.
4. Khử trùng lặp nếu cùng một chương trình xuất hiện ở nhiều ảnh cuộn trang.`
    : `Bạn là hệ thống đọc ảnh màn hình "Doanh thu hợp nhất" (Lũy kế DT thực & DT quy đổi) của Điện Máy Xanh (ĐMX).
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

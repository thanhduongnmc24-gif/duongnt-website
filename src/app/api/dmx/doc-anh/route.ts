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
  doanhThuQuyDoi: SoSchema.default(0),
  targetQuyDoi: SoSchema.default(0),
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
    : `Bạn là hệ thống đọc ảnh chỉ số Doanh Thu (Doanh thu thực & Doanh thu quy đổi) của Điện Máy Xanh (ĐMX).
Hãy đọc ảnh và trích xuất 4 con số vào đối tượng doanhThu:
- doanhThuThuc: Con số Doanh thu thực hiện
- targetThuc: Con số Target của Doanh thu thực (nếu có)
- doanhThuQuyDoi: Con số Doanh thu quy đổi (QĐ)
- targetQuyDoi: Con số Target của Doanh thu quy đổi (nếu có)
Lưu ý: Chuyển đổi đúng định dạng số (ví dụ "8.541,00" -> 8541.00, "14.466,40" -> 14466.40, hoặc "8,541.00" -> 8541.00).`;

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
          doanhThuQuyDoi: { type: "number" },
          targetQuyDoi: { type: "number" },
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

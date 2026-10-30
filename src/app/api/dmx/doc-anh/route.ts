import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const AnhSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(100).max(8_000_000),
});

const BodySchema = z.object({
  loai: z.enum(["doanh_thu_thuc", "doanh_thu_quy_doi", "thi_dua"]),
  anh: z.array(AnhSchema).min(1).max(5),
});

const BangSchema = z.object({
  tieuDe: z.string().min(1).max(160),
  cot: z.array(z.string().min(1).max(80)).min(1).max(30),
  dong: z.array(z.object({ o: z.array(z.string().max(300)).min(1).max(30) })).max(500),
});

const KetQuaSchema = z.object({
  tieuDe: z.string().min(1).max(180),
  kyBaoCao: z.string().max(120),
  donVi: z.string().max(120),
  tongQuan: z.array(z.object({ nhan: z.string().max(80), giaTri: z.string().max(100) })).max(12),
  bang: z.array(BangSchema).min(1).max(12),
  canhBao: z.array(z.string().max(240)).max(20),
});

const luotDoc = new Map<string, number[]>();

function vuotGioiHan(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const ganDay = (luotDoc.get(ip) || []).filter(time => now - time < 10 * 60_000);
  if (ganDay.length >= 20) return true;
  ganDay.push(now); luotDoc.set(ip, ganDay);
  return false;
}

const tenLoai = {
  doanh_thu_thuc: "Doanh thu thực",
  doanh_thu_quy_doi: "Doanh thu quy đổi",
  thi_dua: "Thi đua",
} as const;

export async function POST(request: Request) {
  if (vuotGioiHan(request)) return NextResponse.json({ loi: "Đã đọc quá nhiều ảnh. Hãy thử lại sau ít phút." }, { status: 429 });

  let body: z.infer<typeof BodySchema>;
  try { body = BodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ loi: "Ảnh hoặc loại báo cáo không hợp lệ." }, { status: 400 }); }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ loi: "Máy chủ chưa có khóa Gemini API." }, { status: 503 });

  const prompt = `Bạn là chuyên viên tổng hợp số liệu ĐMX. Hãy đọc kỹ ${body.anh.length} ảnh báo cáo thuộc mục “${tenLoai[body.loai]}” và chuyển toàn bộ số liệu nhìn thấy thành các bảng có cấu trúc.

Quy tắc bắt buộc:
- Chỉ ghi dữ liệu thật sự nhìn thấy trong ảnh, tuyệt đối không tự bịa số.
- Giữ nguyên tên hàng, tên cột, đơn vị, dấu âm, dấu phần trăm và cách viết số. Nếu nhiều ảnh là các phần của cùng bảng thì ghép đúng thứ tự và bỏ dòng tiêu đề bị lặp.
- Nếu một ký tự hoặc con số không chắc chắn, vẫn chép giá trị tốt nhất nhưng thêm mô tả vị trí đó vào canhBao.
- Tạo nhiều bảng nếu ảnh chứa nhiều nhóm số liệu khác nhau.
- Mỗi dòng phải có số ô bằng số cột; ô trống dùng chuỗi rỗng.
- tongQuan chỉ chứa các chỉ số nổi bật thực sự có trong ảnh, ví dụ tổng doanh thu, target, tỷ lệ hoàn thành hoặc thứ hạng.
- Trả lời bằng tiếng Việt.`;

  const schema = {
    type: "object",
    properties: {
      tieuDe: { type: "string" }, kyBaoCao: { type: "string" }, donVi: { type: "string" },
      tongQuan: { type: "array", items: { type: "object", properties: { nhan: { type: "string" }, giaTri: { type: "string" } }, required: ["nhan", "giaTri"] } },
      bang: { type: "array", items: { type: "object", properties: {
        tieuDe: { type: "string" }, cot: { type: "array", items: { type: "string" } },
        dong: { type: "array", items: { type: "object", properties: { o: { type: "array", items: { type: "string" } } }, required: ["o"] } },
      }, required: ["tieuDe", "cot", "dong"] } },
      canhBao: { type: "array", items: { type: "string" } },
    },
    required: ["tieuDe", "kyBaoCao", "donVi", "tongQuan", "bang", "canhBao"],
  };

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, ...body.anh.map(anh => ({ inlineData: { mimeType: anh.mimeType, data: anh.data } }))] }],
        generationConfig: { temperature: 0.05, responseMimeType: "application/json", responseSchema: schema },
      }),
      signal: AbortSignal.timeout(80_000),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.error("Gemini DMX failed", response.status, String(payload?.error?.message || "").slice(0, 300));
      const invalidKey = response.status === 400 || response.status === 401 || response.status === 403;
      return NextResponse.json({ loi: response.status === 429 ? "Gemini đang bận. Hãy thử lại sau ít phút." : invalidKey ? "Khóa Gemini API trên máy chủ chưa hợp lệ." : "Gemini chưa đọc được ảnh này." }, { status: response.status === 429 ? 429 : invalidKey ? 503 : 502 });
    }
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => typeof part.text === "string")?.text;
    const parsed = KetQuaSchema.parse(JSON.parse(text || "{}"));
    const normalized = { ...parsed, bang: parsed.bang.map(bang => ({ ...bang, dong: bang.dong.map(dong => ({ o: [...dong.o, ...Array(Math.max(0, bang.cot.length - dong.o.length)).fill("")].slice(0, bang.cot.length) })) })) };
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Unable to read DMX images", error instanceof Error ? error.message : error);
    return NextResponse.json({ loi: "Gemini chưa phản hồi hoặc kết quả chưa đúng cấu trúc. Hãy thử ảnh rõ hơn." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  quyen: z.union([z.literal(1), z.literal(2)]),
  trang: z.number().int().min(3).max(47),
  anhBaiLam: z.string().max(8_000_000),
});

const KetQuaSchema = z.object({
  diem: z.number().min(0).max(10),
  soDung: z.number().int().min(0),
  tongSo: z.number().int().min(1),
  nhanXet: z.string().min(1).max(500),
  chiTiet: z.array(z.object({
    cau: z.string().min(1).max(120),
    beViet: z.string().max(120),
    dapAn: z.string().min(1).max(200),
    dung: z.boolean(),
    nhanXet: z.string().max(250),
  })).max(80),
});

const luotCham = new Map<string, number[]>();

function vuotGioiHan(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const ganDay = (luotCham.get(ip) || []).filter(time => now - time < 10 * 60_000);
  if (ganDay.length >= 12) return true;
  ganDay.push(now);
  luotCham.set(ip, ganDay);
  return false;
}

export async function POST(request: Request) {
  if (vuotGioiHan(request)) return NextResponse.json({ loi: "Bé đã chấm nhiều lần. Hãy nghỉ một chút rồi thử lại nhé." }, { status: 429 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ loi: "Dữ liệu trang bài không hợp lệ." }, { status: 400 });
  }

  const match = body.anhBaiLam.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return NextResponse.json({ loi: "Ảnh bài làm không hợp lệ." }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ loi: "Chức năng nhận dạng chữ viết tay chưa có khóa Gemini API trên máy chủ." }, { status: 503 });
  }

  const prompt = `Bạn là giáo viên Toán lớp 1 Việt Nam. Đây là trang bài tập được dựng bằng nét vector; học sinh đã viết đáp án bằng mực xanh dương đậm trực tiếp lên các ô trống và vùng trả lời. Trang thuộc quyển ${body.quyen}, trang ${body.trang}.

Đọc tất cả phần viết tay màu xanh, phân biệt với chữ và hình in sẵn màu đen/xám/đỏ. Tự giải từng câu đúng theo đề rồi chấm. Một "Bài" có thể có nhiều ý a, b, c hoặc nhiều ô trống; mỗi ý/ô có đáp án độc lập. Không tính chữ và số in sẵn là câu trả lời của học sinh. Không phạt các câu bé chưa viết; vẫn liệt kê chúng để phụ huynh biết. Chấp nhận chữ số viết tay hơi lệch hoặc chạm dòng kẻ nếu vẫn nhận ra được. Điểm theo thang 10 dựa trên số ô/ý đúng trên tổng số ô/ý có thể chấm của trang. Nhận xét ngắn, tích cực, bằng tiếng Việt và phù hợp trẻ 6 tuổi.`;

  const schema = {
    type: "object",
    properties: {
      diem: { type: "number" },
      soDung: { type: "integer" },
      tongSo: { type: "integer" },
      nhanXet: { type: "string" },
      chiTiet: {
        type: "array",
        items: {
          type: "object",
          properties: {
            cau: { type: "string" },
            beViet: { type: "string" },
            dapAn: { type: "string" },
            dung: { type: "boolean" },
            nhanXet: { type: "string" },
          },
          required: ["cau", "beViet", "dapAn", "dung", "nhanXet"],
        },
      },
    },
    required: ["diem", "soDung", "tongSo", "nhanXet", "chiTiet"],
  };

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: match[1] } },
        ] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = String(payload?.error?.message || "");
      console.error("Gemini grading failed", response.status, message.slice(0, 300));
      return NextResponse.json({ loi: response.status === 429 ? "Máy chấm bài đang bận. Hãy thử lại sau ít phút." : "Máy chấm bài chưa đọc được trang này." }, { status: response.status === 429 ? 429 : 502 });
    }
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => typeof part.text === "string")?.text;
    const parsed = KetQuaSchema.parse(JSON.parse(text || "{}"));
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Unable to grade worksheet", error instanceof Error ? error.message : error);
    return NextResponse.json({ loi: "Máy chấm bài chưa phản hồi. Hãy thử lại." }, { status: 502 });
  }
}

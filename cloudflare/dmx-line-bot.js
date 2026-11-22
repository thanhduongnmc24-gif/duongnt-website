const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
let lineMonthlyQuotaReached = false;

const DEFAULT_SUPABASE_URL = "https://isxrxeaxytyiydxiwvuc.supabase.co";
const DEFAULT_SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeHJ4ZWF4eXR5aXlkeGl3dnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ1OTY1OCwiZXhwIjoyMTAwMDM1NjU4fQ.V7zW8iMiwuKCHGY-1tG1ociK-aeUXwX0BnhqDf1rTo4";
const BUCKET_NAME = "dmx-du-lieu";
const THOI_HAN_MA_PHUT = 10;

const CAC_LOAI_BAO_CAO_BOT = [
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
  "sk",
  "msnv",
];
const CAC_LOAI_LICH = CAC_LOAI_BAO_CAO_BOT.filter(loai => loai !== "msnv");

function supabaseUrl(env) {
  return String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
}

function supabaseKey(env) {
  return String(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_SERVICE_KEY).trim();
}

async function sbRest(env, table, { method = "GET", query = {}, body = undefined, prefer = "", single = false } = {}) {
  const url = new URL(`${supabaseUrl(env)}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const key = supabaseKey(env);
  /** @type {Record<string, string>} */
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: single ? "application/vnd.pgrst.object+json" : "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (single && res.status === 406) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Supabase REST ${method} ${table} (${res.status}): ${errText}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function sbStorageSign(env, objectPath, expiresIn = 1800) {
  const base = supabaseUrl(env);
  const key = supabaseKey(env);
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${base}/storage/v1/object/sign/${BUCKET_NAME}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) return "";
  const data = await res.json().catch(() => ({}));
  const raw = data?.signedURL || data?.signedUrl || "";
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return `${base}/storage/v1${raw.startsWith("/") ? "" : "/"}${raw}`;
}

async function sbStorageDownloadJson(env, objectPath) {
  const base = supabaseUrl(env);
  const key = supabaseKey(env);
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${base}/storage/v1/object/${BUCKET_NAME}/${encodedPath}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

async function sbStorageRemove(env, paths) {
  if (!Array.isArray(paths) || !paths.length) return;
  const base = supabaseUrl(env);
  const key = supabaseKey(env);
  await fetch(`${base}/storage/v1/object/${BUCKET_NAME}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => {});
}

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value).trim()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function randomSixDigits() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

function layGioVietNam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value || "";
  const thuMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const gio = `${get("hour")}:${get("minute")}`;
  return { thu: thuMap[get("weekday")] || 1, gio, ngay: `${get("year")}-${get("month")}-${get("day")}` };
}

function ngayVietNam(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = type => parts.find(p => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function soPhut(gio) {
  const [h, m] = String(gio || "00:00").slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "dmx-line-bot",
        mode: "direct-supabase",
        lineConfigured: Boolean(env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN),
        supabaseUrl: supabaseUrl(env),
        dataConfigured: Boolean(supabaseKey(env)),
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("DMX LINE Bot (Direct Supabase) is running", { status: 200 });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    if (!env.LINE_CHANNEL_SECRET || !env.LINE_CHANNEL_ACCESS_TOKEN) {
      return new Response("LINE secrets are not configured", { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";
    const valid = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
    if (!valid) return new Response("Invalid signature", { status: 401 });

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    ctx.waitUntil(Promise.all((payload.events || []).map(event => handleLineEvent(event, env))));
    return new Response("OK", { status: 200 });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(Promise.all([sendScheduledReport(env), sendDueMentionReminders(env)]));
  },
};

async function handleLineEvent(event, env) {
  const sourceType = event.source?.type || "";
  const groupId = event.source?.groupId || event.source?.roomId || "";
  const lineUserId = event.source?.userId || "";

  if ((sourceType === "group" || sourceType === "room") && groupId && lineUserId
    && (event.type === "message" || event.type === "reaction")) {
    await recordGroupResponse(env, groupId, lineUserId);
  }
  if (event.type === "reaction") return;
  if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) return;

  const rawCommand = event.message.text.trim();
  const normalizedRaw = rawCommand.replace(/^\/+/, "").trim();
  const command = normalizedRaw.toLowerCase();

  if ((sourceType === "group" || sourceType === "room") && groupId && lineUserId) {
    await trackMentionedUsers(env, event, groupId, lineUserId);
  }

  if (sourceType === "group" || sourceType === "room") {
    const matchGanNhom = /^(?:\/)?gannhom\s+(\d{6})$/i.exec(rawCommand);
    if (matchGanNhom && groupId) {
      const tenNhom = await getGroupName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId);
      const report = await bindGroup(env, groupId, matchGanNhom[1], tenNhom);
      await replyReport(env.LINE_CHANNEL_ACCESS_TOKEN, event.replyToken, report);
      return;
    }
  }

  let report = null;

  if (rawCommand === "/" || ["menu", "help", "trogiup", "lenh"].includes(command)) {
    report = commandMenuReport();
  } else if (command === "ping") {
    report = { text: "DMX Bot đang hoạt động (kết nối trực tiếp Supabase)." };
  } else if (command === "id" || command === "groupid") {
    report = {
      text: groupId ? `LINE_GROUP_ID: ${groupId}` : `LINE_USER_ID: ${lineUserId || "Không đọc được"}`,
    };
  } else if (["lienket", "taikhoan", "huyketnoi"].includes(command)) {
    report = await handleAccountCommand(env, `/${command}`, lineUserId);
  } else if (/^(?:\/)?sk\s+\S+$/i.test(rawCommand)) {
    const maNV = normalizedRaw.split(/\s+/)[1] || "";
    report = await loadDmxReport(env, "sk", lineUserId, "", maNV, "", groupId);
  } else if (/^(?:\/)?msnv\s+\S+$/i.test(rawCommand)) {
    const maNV = normalizedRaw.split(/\s+/)[1] || "";
    report = await loadDmxReport(env, "msnv", lineUserId, "", maNV, "", groupId);
  } else if ([
    "tongquan", "doanhthu", "realtime", "luyke", "nhanvien",
    "nvrealtime", "thidua", "suckhoe", "bieudo", "bieudorealtime",
  ].includes(command)) {
    const loaiMap = {
      nvrealtime: "xep_hang_nv_realtime",
      bieudo: "bieu_do_realtime_thang",
      bieudorealtime: "bieu_do_realtime_thang",
    };
    const loaiBaoCao = loaiMap[command] || command;
    report = await loadDmxReport(env, loaiBaoCao, lineUserId, "", "", "", groupId);
  } else {
    return;
  }

  const laLenhRieng = ["lienket", "taikhoan", "huyketnoi"].includes(command);
  const baoCaoGoc = report;
  if (groupId && lineUserId && laLenhRieng) {
    const daGuiRieng = await pushReport(env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId, report);
    if (daGuiRieng) await markCachedImageSent(env, baoCaoGoc, lineUserId);
    report = daGuiRieng
      ? { text: "Bot đã gửi thông tin liên kết tài khoản riêng cho bạn." }
      : { text: "Chưa gửi riêng được. Hãy kết bạn với bot, mở chat riêng rồi gõ lại lệnh." };
  }
  const daPhanHoi = await replyReport(env.LINE_CHANNEL_ACCESS_TOKEN, event.replyToken, report);
  if (daPhanHoi && !laLenhRieng) await markCachedImageSent(env, baoCaoGoc, lineUserId);
}

// ==========================================
// TRUY VẤN & ĐỊNH DẠNG BÁO CÁO TRỰC TIẾP TỪ SUPABASE
// ==========================================

function chuoi(value, macDinh = "") {
  return typeof value === "string" ? value : macDinh;
}

function so(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function doiTuong(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function danhSach(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object") : [];
}

function dinhDangSo(value, toiDa = 2) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: toiDa,
  }).format(value);
}

function dinhDangPhanTram(value) {
  return `${dinhDangSo(value, 1)}%`;
}

function tinhPhanTram(thucHien, target, giaTriGoc) {
  const goc = so(giaTriGoc);
  if (goc !== 0) return goc;
  return target !== 0 ? (thucHien / target) * 100 : 0;
}

function khoaMonThiDua(value) {
  return chuoi(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/^T\d{1,2}\s*[-–]\s*/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function locMonTheoDoi(items, caiDat, realtime) {
  const khoa = realtime ? "monThiDuaTheoDoiRealtime" : "monThiDuaTheoDoiLuyKe";
  const tap = new Set((Array.isArray(caiDat[khoa]) ? caiDat[khoa] : []).map(khoaMonThiDua).filter(Boolean));
  if (!tap.size) return items;
  return items.filter(item => tap.has(khoaMonThiDua(item.tenNganhHangGoc || item.tenNganhHang)));
}

function phanTramTarget(caiDat, realtime) {
  const raw = so(caiDat[realtime ? "phanTramTargetRealtime" : "phanTramTargetLuyKe"]) || 100;
  return Math.min(200, Math.max(50, raw));
}

function hienThiNgay(khoaNgay) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(khoaNgay);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : khoaNgay;
}

function docLoaiBaoCaoBot(value) {
  const raw = String(value || "tongquan").trim().toLowerCase();
  if (CAC_LOAI_BAO_CAO_BOT.includes(raw)) return raw;
  const chuanHoa = raw.replaceAll("_", "");
  if (chuanHoa === "doanhthu" || chuanHoa === "luykedukien") return "doanhthu";
  if (chuanHoa === "tongquan") return "tongquan";
  if (chuanHoa === "realtime") return "realtime";
  if (chuanHoa === "luyke") return "luyke";
  if (chuanHoa === "thidua") return "thidua";
  if (chuanHoa === "nhanvien" || chuanHoa === "nvluyke" || chuanHoa === "xephang") return "nhanvien";
  if (chuanHoa === "nvrealtime" || chuanHoa === "nhanvienrt" || chuanHoa === "xephangnvrealtime") return "xep_hang_nv_realtime";
  if (chuanHoa === "bieudo" || chuanHoa === "bieudorealtime" || chuanHoa === "bieudorealtimethang") return "bieu_do_realtime_thang";
  if (chuanHoa === "suckhoe" || chuanHoa === "bieudosuckhoe" || chuanHoa === "bieudosuckhoenv") return "suckhoe";
  if (chuanHoa === "sk") return "sk";
  if (chuanHoa === "msnv") return "msnv";
  return "tongquan";
}

async function layNguoiDungBot(env) {
  const userId = String(env.DMX_BOT_USER_ID || "").trim();
  if (userId) return userId;
  const tenDangNhap = String(env.DMX_BOT_USERNAME || "duongnt").trim();
  const data = await sbRest(env, "dmx_ho_so", {
    query: { select: "nguoi_dung_id", ten_dang_nhap: `eq.${tenDangNhap}` },
    single: true,
  });
  if (!data?.nguoi_dung_id) throw new Error("Không tìm thấy tài khoản DMX dành cho bot.");
  return String(data.nguoi_dung_id);
}

async function layNguoiDungTheoLine(env, lineUserId, lineGroupId = "") {
  if (lineUserId) {
    const data = await sbRest(env, "dmx_line_lien_ket", {
      query: { select: "nguoi_dung_id", line_user_id: `eq.${lineUserId}` },
      single: true,
    });
    if (data?.nguoi_dung_id) return String(data.nguoi_dung_id);
  }
  if (lineGroupId) {
    const rows = await sbRest(env, "dmx_line_nhom", {
      query: {
        select: "nguoi_dung_id",
        line_group_id: `eq.${lineGroupId}`,
        dang_hoat_dong: "eq.true",
        order: "ngay_cap_nhat.desc",
        limit: "1",
      },
    });
    if (rows?.[0]?.nguoi_dung_id) return String(rows[0].nguoi_dung_id);
  }
  throw new Error("Tài khoản hoặc nhóm LINE chưa liên kết DMX. Gõ lienket (chat riêng) hoặc gannhom MÃ (trong nhóm) để bắt đầu.");
}

async function laySieuThiBaoCao(env, userId, storeIdYeuCau = "", lineGroupId = "") {
  if (storeIdYeuCau) {
    const data = await sbRest(env, "dmx_sieu_thi", {
      query: { select: "id", id: `eq.${storeIdYeuCau}`, nguoi_dung_id: `eq.${userId}` },
      single: true,
    });
    if (data?.id) return String(data.id);
  }
  if (lineGroupId) {
    const rows = await sbRest(env, "dmx_line_lich_gui", {
      query: {
        select: "sieu_thi_id",
        line_group_id: `eq.${lineGroupId}`,
        nguoi_dung_id: `eq.${userId}`,
        dang_hoat_dong: "eq.true",
        order: "ngay_cap_nhat.desc",
        limit: "1",
      },
    });
    if (rows?.[0]?.sieu_thi_id) return String(rows[0].sieu_thi_id);
  }
  const profile = await sbRest(env, "dmx_ho_so", {
    query: { select: "sieu_thi_dang_chon", nguoi_dung_id: `eq.${userId}` },
    single: true,
  });
  if (profile?.sieu_thi_dang_chon) return String(profile.sieu_thi_dang_chon);
  const first = await sbRest(env, "dmx_sieu_thi", {
    query: { select: "id", nguoi_dung_id: `eq.${userId}`, order: "ngay_tao.asc", limit: "1" },
  });
  if (!first?.[0]?.id) throw new Error("Tài khoản chưa có siêu thị để tạo báo cáo.");
  return String(first[0].id);
}

async function taoKetQuaAnhTuBanGhi(env, loaiAnh, banGhi) {
  if (!banGhi) return null;
  if (banGhi.nha_cung_cap === "google_drive" && typeof banGhi.url_ben_ngoai === "string") {
    if (isHttpsUrl(banGhi.url_ben_ngoai)) {
      return {
        loai: loaiAnh,
        url: banGhi.url_ben_ngoai,
        ngay: String(banGhi.ngay || ""),
        ngayCapNhat: String(banGhi.ngay_cap_nhat || ""),
        nhaCungCap: "google_drive",
      };
    }
  }
  if (typeof banGhi.duong_dan_luu_tru !== "string" || !banGhi.duong_dan_luu_tru) return null;
  const signedUrl = await sbStorageSign(env, banGhi.duong_dan_luu_tru, 30 * 60);
  if (!signedUrl) return null;
  return {
    loai: loaiAnh,
    url: signedUrl,
    ngay: String(banGhi.ngay || ""),
    ngayCapNhat: String(banGhi.ngay_cap_nhat || ""),
    nhaCungCap: "supabase",
  };
}

async function layAnhBaoCaoDaTaoSan(env, userId, loai, sieuThiId, ngayBaoCao, maNV = "") {
  if (loai === "sk" || loai === "msnv") {
    const maSach = maNV.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!maSach) return null;
    const loaiSK = `sk_${maSach}`;

    const dungNgay = await sbRest(env, "dmx_line_anh_bao_cao", {
      query: {
        select: "ngay,nha_cung_cap,duong_dan_luu_tru,url_ben_ngoai,ngay_cap_nhat",
        nguoi_dung_id: `eq.${userId}`,
        sieu_thi_id: `eq.${sieuThiId}`,
        loai: `eq.${loaiSK}`,
        ngay: `eq.${ngayBaoCao}`,
      },
      single: true,
    });
    if (dungNgay) {
      const kq = await taoKetQuaAnhTuBanGhi(env, loaiSK, dungNgay);
      if (kq) return kq;
    }

    const moiNhatRows = await sbRest(env, "dmx_line_anh_bao_cao", {
      query: {
        select: "ngay,nha_cung_cap,duong_dan_luu_tru,url_ben_ngoai,ngay_cap_nhat",
        nguoi_dung_id: `eq.${userId}`,
        sieu_thi_id: `eq.${sieuThiId}`,
        loai: `eq.${loaiSK}`,
        order: "ngay_cap_nhat.desc",
        limit: "1",
      },
    });
    if (moiNhatRows?.[0]) {
      const kq = await taoKetQuaAnhTuBanGhi(env, loaiSK, moiNhatRows[0]);
      if (kq) return kq;
    }

    const meta = await sbStorageDownloadJson(env, `bot-anh/${userId}/${sieuThiId}/meta-${loaiSK}.json`);
    if (meta) {
      const kq = await taoKetQuaAnhTuBanGhi(env, loaiSK, {
        ngay: meta.ngay,
        nha_cung_cap: meta.nhaCungCap,
        duong_dan_luu_tru: meta.duongDanLuuTru,
        url_ben_ngoai: meta.urlBenNgoai,
        ngay_cap_nhat: meta.ngayCapNhat,
      });
      if (kq) return kq;
    }
    return null;
  }

  const loaiAnh = ({
    tongquan: "luyke_du_kien",
    doanhthu: "luyke_du_kien",
    luyke: "doanhthu_thidua_luyke",
    thidua: "doanhthu_thidua_luyke",
    realtime: "doanhthu_thidua_realtime",
    nhanvien: "xep_hang_nv_luyke",
    suckhoe: "bieu_do_suc_khoe_nv",
  })[loai] || loai;

  const dungNgay = await sbRest(env, "dmx_line_anh_bao_cao", {
    query: {
      select: "ngay,nha_cung_cap,duong_dan_luu_tru,url_ben_ngoai,ngay_cap_nhat",
      nguoi_dung_id: `eq.${userId}`,
      sieu_thi_id: `eq.${sieuThiId}`,
      loai: `eq.${loaiAnh}`,
      ngay: `eq.${ngayBaoCao}`,
    },
    single: true,
  });
  if (dungNgay) {
    const kq = await taoKetQuaAnhTuBanGhi(env, loaiAnh, dungNgay);
    if (kq) return kq;
  }

  const moiNhatRows = await sbRest(env, "dmx_line_anh_bao_cao", {
    query: {
      select: "ngay,nha_cung_cap,duong_dan_luu_tru,url_ben_ngoai,ngay_cap_nhat",
      nguoi_dung_id: `eq.${userId}`,
      sieu_thi_id: `eq.${sieuThiId}`,
      loai: `eq.${loaiAnh}`,
      order: "ngay_cap_nhat.desc",
      limit: "1",
    },
  });
  if (moiNhatRows?.[0]) {
    return await taoKetQuaAnhTuBanGhi(env, loaiAnh, moiNhatRows[0]);
  }
  return null;
}

async function docDuLieuNgay(env, userId, sieuThiId, ngayYeuCau = "") {
  const query = {
    select: "ngay,du_lieu,ngay_cap_nhat",
    nguoi_dung_id: `eq.${userId}`,
    sieu_thi_id: `eq.${sieuThiId}`,
  };
  if (ngayYeuCau) {
    query.ngay = `eq.${ngayYeuCau}`;
  } else {
    query.order = "ngay_cap_nhat.desc";
    query.limit = "1";
  }
  const rows = await sbRest(env, "dmx_du_lieu_ngay", { query });
  const data = Array.isArray(rows) ? rows[0] : rows;
  if (data?.ngay && data.du_lieu && typeof data.du_lieu === "object") {
    const duLieu = data.du_lieu;
    if (!chuoi(duLieu.capNhatLuc) && data.ngay_cap_nhat) duLieu.capNhatLuc = String(data.ngay_cap_nhat);
    return { ngay: String(data.ngay), duLieu, ngayCapNhat: String(data.ngay_cap_nhat || "") };
  }
  throw new Error("Chưa có dữ liệu DMX trên Supabase để tạo báo cáo.");
}

function taoDongThiDua(items, gioiHan = 12) {
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
        sapXep: phanTram,
      };
    })
    .sort((a, b) => b.sapXep - a.sapXep)
    .slice(0, gioiHan);
}

function taoDongNhanVien(items, gioiHan = 16) {
  const tongDoanhThu = items.reduce((sum, item) => sum + so(item.doanhThuQD), 0);
  return items
    .map(item => {
      const doanhThu = so(item.doanhThuQD);
      const tiTrong = tongDoanhThu !== 0 ? (doanhThu / tongDoanhThu) * 100 : 0;
      return {
        ten: `${chuoi(item.maNV)} - ${chuoi(item.hoTen)}`.replace(/^\s*-\s*/, ""),
        giaTri: dinhDangSo(doanhThu),
        chiTiet: `Số lượng ${dinhDangSo(so(item.soLuong))} • Tỉ trọng ${dinhDangPhanTram(tiTrong)}`,
        sapXep: doanhThu,
      };
    })
    .sort((a, b) => b.sapXep - a.sapXep)
    .slice(0, gioiHan);
}

function thongKeSucKhoe(duLieu, caiDat) {
  const luyKe = danhSach(duLieu.doanhThuNhanVien);
  const realtime = danhSach(duLieu.doanhThuNhanVienRealtime);
  const bangThiDua = doiTuong(duLieu.thiDuaNhanVien);
  const sucKhoeBoSung = doiTuong(duLieu.sucKhoeBoSungNhanVien);
  const dsQuanLy = danhSach(caiDat.danhSachNhanVien);
  const chiaTarget = doiTuong(caiDat.chiaTargetNganhHang);
  const cacMon = danhSach(duLieu.danhSachThiDua);
  const maNVs = new Set([
    ...dsQuanLy.map(item => chuoi(item.maNV)).filter(Boolean),
    ...luyKe.map(item => chuoi(item.maNV)).filter(Boolean),
    ...realtime.map(item => chuoi(item.maNV)).filter(Boolean),
    ...Object.keys(bangThiDua),
    ...Object.keys(sucKhoeBoSung),
  ]);
  const tongDT = luyKe.reduce((sum, item) => sum + Math.max(0, so(item.doanhThuQD)), 0);
  return [...maNVs].map(maNV => {
    const nvQuanLy = dsQuanLy.find(item => chuoi(item.maNV) === maNV) || {};
    const nv = luyKe.find(item => chuoi(item.maNV) === maNV) || realtime.find(item => chuoi(item.maNV) === maNV) || nvQuanLy;
    const skBoSung = doiTuong(sucKhoeBoSung[maNV]);
    const soBanTheoMon = doiTuong(bangThiDua[maNV]);
    const mon = {};
    for (const item of cacMon) {
      const ten = chuoi(item.tenNganhHang) || chuoi(item.tenNganhHangGoc);
      const tenGoc = chuoi(item.tenNganhHangGoc) || ten;
      const nguoiDuocGiao = Array.isArray(chiaTarget[tenGoc]) ? chiaTarget[tenGoc].map(String) : [];
      if (nguoiDuocGiao.length && !nguoiDuocGiao.includes(maNV)) continue;
      const soNguoi = Math.max(1, nguoiDuocGiao.length);
      const targetCaNhan = so(item.target) / soNguoi;
      const thucHien = so(soBanTheoMon[tenGoc] ?? soBanTheoMon[ten]);
      mon[ten] = targetCaNhan > 0 ? thucHien / targetCaNhan * 100 : 0;
    }
    const phanTramThiDuaSK = doiTuong(skBoSung.phanTramThiDuaCaNhan);
    for (const [tenMon, ptVal] of Object.entries(phanTramThiDuaSK)) {
      if (mon[tenMon] === undefined || mon[tenMon] === 0) {
        mon[tenMon] = so(ptVal);
      }
    }
    const cacTyLe = Object.values(mon);
    const soMonDat = cacTyLe.filter(v => v >= 100).length;
    const tbThiDua = cacTyLe.length ? cacTyLe.reduce((a, b) => a + Math.min(100, Math.max(0, b)), 0) / cacTyLe.length : 0;
    const dt = so(skBoSung.doanhThuQDSucKhoe) || so(nv.doanhThuQD);
    const tiTrong = so(skBoSung.phanTramQuyDoi) || (tongDT > 0 ? Math.max(0, dt) / tongDT * 100 : 0);
    const diemDoanhThu = Math.min(100, Math.max(0, so(skBoSung.phanTramTarget) || so(nv.phanTramHT) || tiTrong * 4));
    const diem = cacTyLe.length ? 0.65 * tbThiDua + 0.35 * diemDoanhThu : diemDoanhThu;
    const muc = diem >= 70 ? "KHỎE" : diem >= 45 ? "TRUNG BÌNH" : "YẾU";
    return { maNV, hoTen: chuoi(nv.hoTen) || chuoi(nvQuanLy.hoTen) || `NV ${maNV}`, diem, muc, soMonDat, tongMon: cacTyLe.length, dt, tiTrong, nv, skBoSung, mon };
  }).sort((a, b) => b.diem - a.diem);
}

async function taoBaoCaoBot(env, loai, userId, sieuThiId, maNV = "") {
  const { ngay, duLieu } = await docDuLieuNgay(env, userId, sieuThiId);
  const sieuThi = await sbRest(env, "dmx_sieu_thi", {
    query: { select: "cai_dat", id: `eq.${sieuThiId}`, nguoi_dung_id: `eq.${userId}` },
    single: true,
  });
  const caiDat = doiTuong(sieuThi?.cai_dat);
  const ngayHienThi = hienThiNgay(ngay);
  const capNhatLuc = chuoi(duLieu.capNhatLuc, new Date().toISOString());
  const donVi = chuoi(duLieu.thongTinDonVi).trim() || "ĐIỆN MÁY XANH";

  if (["tongquan", "doanhthu", "realtime", "luyke", "luyke_du_kien", "bieu_do_realtime_thang"].includes(loai)) {
    const luyKe = doiTuong(duLieu.doanhThu);
    const realtime = doiTuong(duLieu.doanhThuRealtime);
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

    const noiDung = [
      `BÁO CÁO DOANH THU ${ngayHienThi}`,
      donVi,
      `• Lũy kế: DT ${dinhDangSo(dtLuyKe)}/${dinhDangSo(targetLuyKeThuc)} | QĐ ${dinhDangSo(qdLuyKe)}/${dinhDangSo(targetLuyKeQD)} | HT ${dinhDangPhanTram(phanTramLuyKe)}`,
      `• Dự kiến: ${dinhDangSo(duKienLuyKe)}/${dinhDangSo(targetDuKien)} | ${dinhDangPhanTram(phanTramDuKien)}`,
      `• Realtime: DT ${dinhDangSo(dtRealtime)}/${dinhDangSo(targetRealtimeThuc)} | QĐ ${dinhDangSo(qdRealtime)}/${dinhDangSo(targetRealtimeQD)} | HT ${dinhDangPhanTram(phanTramRealtime)}`,
      `• Khách/Bill: ${dinhDangSo(so(realtime.luotKhach), 0)}/${dinhDangSo(so(realtime.soBill), 0)}`,
      `Cập nhật: ${capNhatLuc}`,
    ].join("\n");

    const tieuDe = loai === "bieu_do_realtime_thang"
      ? "BIỂU ĐỒ REALTIME THÁNG"
      : ["realtime", "doanhthu_thidua_realtime"].includes(loai)
        ? "DOANH THU REALTIME"
        : ["luyke", "doanhthu_thidua_luyke", "luyke_du_kien"].includes(loai)
          ? "DOANH THU LŨY KẾ"
          : "TỔNG QUAN DOANH THU";

    return { loai, ngay, ngayHienThi, capNhatLuc, tieuDe, noiDung };
  }

  if (["suckhoe", "sk", "msnv", "bieu_do_suc_khoe_nv", "chi_tiet_nhan_vien"].includes(loai)) {
    const ds = thongKeSucKhoe(duLieu, caiDat);
    if (loai === "msnv" || loai === "sk") {
      const maTim = maNV.trim().toLowerCase();
      const item = ds.find(x => x.maNV.toLowerCase() === maTim || x.maNV.toLowerCase().endsWith(maTim));
      if (!maNV || !item) throw new Error(`Không tìm thấy nhân viên có mã ${maNV || "đã nhập"}.`);
      const nv = item.nv;
      const sk = item.skBoSung || {};
      const mon = Object.entries(item.mon).sort((a, b) => so(b[1]) - so(a[1]));
      const cacDong = [
        { ten: "Doanh thu quy đổi", giaTri: `${dinhDangSo(item.dt)} tr` },
        ...(so(sk.phanTramTarget) > 0 || so(sk.mucTieuTargetQD) > 0
          ? [{ ten: "% Target doanh thu", giaTri: dinhDangPhanTram(so(sk.phanTramTarget)) }]
          : []),
        ...(so(sk.phanTramTraCham) > 0 || so(sk.phanTramBanKem) > 0
          ? [{ ten: "Trả chậm / Bán kèm", giaTri: `${dinhDangPhanTram(so(sk.phanTramTraCham))} / ${dinhDangPhanTram(so(sk.phanTramBanKem))}` }]
          : [{ ten: "Số lượng đơn", giaTri: dinhDangSo(so(nv.soLuong)) }]),
        ...mon.map(([ten, pt]) => ({ ten, giaTri: dinhDangPhanTram(so(pt)) })),
      ];
      return {
        loai,
        ngay,
        ngayHienThi,
        capNhatLuc,
        tieuDe: `SỨC KHỎE ${item.hoTen.toUpperCase()} (${item.maNV})`,
        noiDung: [
          `SỨC KHỎE NHÂN VIÊN ${item.hoTen} (${item.maNV})`,
          `• Điểm: ${dinhDangPhanTram(item.diem)} • ${item.muc}`,
          `• Thi đua: ${item.soMonDat}/${item.tongMon} môn đạt`,
          `• DT QĐ: ${dinhDangSo(item.dt)} • Tỉ trọng ${dinhDangPhanTram(item.tiTrong)}`,
          ...cacDong.slice(1).map(x => `• ${x.ten}: ${x.giaTri}`),
          `Cập nhật: ${capNhatLuc}`,
        ].join("\n"),
      };
    }
    const khoe = ds.filter(x => x.muc === "KHỎE").length;
    const tb = ds.filter(x => x.muc === "TRUNG BÌNH").length;
    const yeu = ds.filter(x => x.muc === "YẾU").length;
    return {
      loai,
      ngay,
      ngayHienThi,
      capNhatLuc,
      tieuDe: "SỨC KHỎE ĐỘI NGŨ",
      noiDung: [
        `SỨC KHỎE ĐỘI NGŨ ${ngayHienThi}`,
        `• Khỏe ${khoe} • Trung bình ${tb} • Yếu ${yeu}`,
        ...ds.map((x, i) => `${i + 1}. ${x.maNV} - ${x.hoTen}: ${dinhDangPhanTram(x.diem)} • ${x.muc} • ${x.soMonDat}/${x.tongMon} môn • DT QĐ ${dinhDangSo(x.dt)}`),
        `Cập nhật: ${capNhatLuc}`,
      ].join("\n"),
    };
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
      tieuDe: `XẾP HẠNG NHÂN VIÊN ${laRealtime ? "REALTIME" : "LŨY KẾ"}`,
      noiDung: [
        `XẾP HẠNG NHÂN VIÊN ${laRealtime ? "REALTIME" : "LŨY KẾ"} ${ngayHienThi}`,
        `Tổng doanh thu quy đổi: ${dinhDangSo(tong)}`,
        ...cacDong.slice(0, 10).map((item, index) => `${index + 1}. ${item.ten}: ${item.giaTri} • ${item.chiTiet}`),
        `Cập nhật: ${capNhatLuc}`,
      ].join("\n"),
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

  return {
    loai,
    ngay,
    ngayHienThi,
    capNhatLuc,
    tieuDe: chiLuyKe ? "DOANH THU & THI ĐUA LŨY KẾ" : chiRealtime ? "DOANH THU & THI ĐUA REALTIME" : "BẢNG THI ĐUA NGÀNH HÀNG",
    noiDung: [
      `THI ĐUA NGÀNH HÀNG ${ngayHienThi}`,
      `Lũy kế đạt: ${daDatLuyKe}/${luyKe.length} • Realtime đạt: ${daDatRealtime}/${realtime.length}`,
      ...cacDong.map((item, index) => `${index + 1}. ${item.ten}: ${item.giaTri} • ${item.chiTiet}`),
      `Cập nhật: ${capNhatLuc}`,
    ].join("\n"),
  };
}

async function loadDmxReport(env, reportType, lineUserId = "", dmxUserId = "", maNV = "", storeId = "", lineGroupId = "") {
  try {
    const [maLoai, sieuThiTrongLoai = ""] = String(reportType || "tongquan").split("~", 2);
    const loai = docLoaiBaoCaoBot(maLoai);
    const userId = /^[0-9a-f-]{36}$/i.test(dmxUserId)
      ? dmxUserId
      : (lineUserId || lineGroupId)
        ? await layNguoiDungTheoLine(env, lineUserId, lineGroupId)
        : await layNguoiDungBot(env);
    const sieuThiId = await laySieuThiBaoCao(env, userId, storeId || sieuThiTrongLoai, lineGroupId);
    const baoCao = await taoBaoCaoBot(env, loai, userId, sieuThiId, maNV);
    const anhDaTao = await layAnhBaoCaoDaTaoSan(env, userId, loai, sieuThiId, baoCao.ngay, maNV);
    const urlAnhCuoi = anhDaTao?.url || "";
    const shortTitle = `${baoCao.tieuDe} ngày ${baoCao.ngayHienThi}`;
    const fullText = baoCao.noiDung || shortTitle;
    const reportDate = String(anhDaTao?.ngay || baoCao.ngay || "");
    const updatedAt = String(anhDaTao?.ngayCapNhat || baoCao.capNhatLuc || "");
    const finalReportType = anhDaTao?.loai || loai;

    return {
      text: (reportType === "msnv" || !urlAnhCuoi) ? fullText : shortTitle,
      fullText,
      imageUrl: isHttpsUrl(urlAnhCuoi) ? urlAnhCuoi : "",
      previewImageUrl: isHttpsUrl(urlAnhCuoi) ? urlAnhCuoi : "",
      reportType: finalReportType,
      cacheSupabase: anhDaTao?.nhaCungCap === "supabase",
      reportDate,
      updatedAt,
      imageVersion: [finalReportType, reportDate, updatedAt, updatedAt ? "" : urlAnhCuoi].join("|"),
    };
  } catch (error) {
    console.error("DMX report error", error);
    return { text: error instanceof Error ? error.message : "Không đọc được dữ liệu DMX từ Supabase. Vui lòng thử lại sau." };
  }
}

async function markCachedImageSent(_env, _report, _lineUserId) {
  // Giữ lại ảnh mới nhất trên Supabase để lần tra cứu/lịch sau sử dụng ngay.
}

async function bindGroup(env, groupId, ma, tenNhom) {
  try {
    const maSach = String(ma || "").replace(/\D/g, "");
    if (maSach.length !== 6 || !/^C[0-9a-f]{20,64}$/i.test(groupId)) {
      return { text: "Mã gắn nhóm hoặc mã nhóm LINE không hợp lệ." };
    }
    const maHash = await sha256Hex(maSach);
    const maGan = await sbRest(env, "dmx_line_ma_gan_nhom", {
      query: {
        select: "nguoi_dung_id",
        ma_hash: `eq.${maHash}`,
        het_han: `gt.${new Date().toISOString()}`,
      },
      single: true,
    });
    if (!maGan?.nguoi_dung_id) {
      return { text: "Mã gắn nhóm không đúng hoặc đã hết hạn." };
    }
    await sbRest(env, "dmx_line_nhom", {
      method: "POST",
      query: { on_conflict: "line_group_id,nguoi_dung_id" },
      prefer: "resolution=merge-duplicates",
      body: {
        line_group_id: groupId,
        nguoi_dung_id: maGan.nguoi_dung_id,
        ten_nhom: String(tenNhom || "Nhóm LINE").slice(0, 120),
        dang_hoat_dong: true,
        ngay_cap_nhat: new Date().toISOString(),
      },
    });
    await sbRest(env, "dmx_line_ma_gan_nhom", {
      method: "DELETE",
      query: { ma_hash: `eq.${maHash}` },
    });
    return { text: `Đã gắn “${tenNhom}” với tài khoản DMX. Lịch gửi sẽ được quản lý trong app DMX.` };
  } catch (error) {
    console.error("Bind group error", error);
    return { text: "Không kết nối được Supabase khi gắn nhóm. Vui lòng thử lại." };
  }
}

async function getGroupName(accessToken, groupId, fallbackName = "Nhóm LINE") {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return response.ok && data.groupName ? String(data.groupName) : (fallbackName || "Nhóm LINE");
  } catch { return fallbackName || "Nhóm LINE"; }
}

async function handleAccountCommand(env, command, lineUserId) {
  if (!lineUserId) return { text: "LINE chưa cung cấp mã người gửi. Hãy kết bạn với bot rồi thử lại trong chat riêng." };
  const hanhDong = command === "/lienket" ? "tao_ma" : command === "/taikhoan" ? "trang_thai" : "huy";
  try {
    if (hanhDong === "tao_ma") {
      const ma = randomSixDigits();
      const maHash = await sha256Hex(ma);
      const hetHan = new Date(Date.now() + THOI_HAN_MA_PHUT * 60_000).toISOString();
      await sbRest(env, "dmx_line_ma_lien_ket", {
        method: "DELETE",
        query: { line_user_id: `eq.${lineUserId}` },
      });
      await sbRest(env, "dmx_line_ma_lien_ket", {
        method: "POST",
        body: {
          ma_hash: maHash,
          line_user_id: lineUserId,
          het_han: hetHan,
        },
      });
      return {
        text: [
          "MÃ LIÊN KẾT DMX",
          ma,
          `Mã có hiệu lực ${THOI_HAN_MA_PHUT} phút.`,
          "Mở ứng dụng DMX → Quản trị/Cài đặt → Kết nối LINE, rồi nhập mã trên.",
          "Không gửi mã này cho người khác.",
        ].join("\n"),
      };
    }

    if (hanhDong === "trang_thai") {
      const lk = await sbRest(env, "dmx_line_lien_ket", {
        query: { select: "nguoi_dung_id", line_user_id: `eq.${lineUserId}` },
        single: true,
      });
      if (!lk?.nguoi_dung_id) {
        return { text: "LINE chưa kết nối tài khoản DMX. Gõ lienket để bắt đầu." };
      }
      const hoSo = await sbRest(env, "dmx_ho_so", {
        query: { select: "ten_dang_nhap", nguoi_dung_id: `eq.${lk.nguoi_dung_id}` },
        single: true,
      });
      return { text: `LINE đang kết nối với tài khoản DMX: ${hoSo?.ten_dang_nhap || "đã xác nhận"}.` };
    }

    await Promise.all([
      sbRest(env, "dmx_line_lien_ket", { method: "DELETE", query: { line_user_id: `eq.${lineUserId}` } }),
      sbRest(env, "dmx_line_ma_lien_ket", { method: "DELETE", query: { line_user_id: `eq.${lineUserId}` } }),
    ]);
    return { text: "Đã ngắt kết nối tài khoản DMX khỏi LINE." };
  } catch (error) {
    console.error("DMX link error", error);
    return { text: "Không kết nối được dịch vụ tài khoản DMX trên Supabase. Vui lòng thử lại sau." };
  }
}

async function donAnhSupabaseDaGui(env) {
  try {
    const data = await sbRest(env, "dmx_line_anh_bao_cao", {
      query: {
        select: "nguoi_dung_id,sieu_thi_id,loai,duong_dan_luu_tru",
        nha_cung_cap: "eq.supabase",
        xoa_sau: `lte.${new Date().toISOString()}`,
        limit: "100",
      },
    });
    if (!Array.isArray(data) || !data.length) return;
    const duongDan = data.map(item => String(item.duong_dan_luu_tru || "")).filter(Boolean);
    if (duongDan.length) await sbStorageRemove(env, duongDan);
    for (const item of data) {
      await sbRest(env, "dmx_line_anh_bao_cao", {
        method: "DELETE",
        query: {
          nguoi_dung_id: `eq.${item.nguoi_dung_id}`,
          sieu_thi_id: `eq.${item.sieu_thi_id}`,
          loai: `eq.${item.loai}`,
          nha_cung_cap: "eq.supabase",
        },
      });
    }
  } catch (error) {
    console.error("Clean expired images error", error);
  }
}

async function layDanhSachLichDenHan(env) {
  await donAnhSupabaseDaGui(env);
  const { thu, gio, ngay } = layGioVietNam();
  const data = await sbRest(env, "dmx_line_lich_gui", {
    query: {
      select: "id,line_group_id,nguoi_dung_id,sieu_thi_id,gio,cac_thu,cac_noi_dung,kieu_gui,lan_gui_cuoi,dmx_line_nhom!inner(dang_hoat_dong,ten_nhom)",
      dang_hoat_dong: "eq.true",
      "dmx_line_nhom.dang_hoat_dong": "eq.true",
      cac_thu: `cs.{${thu}}`,
    },
  });
  const phutHienTai = soPhut(gio);
  return (data || []).filter(item => {
    if (soPhut(String(item.gio || "00:00")) > phutHienTai) return false;
    return !item.lan_gui_cuoi || ngayVietNam(String(item.lan_gui_cuoi)) !== ngay;
  });
}

async function sendScheduledReport(env) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return;
  lineMonthlyQuotaReached = false;
  try {
    const danhSachLich = await layDanhSachLichDenHan(env);
    for (const lich of danhSachLich) {
      if (lineMonthlyQuotaReached) break;
      if (!await scheduleStillActive(env, lich.id)) continue;
      let thanhCong = true;
      for (const loai of (lich.cac_noi_dung || ["doanhthu"])) {
        if (!await scheduleStillActive(env, lich.id)) {
          thanhCong = false;
          break;
        }
        const report = await loadDmxReport(env, loai, "", lich.nguoi_dung_id, "", lich.sieu_thi_id || "");
        const reportCanGui = lich.kieu_gui === "text"
          ? { ...report, text: report.fullText || report.text, imageUrl: "", previewImageUrl: "" }
          : report;
        if (!await scheduleStillActive(env, lich.id)) {
          thanhCong = false;
          break;
        }
        if (lich.kieu_gui !== "text" && reportCanGui.imageUrl) {
          const canGui = await canSendLatestImage(env, lich, reportCanGui);
          if (canGui === null) {
            thanhCong = false;
            break;
          }
          if (!canGui) continue;
        }
        if (!await pushReport(env.LINE_CHANNEL_ACCESS_TOKEN, lich.line_group_id, reportCanGui)) {
          thanhCong = false;
          if (lineMonthlyQuotaReached) break;
        } else if (lich.kieu_gui !== "text" && reportCanGui.imageUrl
          && !await markLatestImageSent(env, lich, reportCanGui)) {
          thanhCong = false;
        }
      }
      if (thanhCong) {
        await sbRest(env, "dmx_line_lich_gui", {
          method: "PATCH",
          query: { id: `eq.${lich.id}` },
          body: { lan_gui_cuoi: new Date().toISOString() },
        });
      }
    }
  } catch (error) {
    console.error("Scheduled report error", error);
  }
}

async function canSendLatestImage(env, lich, report) {
  if (!report?.imageVersion) return true;
  try {
    const loai = String(report.reportType || "").split("~", 1)[0].trim().toLowerCase();
    if (!CAC_LOAI_LICH.includes(loai)) return true;
    const data = await sbRest(env, "dmx_line_anh_da_gui", {
      query: {
        select: "phien_ban_anh,ngay_gui",
        line_group_id: `eq.${lich.line_group_id}`,
        nguoi_dung_id: `eq.${lich.nguoi_dung_id}`,
        sieu_thi_id: `eq.${lich.sieu_thi_id}`,
        loai: `eq.${loai}`,
      },
      single: true,
    });
    const ngayHienTai = layGioVietNam().ngay;
    const daGuiHomNay = Boolean(data?.ngay_gui) && ngayVietNam(String(data.ngay_gui)) === ngayHienTai;
    const trungAnhDaGuiHomNay = daGuiHomNay && data?.phien_ban_anh === report.imageVersion;
    return !trungAnhDaGuiHomNay;
  } catch (error) {
    console.error("Latest image validation error", error);
    return null;
  }
}

async function markLatestImageSent(env, lich, report) {
  if (!report?.imageVersion) return true;
  try {
    const loai = String(report.reportType || "").split("~", 1)[0].trim().toLowerCase();
    await sbRest(env, "dmx_line_anh_da_gui", {
      method: "POST",
      query: { on_conflict: "line_group_id,nguoi_dung_id,sieu_thi_id,loai" },
      prefer: "resolution=merge-duplicates",
      body: {
        line_group_id: lich.line_group_id,
        nguoi_dung_id: lich.nguoi_dung_id,
        sieu_thi_id: lich.sieu_thi_id,
        loai,
        phien_ban_anh: String(report.imageVersion).slice(0, 1000),
        ngay_gui: new Date().toISOString(),
      },
    });
    return true;
  } catch (error) {
    console.error("Mark latest image error", error);
    return false;
  }
}

async function recordGroupResponse(env, groupId, lineUserId) {
  try {
    if (!groupId || !lineUserId) return;
    const data = await sbRest(env, "dmx_line_tin_nhac", {
      query: {
        select: "id,user_ids_duoc_tag,user_ids_da_phan_hoi",
        line_group_id: `eq.${groupId}`,
        da_nhac: "eq.false",
        user_ids_duoc_tag: `cs.{${lineUserId}}`,
        limit: "50",
      },
    });
    for (const item of data || []) {
      const daPhanHoi = Array.from(new Set([...(item.user_ids_da_phan_hoi || []), lineUserId]));
      const hoanTat = (item.user_ids_duoc_tag || []).every(id => daPhanHoi.includes(id));
      await sbRest(env, "dmx_line_tin_nhac", {
        method: "PATCH",
        query: { id: `eq.${item.id}` },
        body: {
          user_ids_da_phan_hoi: daPhanHoi,
          da_nhac: hoanTat,
          ngay_cap_nhat: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Record group response error", error);
  }
}

async function trackMentionedUsers(env, event, groupId, senderId) {
  const mentionees = Array.isArray(event.message?.mention?.mentionees) ? event.message.mention.mentionees : [];
  const userIds = [...new Set(mentionees
    .filter(item => item?.type === "user" && !item?.isSelf && /^U[0-9a-f]{20,64}$/i.test(String(item?.userId || "")))
    .map(item => String(item.userId))
    .filter(id => id !== senderId))].slice(0, 20);
  if (!userIds.length) return;

  try {
    const cauHinh = await sbRest(env, "dmx_line_cau_hinh_nhac", {
      query: {
        select: "bat_nhac_phan_hoi,so_phut_cho",
        line_group_id: `eq.${groupId}`,
      },
      single: true,
    });
    if (!cauHinh?.bat_nhac_phan_hoi) return;

    const [tenNguoiGui, ...tenDuocTag] = await Promise.all([
      getGroupMemberName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId, senderId),
      ...userIds.map(id => getGroupMemberName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId, id)),
    ]);

    const soPhutCho = Math.max(1, Number(cauHinh.so_phut_cho || 30));
    const nowMs = Date.now();
    const tenDuocTagMap = Object.fromEntries(userIds.map((uid, idx) => [uid, tenDuocTag[idx] || "Người dùng"]));

    await sbRest(env, "dmx_line_tin_nhac", {
      method: "POST",
      query: { on_conflict: "line_message_id" },
      prefer: "resolution=merge-duplicates",
      body: {
        line_group_id: groupId,
        line_message_id: String(event.message.id || ""),
        quote_token: JSON.stringify({
          q: event.message.quoteToken || "",
          text: event.message.text || "",
          soPhutCho,
        }),
        nguoi_gui_id: senderId,
        ten_nguoi_gui: String(tenNguoiGui || "Người gửi").slice(0, 120),
        user_ids_duoc_tag: userIds,
        ten_duoc_tag: tenDuocTagMap,
        user_ids_da_phan_hoi: [],
        noi_dung_goc: String(event.message.text || "").slice(0, 2000),
        ngay_tao: new Date(nowMs).toISOString(),
        het_han: new Date(nowMs + soPhutCho * 60_000).toISOString(),
        da_nhac: false,
        ngay_cap_nhat: new Date(nowMs).toISOString(),
      },
    });
  } catch (error) {
    console.error("Track mentioned users error", error);
  }
}

async function getGroupMemberName(accessToken, groupId, userId) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/member/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data.displayName ? String(data.displayName) : "Người dùng";
  } catch {
    return "Người dùng";
  }
}

async function layDanhSachNhacDenHan(env) {
  const data = await sbRest(env, "dmx_line_tin_nhac", {
    query: {
      select: "id,line_group_id,quote_token,nguoi_gui_id,ten_nguoi_gui,user_ids_duoc_tag,ten_duoc_tag,user_ids_da_phan_hoi,noi_dung_goc,ngay_tao,het_han",
      da_nhac: "eq.false",
      het_han: `lte.${new Date().toISOString()}`,
      order: "het_han.asc",
      limit: "50",
    },
  });
  if (!Array.isArray(data) || !data.length) return [];

  const groupIds = Array.from(new Set(data.map(item => String(item.line_group_id || "")).filter(Boolean)));
  const inGroups = `in.(${groupIds.join(",")})`;
  const [dsCauHinh, dsNhom] = groupIds.length
    ? await Promise.all([
        sbRest(env, "dmx_line_cau_hinh_nhac", {
          query: { select: "line_group_id,so_phut_cho", line_group_id: inGroups },
        }),
        sbRest(env, "dmx_line_nhom", {
          query: { select: "line_group_id,nguoi_dung_id,ten_nhom,dang_hoat_dong", line_group_id: inGroups, dang_hoat_dong: "eq.true" },
        }),
      ])
    : [[], []];

  const nguoiDungIds = Array.from(new Set((dsNhom || []).map(item => String(item.nguoi_dung_id || "")).filter(Boolean)));
  const dsLienKet = nguoiDungIds.length
    ? await sbRest(env, "dmx_line_lien_ket", {
        query: { select: "nguoi_dung_id,line_user_id", nguoi_dung_id: `in.(${nguoiDungIds.join(",")})` },
      })
    : [];

  const soPhutTheoNhom = new Map((dsCauHinh || []).map(item => [String(item.line_group_id), Number(item.so_phut_cho || 30)]));
  const tenNhomTheoId = new Map();
  const lineUsersTheoNhom = new Map();
  const lineUserTheoNguoiDung = new Map();

  for (const lk of dsLienKet || []) {
    const uid = String(lk.nguoi_dung_id || "");
    const lid = String(lk.line_user_id || "").trim();
    if (uid && /^U[0-9a-f]{20,64}$/i.test(lid)) {
      lineUserTheoNguoiDung.set(uid, [...(lineUserTheoNguoiDung.get(uid) || []), lid]);
    }
  }
  for (const nhom of dsNhom || []) {
    const gid = String(nhom.line_group_id || "");
    const ten = String(nhom.ten_nhom || "").trim();
    if (gid && ten && !tenNhomTheoId.has(gid)) tenNhomTheoId.set(gid, ten);
    const lids = lineUserTheoNguoiDung.get(String(nhom.nguoi_dung_id || "")) || [];
    if (gid && lids.length) {
      lineUsersTheoNhom.set(gid, Array.from(new Set([...(lineUsersTheoNhom.get(gid) || []), ...lids])));
    }
  }

  const idsDaDu = data
    .filter(item => (item.user_ids_duoc_tag || []).every(id => (item.user_ids_da_phan_hoi || []).includes(id)))
    .map(item => item.id);
  for (const idDu of idsDaDu) {
    await sbRest(env, "dmx_line_tin_nhac", {
      method: "PATCH",
      query: { id: `eq.${idDu}` },
      body: { da_nhac: true, ngay_cap_nhat: new Date().toISOString() },
    });
  }

  return data.map(item => {
    const soPhutTuHan = item.het_han && item.ngay_tao
      ? Math.max(1, Math.round((new Date(String(item.het_han)).getTime() - new Date(String(item.ngay_tao)).getTime()) / 60_000))
      : 0;
    const soPhutCho = soPhutTuHan || soPhutTheoNhom.get(item.line_group_id) || 30;
    const lineUserIdsNhanRieng = Array.from(new Set([
      ...(/^U[0-9a-f]{20,64}$/i.test(String(item.nguoi_gui_id || "")) ? [String(item.nguoi_gui_id)] : []),
      ...(lineUsersTheoNhom.get(item.line_group_id) || []),
    ]));
    return {
      ...item,
      so_phut_cho: soPhutCho,
      ten_nhom: tenNhomTheoId.get(item.line_group_id) || "Nhóm LINE",
      line_user_ids_nhan_rieng: lineUserIdsNhanRieng,
      user_ids_chua_phan_hoi: (item.user_ids_duoc_tag || []).filter(id => !(item.user_ids_da_phan_hoi || []).includes(id)),
    };
  }).filter(item => item.user_ids_chua_phan_hoi.length > 0);
}

async function sendDueMentionReminders(env) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return;
  try {
    const danhSachNhac = await layDanhSachNhacDenHan(env);
    for (const item of danhSachNhac) {
      const sent = await pushMentionReminder(env.LINE_CHANNEL_ACCESS_TOKEN, item);
      if (sent) {
        await sbRest(env, "dmx_line_tin_nhac", {
          method: "PATCH",
          query: { id: `eq.${item.id}` },
          body: { da_nhac: true, ngay_cap_nhat: new Date().toISOString() },
        });
      }
    }
  } catch (error) {
    console.error("Mention reminder error", error);
  }
}

async function pushMentionReminder(accessToken, item) {
  const missing = (item.user_ids_chua_phan_hoi || []).slice(0, 20);
  if (!missing.length) return true;

  const recipients = [...new Set([
    item.nguoi_gui_id,
    ...(Array.isArray(item.line_user_ids_nhan_rieng) ? item.line_user_ids_nhan_rieng : []),
  ].map(id => String(id || "").trim()).filter(id => /^U[0-9a-f]{20,64}$/i.test(id)))];
  if (!recipients.length) return false;

  let metaQuote = {};
  if (typeof item.quote_token === "string" && item.quote_token.trim().startsWith("{")) {
    try {
      metaQuote = JSON.parse(item.quote_token);
    } catch { /* Bỏ qua nếu quote_token là chuỗi thông thường */ }
  }

  const tenDuocTagMap = (item.ten_duoc_tag && typeof item.ten_duoc_tag === "object") ? item.ten_duoc_tag : {};
  const [tenNhomRaw, ...tenChuaPhanHoi] = await Promise.all([
    getGroupName(accessToken, item.line_group_id, String(item.ten_nhom || "").trim() || "Nhóm LINE"),
    ...missing.map(async userId => {
      const tenDaLuu = String(tenDuocTagMap[userId] || "").trim();
      const ten = tenDaLuu || await getGroupMemberName(accessToken, item.line_group_id, userId);
      return ten.startsWith("@") ? ten : `@${ten}`;
    }),
  ]);

  const soPhutTuHan = item.het_han && item.ngay_tao
    ? Math.max(1, Math.round((new Date(item.het_han).getTime() - new Date(item.ngay_tao).getTime()) / 60000))
    : 0;
  const soPhut = Math.max(1, Number(item.so_phut_cho || metaQuote.soPhutCho || soPhutTuHan || 30));
  const noiDungGoc = String(item.noi_dung_goc || metaQuote.text || "").trim();
  const nhanNhom = tenNhomRaw.startsWith("@") ? tenNhomRaw : `@${tenNhomRaw}`;

  const message = {
    type: "text",
    text: `Sau ${soPhut} phút các bạn không phản hồi tin nhắn: "${noiDungGoc}" trong nhóm ${nhanNhom} là: ${tenChuaPhanHoi.join(", ")}`.slice(0, 5000),
  };

  let sentAny = false;
  for (const userId of recipients) {
    const response = await fetch(LINE_PUSH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Line-Retry-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ to: userId, messages: [message] }),
    });
    if (response.ok) {
      sentAny = true;
    } else {
      console.error("LINE private mention reminder failed", userId, response.status, await response.text());
    }
  }
  return sentAny;
}

function commandMenuReport() {
  const commands = [
    ["Doanh thu", "doanhthu"],
    ["Realtime", "realtime"],
    ["Lũy kế", "luyke"],
    ["NV Lũy kế", "nhanvien"],
    ["NV Realtime", "nvrealtime"],
    ["Thi đua", "thidua"],
    ["Sức khỏe ĐN", "suckhoe"],
    ["Biểu đồ RT", "bieudo"],
    ["Tổng quan", "tongquan"],
    ["Tài khoản", "taikhoan"],
    ["Liên kết", "lienket"],
    ["Mã nhóm", "id"],
    ["Kiểm tra bot", "ping"],
  ];
  return {
    text: [
      "📋 DANH SÁCH LỆNH DMX BOT",
      "• Chọn nút gợi ý bên dưới hoặc gõ trực tiếp tên lệnh (không cần dấu /):",
      "• Ảnh sức khỏe 1 NV: sk MÃ_NV (VD: sk 116719)",
      "• Chi tiết chữ + ảnh 1 NV: msnv MÃ_NV (VD: msnv 116719)",
      "• Gắn nhóm LINE: gannhom MÃ_6_SỐ",
    ].join("\n"),
    quickReply: {
      items: commands.map(([label, text]) => ({
        type: "action",
        action: { type: "message", label, text },
      })),
    },
  };
}

async function scheduleStillActive(env, id) {
  if (!id || !/^[0-9a-f-]{36}$/i.test(String(id))) return false;
  try {
    const data = await sbRest(env, "dmx_line_lich_gui", {
      query: {
        select: "id,dmx_line_nhom!inner(dang_hoat_dong)",
        id: `eq.${id}`,
        dang_hoat_dong: "eq.true",
        "dmx_line_nhom.dang_hoat_dong": "eq.true",
      },
      single: true,
    });
    return Boolean(data?.id);
  } catch (error) {
    console.error("Schedule validation error", error);
    return false;
  }
}

function createMessages(report) {
  const messages = [];
  if (isHttpsUrl(report.imageUrl)) {
    messages.push({
      type: "image",
      originalContentUrl: report.imageUrl,
      previewImageUrl: isHttpsUrl(report.previewImageUrl) ? report.previewImageUrl : report.imageUrl,
    });
  }
  const tieuDe = String(report.text || "").trim();
  if (tieuDe) {
    const textMessage = { type: "text", text: tieuDe.slice(0, 5000) };
    if (report.quickReply) textMessage.quickReply = report.quickReply;
    messages.push(textMessage);
  }
  if (!messages.length) messages.push({ type: "text", text: "Báo cáo hiện chưa có nội dung." });
  return messages;
}

async function replyReport(accessToken, replyToken, report) {
  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages: createMessages(report) }),
  });
  if (!response.ok) {
    console.error("LINE reply failed", response.status, await response.text());
    return false;
  }
  return true;
}

async function pushReport(accessToken, to, report) {
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ to, messages: createMessages(report) }),
  });
  if (!response.ok) {
    const responseBody = await response.text();
    if (response.status === 429 && /monthly limit/i.test(responseBody)) {
      lineMonthlyQuotaReached = true;
      console.error("LINE monthly message quota reached; scheduled reports remain pending", responseBody);
    } else {
      console.error("LINE push failed", response.status, responseBody);
    }
    return false;
  }
  return true;
}

function isHttpsUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function verifyLineSignature(body, signature, secret) {
  if (!signature) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureBytes = Uint8Array.from(atob(signature), char => char.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(body));
  } catch {
    return false;
  }
}

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

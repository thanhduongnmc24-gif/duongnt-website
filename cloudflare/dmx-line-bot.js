const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "dmx-line-bot",
        lineConfigured: Boolean(env.LINE_CHANNEL_SECRET && env.LINE_CHANNEL_ACCESS_TOKEN),
        dataConfigured: Boolean(env.DMX_REPORT_API_URL && env.DMX_API_TOKEN),
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("DMX LINE Bot is running", { status: 200 });
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
  if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) return;

  const sourceType = event.source?.type || "";
  const groupId = event.source?.groupId || event.source?.roomId || "";
  const lineUserId = event.source?.userId || "";
  const rawCommand = event.message.text.trim();
  const normalizedRaw = rawCommand.replace(/^\/+/, "").trim();
  const command = normalizedRaw.toLowerCase();

  if ((sourceType === "group" || sourceType === "room") && groupId && lineUserId) {
    await recordGroupResponse(env, groupId, lineUserId);
    await trackMentionedUsers(env, event, groupId, lineUserId);
  }

  // gannhom (hoặc /gannhom) được xử lý ngay trong nhóm.
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
    report = { text: "DMX Bot đang hoạt động." };
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

  // Chỉ các lệnh quản lý liên kết tài khoản cá nhân mới gửi riêng để bảo mật mã 6 số.
  // Tất cả các lệnh báo cáo (doanhthu, realtime, luyke, nhanvien, thidua, suckhoe, sk xxxx, msnv xxxx,...)
  // đều trả kết quả trực tiếp ngay trong nhóm.
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

async function loadDmxReport(env, reportType, lineUserId = "", dmxUserId = "", maNV = "", storeId = "", lineGroupId = "") {
  if (!env.DMX_REPORT_API_URL || !env.DMX_API_TOKEN) {
    return { text: "Bot đã kết nối LINE nhưng chưa cấu hình nguồn dữ liệu DMX." };
  }

  try {
    const url = new URL(env.DMX_REPORT_API_URL);
    url.searchParams.set("loai", reportType);
    if (maNV) url.searchParams.set("maNV", maNV);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.DMX_API_TOKEN}`,
        ...(lineUserId ? { "X-Line-User-ID": lineUserId } : {}),
        ...(lineGroupId ? { "X-Line-Group-ID": lineGroupId } : {}),
        ...(dmxUserId ? { "X-DMX-User-ID": dmxUserId } : {}),
        ...(storeId ? { "X-DMX-Store-ID": storeId } : {}),
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { text: errorData.loi || `Dữ liệu DMX đang lỗi (${response.status}). Vui lòng thử lại.` };
    }

    const data = await response.json();
    const fullText = data.fullText || data.noiDung || data.text || "Báo cáo không có nội dung.";
    return {
      // Lệnh sk xxxx chỉ trả về file ảnh sức khỏe nhân viên kèm tiêu đề ngắn gọn;
      // lệnh msnv xxxx trả về cả ảnh kèm toàn bộ số liệu dạng chữ.
      text: reportType === "msnv" ? fullText : (data.text || data.noiDung || data.message || "Báo cáo không có nội dung."),
      fullText,
      imageUrl: isHttpsUrl(data.imageUrl) ? data.imageUrl : "",
      previewImageUrl: isHttpsUrl(data.previewImageUrl) ? data.previewImageUrl : data.imageUrl,
      reportType: data.reportType || reportType,
      cacheSupabase: data.cachedSupabase === true,
      reportDate: String(data.date || ""),
      updatedAt: String(data.updatedAt || ""),
      imageVersion: [data.reportType || reportType, data.date || "", data.updatedAt || "", data.updatedAt ? "" : data.imageUrl || ""].join("|"),
    };
  } catch (error) {
    console.error("DMX report error", error);
    return { text: "Không đọc được dữ liệu DMX. Vui lòng thử lại sau." };
  }
}

async function markCachedImageSent(env, report, lineUserId) {
  if (!report?.cacheSupabase || !report?.reportType || !lineUserId || !groupApiUrl(env)) return;
  try {
    await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "anh_da_gui", lineUserId, loai: report.reportType }),
    });
  } catch (error) {
    console.error("Mark cached image sent error", error);
  }
}

function linkApiUrl(env) {
  const explicit = String(env.DMX_LINK_API_URL || "").trim();
  if (explicit) return explicit;
  const reportUrl = String(env.DMX_REPORT_API_URL || "").trim();
  if (reportUrl) {
    try {
      const url = new URL(reportUrl);
      url.pathname = url.pathname.replace(/\/bao-cao\/?$/, "/lien-ket");
      return url.toString();
    } catch { /* Dùng URL cố định an toàn bên dưới. */ }
  }
  return "https://www.duongnt.io.vn/api/dmx/bot/lien-ket";
}

function groupApiUrl(env) {
  if (env.DMX_GROUP_API_URL) return env.DMX_GROUP_API_URL;
  return String(env.DMX_REPORT_API_URL || "").replace(/\/bao-cao\/?$/, "/nhom");
}

async function bindGroup(env, groupId, ma, tenNhom) {
  try {
    const response = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "gan_nhom", lineGroupId: groupId, ma, tenNhom }),
    });
    const data = await response.json().catch(() => ({}));
    return { text: response.ok ? `Đã gắn “${tenNhom}” với tài khoản DMX. Lịch gửi sẽ được quản lý trong app DMX.` : (data.loi || "Chưa gắn được nhóm.") };
  } catch (error) {
    console.error("Bind group error", error);
    return { text: "Không kết nối được dịch vụ gắn nhóm. Vui lòng thử lại." };
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
  if (!env.DMX_API_TOKEN) {
    return { text: "Bot chưa được cấu hình dịch vụ liên kết tài khoản DMX." };
  }

  const hanhDong = command === "/lienket" ? "tao_ma" : command === "/taikhoan" ? "trang_thai" : "huy";
  try {
    const response = await fetch(linkApiUrl(env), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.DMX_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hanhDong, lineUserId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { text: data.loi || "Chưa xử lý được tài khoản LINE." };

    if (hanhDong === "tao_ma") {
      return {
        text: [
          "MÃ LIÊN KẾT DMX",
          String(data.ma || ""),
          `Mã có hiệu lực ${data.soPhut || 10} phút.`,
          "Mở ứng dụng DMX → Quản trị/Cài đặt → Kết nối LINE, rồi nhập mã trên.",
          "Không gửi mã này cho người khác.",
        ].join("\n"),
      };
    }
    if (hanhDong === "trang_thai") {
      return data.daLienKet
        ? { text: `LINE đang kết nối với tài khoản DMX: ${data.tenDangNhap || "đã xác nhận"}.` }
        : { text: "LINE chưa kết nối tài khoản DMX. Gõ lienket để bắt đầu." };
    }
    return { text: "Đã ngắt kết nối tài khoản DMX khỏi LINE." };
  } catch (error) {
    console.error("DMX link error", error);
    return { text: "Không kết nối được dịch vụ tài khoản DMX. Vui lòng thử lại sau." };
  }
}

async function sendScheduledReport(env) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.DMX_API_TOKEN || !groupApiUrl(env)) return;
  try {
    const response = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "lich_den_han" }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.loi || `HTTP ${response.status}`);
    for (const lich of (data.lich || [])) {
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
          if (!canGui) continue;
        }
        if (!await pushReport(env.LINE_CHANNEL_ACCESS_TOKEN, lich.line_group_id, reportCanGui)) {
          thanhCong = false;
        } else if (lich.kieu_gui !== "text" && reportCanGui.imageUrl) {
          await markLatestImageSent(env, lich, reportCanGui);
        }
      }
      if (thanhCong) {
        await fetch(groupApiUrl(env), {
          method: "POST",
          headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "da_gui", id: lich.id }),
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
    const response = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        hanhDong: "kiem_tra_anh_moi", lineGroupId: lich.line_group_id,
        nguoiDungId: lich.nguoi_dung_id, sieuThiId: lich.sieu_thi_id,
        loai: report.reportType, phienBanAnh: report.imageVersion,
      }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok && data.canGui === true;
  } catch (error) {
    console.error("Latest image validation error", error);
    return false;
  }
}

async function markLatestImageSent(env, lich, report) {
  if (!report?.imageVersion) return;
  try {
    await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        hanhDong: "danh_dau_anh_da_gui", lineGroupId: lich.line_group_id,
        nguoiDungId: lich.nguoi_dung_id, sieuThiId: lich.sieu_thi_id,
        loai: report.reportType, phienBanAnh: report.imageVersion,
      }),
    });
  } catch (error) {
    console.error("Mark latest image error", error);
  }
}

async function recordGroupResponse(env, groupId, lineUserId) {
  if (!groupApiUrl(env)) return;
  try {
    await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "ghi_nhan_phan_hoi", lineGroupId: groupId, lineUserId }),
    });
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
  if (!userIds.length || !groupApiUrl(env)) return;
  const [tenNguoiGui, ...tenDuocTag] = await Promise.all([
    getGroupMemberName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId, senderId),
    ...userIds.map(id => getGroupMemberName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId, id)),
  ]);
  const basePayload = {
    hanhDong: "tao_theo_doi_tag",
    lineGroupId: groupId,
    lineMessageId: event.message.id,
    nguoiGuiId: senderId,
    tenNguoiGui,
    noiDungGoc: event.message.text,
    nguoiDuocTag: userIds.map((userId, index) => ({ userId, ten: tenDuocTag[index] || "Người dùng" })),
  };
  try {
    const res = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...basePayload,
        quoteToken: JSON.stringify({ q: event.message.quoteToken || "", text: event.message.text || "" }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.daTheoDoi && data?.soPhutCho) {
      await fetch(groupApiUrl(env), {
        method: "POST",
        headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          quoteToken: JSON.stringify({
            q: event.message.quoteToken || "",
            text: event.message.text || "",
            soPhutCho: Number(data.soPhutCho) || 30,
          }),
        }),
      });
    }
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

async function sendDueMentionReminders(env) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN || !env.DMX_API_TOKEN || !groupApiUrl(env)) return;
  try {
    const response = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "nhac_den_han" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.loi || `HTTP ${response.status}`);
    for (const item of data.nhac || []) {
      const sent = await pushMentionReminder(env.LINE_CHANNEL_ACCESS_TOKEN, item);
      if (sent) {
        await fetch(groupApiUrl(env), {
          method: "POST",
          headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "da_nhac_tag", id: item.id }),
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
  if (!id) return false;
  try {
    const response = await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hanhDong: "kiem_tra_lich", id }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.conHieuLuc === true;
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
    console.error("LINE push failed", response.status, await response.text());
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

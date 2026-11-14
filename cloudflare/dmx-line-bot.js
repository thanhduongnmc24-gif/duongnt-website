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
  const groupId = event.source?.groupId || "";
  const lineUserId = event.source?.userId || "";
  const rawCommand = event.message.text.trim();
  const command = rawCommand.toLowerCase();

  if ((sourceType === "group" || sourceType === "room") && groupId && lineUserId) {
    await recordGroupResponse(env, groupId, lineUserId);
    await trackMentionedUsers(env, event, groupId, lineUserId);
  }

  // /gannhom được xử lý ngay trong nhóm. Các lệnh báo cáo tiếp tục đi xuống
  // và kết quả riêng tư sẽ được push cho đúng người gửi lệnh.
  if (sourceType === "group" || sourceType === "room") {
    const match = /^\/gannhom\s+(\d{6})$/i.exec(rawCommand);
    if (match && groupId) {
      const tenNhom = await getGroupName(env.LINE_CHANNEL_ACCESS_TOKEN, groupId);
      const report = await bindGroup(env, groupId, match[1], tenNhom);
      await replyReport(env.LINE_CHANNEL_ACCESS_TOKEN, event.replyToken, report);
      return;
    }
  }
  let report = null;

  if (command === "/" || command === "/help") {
    report = commandMenuReport();
  } else if (command === "/ping") {
    report = { text: "DMX Bot đang hoạt động." };
  } else if (command === "/id" || command === "/groupid") {
    report = {
      text: groupId ? `LINE_GROUP_ID: ${groupId}` : `LINE_USER_ID: ${lineUserId || "Không đọc được"}`,
    };
  } else if (["/lienket", "/taikhoan", "/huyketnoi"].includes(command)) {
    report = await handleAccountCommand(env, command, lineUserId);
  } else if (/^\/msnv\s+\S+$/i.test(rawCommand)) {
    const maNV = rawCommand.split(/\s+/)[1] || "";
    report = await loadDmxReport(env, "msnv", lineUserId, "", maNV);
  } else if (["/tongquan", "/doanhthu", "/realtime", "/luyke", "/nhanvien", "/thidua", "/suckhoe"].includes(command)) {
    report = await loadDmxReport(env, command.slice(1), lineUserId);
  } else {
    return;
  }

  const laLenhRieng = [
    "/lienket", "/taikhoan", "/huyketnoi",
    "/tongquan", "/doanhthu", "/realtime", "/luyke", "/nhanvien", "/thidua", "/suckhoe",
  ].includes(command) || command.startsWith("/msnv ");
  const baoCaoGoc = report;
  if (groupId && lineUserId && laLenhRieng) {
    const daGuiRieng = await pushReport(env.LINE_CHANNEL_ACCESS_TOKEN, lineUserId, report);
    if (daGuiRieng) await markCachedImageSent(env, baoCaoGoc, lineUserId);
    report = daGuiRieng
      ? { text: "Bot đã gửi kết quả riêng cho bạn để bảo vệ dữ liệu tài khoản." }
      : { text: "Chưa gửi riêng được. Hãy kết bạn với bot, mở chat riêng rồi gõ lại lệnh." };
  }
  const daPhanHoi = await replyReport(env.LINE_CHANNEL_ACCESS_TOKEN, event.replyToken, report);
  if (!groupId && daPhanHoi) await markCachedImageSent(env, baoCaoGoc, lineUserId);
}

async function loadDmxReport(env, reportType, lineUserId = "", dmxUserId = "", maNV = "", storeId = "") {
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
      // Chi tiết một nhân viên luôn kèm toàn bộ số liệu dạng chữ để người dùng
      // vẫn tra cứu được ngay cả khi LINE tải ảnh chậm hoặc lỗi.
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

async function getGroupName(accessToken, groupId) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    return response.ok && data.groupName ? String(data.groupName) : "Nhóm LINE";
  } catch { return "Nhóm LINE"; }
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
        : { text: "LINE chưa kết nối tài khoản DMX. Gõ /lienket để bắt đầu." };
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
        // Kiểm tra lần cuối sau khi lấy ảnh. Nếu người dùng vừa xóa lịch trong
        // lúc API chuẩn bị báo cáo thì tuyệt đối không push ảnh đã lấy trước đó.
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
  try {
    await fetch(groupApiUrl(env), {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DMX_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        hanhDong: "tao_theo_doi_tag", lineGroupId: groupId,
        lineMessageId: event.message.id, quoteToken: event.message.quoteToken || "",
        nguoiGuiId: senderId, tenNguoiGui, noiDungGoc: event.message.text,
        nguoiDuocTag: userIds.map((userId, index) => ({ userId, ten: tenDuocTag[index] || "Người dùng" })),
      }),
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
  const substitutions = {
    sender: { type: "mention", mentionee: { type: "user", userId: item.nguoi_gui_id } },
  };
  const placeholders = missing.map((userId, index) => {
    const key = `user${index}`;
    substitutions[key] = { type: "mention", mentionee: { type: "user", userId } };
    return `{${key}}`;
  });
  const message = {
    type: "textV2",
    text: `Những bạn sau đây chưa phản hồi lại tin nhắn của {sender}: ${placeholders.join(", ")}`,
    substitution: substitutions,
    ...(item.quote_token ? { quoteToken: item.quote_token } : {}),
  };
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Line-Retry-Key": crypto.randomUUID() },
    body: JSON.stringify({ to: item.line_group_id, messages: [message] }),
  });
  if (!response.ok) console.error("LINE mention reminder failed", response.status, await response.text());
  return response.ok;
}

function commandMenuReport() {
  const commands = [
    ["Doanh thu", "/doanhthu"], ["Realtime", "/realtime"], ["Lũy kế", "/luyke"],
    ["Nhân viên", "/nhanvien"], ["Thi đua", "/thidua"], ["Sức khỏe", "/suckhoe"],
    ["Tổng quan", "/tongquan"], ["Tài khoản", "/taikhoan"], ["Liên kết", "/lienket"],
    ["Mã nhóm", "/id"], ["Kiểm tra bot", "/ping"], ["Trợ giúp", "/help"],
  ];
  return {
    text: "Chọn lệnh DMX bên dưới. Tra cứu cá nhân: /msnv 123456",
    quickReply: { items: commands.map(([label, text]) => ({ type: "action", action: { type: "message", label, text } })) },
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

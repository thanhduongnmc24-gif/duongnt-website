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
    if (env.DAILY_REPORT_ENABLED !== "true" || !env.LINE_GROUP_ID) return;
    ctx.waitUntil(sendScheduledReport(env));
  },
};

async function handleLineEvent(event, env) {
  if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) return;

  const groupId = event.source?.groupId || "";
  if (env.LINE_GROUP_ID && groupId !== env.LINE_GROUP_ID) return;

  const command = event.message.text.trim().toLowerCase();
  let report = null;

  if (command === "/ping") {
    report = { text: "DMX Bot đang hoạt động." };
  } else if (command === "/id" || command === "/groupid") {
    report = {
      text: groupId ? `LINE_GROUP_ID: ${groupId}` : "Lệnh này cần được gửi trong nhóm LINE.",
    };
  } else if (command === "/help") {
    report = {
      text: [
        "LỆNH DMX BOT",
        "/ping - Kiểm tra bot",
        "/id - Lấy mã nhóm LINE",
        "/doanhthu - Báo cáo doanh thu",
        "/realtime - Số liệu realtime",
        "/luyke - Số liệu lũy kế",
        "/nhanvien - Xếp hạng nhân viên",
        "/thidua - Báo cáo thi đua",
      ].join("\n"),
    };
  } else if (["/doanhthu", "/realtime", "/luyke", "/nhanvien", "/thidua"].includes(command)) {
    report = await loadDmxReport(env, command.slice(1));
  } else {
    return;
  }

  await replyReport(env.LINE_CHANNEL_ACCESS_TOKEN, event.replyToken, report);
}

async function loadDmxReport(env, reportType) {
  if (!env.DMX_REPORT_API_URL || !env.DMX_API_TOKEN) {
    return { text: "Bot đã kết nối LINE nhưng chưa cấu hình nguồn dữ liệu DMX." };
  }

  try {
    const url = new URL(env.DMX_REPORT_API_URL);
    url.searchParams.set("loai", reportType);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.DMX_API_TOKEN}`,
      },
    });
    if (!response.ok) throw new Error(`DMX API returned ${response.status}`);

    const data = await response.json();
    return {
      text: data.text || data.noiDung || data.message || "Báo cáo không có nội dung.",
      imageUrl: isHttpsUrl(data.imageUrl) ? data.imageUrl : "",
      previewImageUrl: isHttpsUrl(data.previewImageUrl) ? data.previewImageUrl : data.imageUrl,
    };
  } catch (error) {
    console.error("DMX report error", error);
    return { text: "Không đọc được dữ liệu DMX. Vui lòng thử lại sau." };
  }
}

async function sendScheduledReport(env) {
  const report = await loadDmxReport(env, "tongquan");
  await pushReport(env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_GROUP_ID, report);
}

function createMessages(report) {
  /** @type {Array<Record<string, string>>} */
  const messages = [{ type: "text", text: String(report.text || "").slice(0, 5000) }];
  if (isHttpsUrl(report.imageUrl)) {
    messages.push({
      type: "image",
      originalContentUrl: report.imageUrl,
      previewImageUrl: isHttpsUrl(report.previewImageUrl) ? report.previewImageUrl : report.imageUrl,
    });
  }
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
  if (!response.ok) console.error("LINE reply failed", response.status, await response.text());
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
  if (!response.ok) console.error("LINE push failed", response.status, await response.text());
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

import React from "react";
import { ImageResponse } from "next/og";
import {
  docLoaiBaoCaoBot,
  kiemTraChuKyAnh,
  taoBaoCaoBot,
  type BaoCaoBot,
} from "@/lib/dmx/bao-cao-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const h = React.createElement;

function taoTheChiSo(baoCao: BaoCaoBot) {
  return h(
    "div",
    { style: { display: "flex", gap: 18, width: "100%" } },
    ...baoCao.chiSo.slice(0, 4).map((item, index) => h(
      "div",
      {
        key: `${item.nhan}-${index}`,
        style: {
          display: "flex",
          flex: 1,
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          border: "2px solid #e2e8f0",
          borderRadius: 18,
          padding: "18px 20px",
        },
      },
      h("div", { style: { color: "#64748b", fontSize: 23, fontWeight: 700 } }, item.nhan),
      h("div", { style: { color: item.mau || "#0f172a", fontSize: 38, fontWeight: 800, marginTop: 8 } }, item.giaTri),
    ))
  );
}

function taoDanhSach(baoCao: BaoCaoBot) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginTop: 22,
        border: "2px solid #e2e8f0",
        borderRadius: 18,
        overflow: "hidden",
      },
    },
    ...baoCao.cacDong.slice(0, 24).map((item, index) => h(
      "div",
      {
        key: `${item.ten}-${index}`,
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: 68,
          padding: "11px 20px",
          backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
          borderBottom: index < Math.min(baoCao.cacDong.length, 24) - 1 ? "1px solid #e2e8f0" : "none",
        },
      },
      h(
        "div",
        { style: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column" } },
        h("div", { style: { color: "#0f172a", fontSize: 24, fontWeight: 750 } }, `${index + 1}. ${item.ten}`),
        item.chiTiet ? h("div", { style: { color: "#64748b", fontSize: 18, marginTop: 4 } }, item.chiTiet) : null,
      ),
      h("div", { style: { color: item.mau || "#0f172a", fontSize: 27, fontWeight: 800, marginLeft: 18 } }, item.giaTri),
    ))
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loai = docLoaiBaoCaoBot(url.searchParams.get("loai"));
  const ngay = url.searchParams.get("ngay")?.trim() || "";
  const userId = url.searchParams.get("uid")?.trim() || "";
  const hetHan = Number(url.searchParams.get("exp"));
  const chuKy = url.searchParams.get("sig") || "";
  const maNV = url.searchParams.get("maNV")?.trim() || "";

  if (!ngay || !kiemTraChuKyAnh(loai, ngay, userId, hetHan, chuKy, maNV)) {
    return new Response("Liên kết ảnh không hợp lệ hoặc đã hết hạn.", { status: 401 });
  }

  try {
    const baoCao = await taoBaoCaoBot(loai, ngay, userId, maNV);
    const gioiHanDong = 24;
    const chieuCao = Math.max(820, Math.min(2400, 470 + Math.min(baoCao.cacDong.length, gioiHanDong) * 84));
    const element = h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#eef6ff",
          color: "#0f172a",
          padding: 42,
          fontFamily: "sans-serif",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            backgroundColor: "#ffffff",
            border: "2px solid #bfdbfe",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.10)",
          },
        },
        h("div", { style: { color: "#1d4ed8", fontSize: 20, fontWeight: 800, letterSpacing: 1.2 } }, "ĐIỆN MÁY XANH • BÁO CÁO TỰ ĐỘNG"),
        h("div", { style: { fontSize: 42, fontWeight: 900, marginTop: 8 } }, baoCao.tieuDe),
        h("div", { style: { color: "#475569", fontSize: 23, marginTop: 7, marginBottom: 24 } }, baoCao.phuDe),
        taoTheChiSo(baoCao),
        taoDanhSach(baoCao),
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 17, marginTop: 18 } },
          h("span", null, `Cập nhật: ${baoCao.capNhatLuc}`),
          h("span", null, "Nguồn: duongnt.io.vn/dmx"),
        ),
      )
    );

    return new ImageResponse(element, {
      width: 1200,
      height: chieuCao,
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="dmx-${loai}-${ngay}.png"`,
      },
    });
  } catch (error) {
    console.error("GET /api/dmx/bot/anh error", error);
    return new Response("Chưa tạo được ảnh báo cáo DMX.", { status: 500 });
  }
}

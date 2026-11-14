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

const MAU = {
  xanh: "#1769e8",
  xanhDam: "#0f55c8",
  vang: "#f4c20d",
  xanhLa: "#06965f",
  nenXanh: "#edf6ff",
  vien: "#c9d8eb",
  chu: "#172033",
  chuPhu: "#64748b",
};

function chiaCap<T>(danhSach: T[]): T[][] {
  const ketQua: T[][] = [];
  for (let i = 0; i < danhSach.length; i += 2) ketQua.push(danhSach.slice(i, i + 2));
  return ketQua;
}

function doDaiThanh(giaTri: string): string {
  if (!giaTri.includes("%")) return "100%";
  const so = Number(giaTri.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  return `${Math.max(2, Math.min(100, Number.isFinite(so) ? so : 0))}%`;
}

function taoTheChiSo(baoCao: BaoCaoBot) {
  return h(
    "div",
    { style: { display: "flex", flexWrap: "wrap", gap: 12, width: "100%", marginTop: 15 } },
    ...baoCao.chiSo.slice(0, 8).map((item, index) => h(
      "div",
      {
        key: `${item.nhan}-${index}`,
        style: {
          display: "flex",
          width: "23%",
          flexGrow: 1,
          flexDirection: "column",
          ...(index < 2 ? {
            backgroundImage: index === 0
              ? "linear-gradient(135deg, #1687ef 0%, #075fc8 100%)"
              : "linear-gradient(135deg, #1dbf73 0%, #07834c 100%)",
          } : {}),
          backgroundColor: index === 0
            ? "#1687ef"
            : index === 1 ? "#1dbf73" : (index % 2 === 0 ? "#edf5ff" : "#eaf8f0"),
          border: `2px solid ${index === 0 ? "#64b5f6" : index === 1 ? "#6ee7a8" : index % 2 === 0 ? "#c7dcf7" : "#bfe6d2"}`,
          borderRadius: 12,
          padding: "14px 16px",
        },
      },
      h("div", { style: { color: index < 2 ? "#eff8ff" : MAU.chuPhu, fontSize: 18, fontWeight: 750, textTransform: "uppercase" } }, item.nhan),
      h("div", { style: { color: index < 2 ? "#ffffff" : item.mau || MAU.chu, fontSize: 32, fontWeight: 850, marginTop: 7 } }, item.giaTri),
    ))
  );
}

function taoBangDanhSach(baoCao: BaoCaoBot) {
  const dong = baoCao.cacDong.slice(0, 24);
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginTop: 15,
        border: `2px solid ${MAU.vien}`,
        borderRadius: 12,
        overflow: "hidden",
      },
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", minHeight: 52, padding: "8px 15px", backgroundColor: MAU.xanh, color: "#ffffff", borderBottom: `4px solid ${MAU.vang}` } },
      h("div", { style: { width: 62, fontSize: 17, fontWeight: 850, textAlign: "center" } }, "HẠNG"),
      h("div", { style: { display: "flex", flex: 1, fontSize: 18, fontWeight: 850 } }, "NỘI DUNG"),
      h("div", { style: { width: 210, justifyContent: "flex-end", fontSize: 18, fontWeight: 850 } }, "KẾT QUẢ"),
    ),
    ...dong.map((item, index) => h(
      "div",
      {
        key: `${item.ten}-${index}`,
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          minHeight: 70,
          padding: "10px 15px",
          backgroundColor: index < 3 ? "#effaf4" : (index % 2 === 0 ? "#ffffff" : "#f5f8fc"),
          borderBottom: index < dong.length - 1 ? "1px solid #dbe4ef" : "none",
        },
      },
      h("div", { style: { width: 62, justifyContent: "center", color: index < 3 ? "#a66b00" : MAU.chu, fontSize: 21, fontWeight: 850 } }, index < 3 ? ["🥇", "🥈", "🥉"][index] : String(index + 1)),
      h(
        "div",
        { style: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column" } },
        h("div", { style: { color: MAU.chu, fontSize: 20, fontWeight: 800 } }, item.ten),
        item.chiTiet ? h("div", { style: { color: MAU.chuPhu, fontSize: 16, marginTop: 4 } }, item.chiTiet) : null,
      ),
      h("div", { style: { width: 210, justifyContent: "flex-end", color: item.mau || MAU.chu, fontSize: 23, fontWeight: 850 } }, item.giaTri),
    ))
  );
}

function taoLuoiThiDua(baoCao: BaoCaoBot) {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", width: "100%", gap: 10, marginTop: 15 } },
    ...chiaCap(baoCao.cacDong.slice(0, 20)).map((cap, hang) => h(
      "div",
      { key: `hang-${hang}`, style: { display: "flex", width: "100%", gap: 10 } },
      ...cap.map((item, index) => {
        const mau = item.mau || MAU.xanhLa;
        return h(
          "div",
          {
            key: `${item.ten}-${index}`,
            style: {
              display: "flex", flex: 1, minHeight: 112, flexDirection: "column", justifyContent: "space-between",
              backgroundColor: mau === "#dc2626" ? "#fff1f2" : mau === "#d97706" ? "#fff9e8" : "#effbf5",
              border: `2px solid ${mau}`, borderRadius: 12, padding: "12px 14px",
            },
          },
          h("div", { style: { display: "flex", width: "100%", justifyContent: "space-between", gap: 10 } },
            h("div", { style: { display: "flex", flex: 1, color: MAU.chu, fontSize: 18, fontWeight: 800 } }, item.ten),
            h("div", { style: { color: mau, fontSize: 22, fontWeight: 900 } }, item.giaTri),
          ),
          item.chiTiet ? h("div", { style: { color: MAU.chuPhu, fontSize: 15, marginTop: 8 } }, item.chiTiet) : null,
          h("div", { style: { display: "flex", width: "100%", height: 6, borderRadius: 4, backgroundColor: "#d9e3ec", marginTop: 9, overflow: "hidden" } },
            h("div", { style: { width: doDaiThanh(item.giaTri), height: "100%", backgroundColor: mau } }),
          ),
        );
      }),
      cap.length === 1 ? h("div", { style: { display: "flex", flex: 1 } }) : null,
    )),
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
  const sieuThiId = url.searchParams.get("sid")?.trim() || "";

  if (!ngay || !kiemTraChuKyAnh(loai, ngay, userId, hetHan, chuKy, maNV, sieuThiId)) {
    return new Response("Liên kết ảnh không hợp lệ hoặc đã hết hạn.", { status: 401 });
  }

  try {
    const baoCao = await taoBaoCaoBot(loai, ngay, userId, maNV, sieuThiId);
    const gioiHanDong = 24;
    const laBang = ["nhanvien", "suckhoe", "sk", "msnv"].includes(loai);
    const soDong = Math.min(baoCao.cacDong.length, gioiHanDong);
    const chieuCaoNoiDung = laBang ? soDong * 70 : Math.ceil(soDong / 2) * 122;
    const chieuCao = Math.max(760, Math.min(2400, 390 + chieuCaoNoiDung));
    const nhanCheDo = loai === "realtime" ? "REALTIME" : "LŨY KẾ";
    const bieuTuong = loai === "nhanvien" ? "🏆" : ["suckhoe", "sk", "msnv"].includes(loai) ? "❤️‍🩹" : loai === "thidua" ? "🎯" : "📊";
    const element = h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          color: MAU.chu,
          padding: 26,
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
            border: `2px solid ${MAU.vien}`,
            borderRadius: 14,
            padding: 22,
          },
        },
        h("div", { style: { color: "#eaf3ff", fontSize: 16, fontWeight: 750, backgroundImage: "linear-gradient(90deg, #1769e8 0%, #0b87cf 55%, #08a86b 100%)", borderRadius: 10, padding: "10px 14px" } }, `${nhanCheDo}  •  Ngày ${baoCao.ngayHienThi}  •  Cập nhật: ${baoCao.capNhatLuc}`),
        h("div", { style: { fontSize: 31, fontWeight: 900, marginTop: 8 } }, `${bieuTuong} ${baoCao.tieuDe}`),
        h("div", { style: { display: "flex", width: "100%", minHeight: 44, alignItems: "center", backgroundColor: MAU.nenXanh, color: MAU.xanh, borderRadius: 9, padding: "8px 14px", fontSize: 17, fontWeight: 800, marginTop: 10 } }, baoCao.phuDe),
        taoTheChiSo(baoCao),
        laBang ? taoBangDanhSach(baoCao) : taoLuoiThiDua(baoCao),
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", color: MAU.chuPhu, fontSize: 14, marginTop: 12 } },
          h("span", null, "Đơn vị: triệu đồng"),
          h("span", null, `Ngày ${baoCao.ngayHienThi}`),
        ),
      )
    );

    return new ImageResponse(element, {
      width: 1080,
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

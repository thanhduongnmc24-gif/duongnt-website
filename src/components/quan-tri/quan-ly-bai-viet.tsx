"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type TrangThai = "ban_nhap" | "da_dang" | "da_an";

type BaiViet = {
  id: string;
  tieu_de: string;
  duong_dan: string;
  tom_tat: string | null;
  loai_noi_dung: "trinh_soan_thao" | "html";
  noi_dung: string;
  trang_thai: TrangThai;
  ngay_dang: string | null;
  ngay_cap_nhat: string;
  nguoi_dung: { ten_hien_thi: string } | { ten_hien_thi: string }[] | null;
  de_muc: { ten_de_muc: string } | { ten_de_muc: string }[] | null;
  de_muc_con: { ten_de_muc_con: string } | { ten_de_muc_con: string }[] | null;
};

function layGiaTriLienKet<T>(duLieu: T | T[] | null): T | null {
  return Array.isArray(duLieu) ? duLieu[0] ?? null : duLieu;
}

function tenTrangThai(trangThai: TrangThai) {
  if (trangThai === "da_dang") return "Đã đăng";
  if (trangThai === "da_an") return "Đã ẩn";
  return "Bản nháp";
}

export function QuanLyBaiViet() {
  const [danhSach, setDanhSach] = useState<BaiViet[]>([]);
  const [trangThai, setTrangThai] = useState("tat_ca");
  const [tuKhoa, setTuKhoa] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLyId, setDangXuLyId] = useState<string | null>(null);
  const [baiDangSua, setBaiDangSua] = useState<BaiViet | null>(null);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");

  const taiDanhSach = useCallback(async () => {
    setDangTai(true);
    setLoi("");
    try {
      const thamSo = new URLSearchParams({ trang_thai: trangThai, tu_khoa: tuKhoa });
      const phanHoi = await fetch(`/api/quan-tri/bai-viet?${thamSo.toString()}`, {
        cache: "no-store",
      });
      const ketQua = await phanHoi.json();
      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(ketQua.loi || "Không thể tải danh sách bài viết.");
      }
      setDanhSach(ketQua.du_lieu || []);
    } catch (loiBatDuoc) {
      setLoi(loiBatDuoc instanceof Error ? loiBatDuoc.message : "Không thể tải danh sách bài viết.");
    } finally {
      setDangTai(false);
    }
  }, [trangThai, tuKhoa]);

  useEffect(() => {
    const boDem = window.setTimeout(taiDanhSach, 250);
    return () => window.clearTimeout(boDem);
  }, [taiDanhSach]);

  useEffect(() => {
    if (!loi && !thongBao) return;
    const boDem = window.setTimeout(() => {
      setLoi("");
      setThongBao("");
    }, 3500);
    return () => window.clearTimeout(boDem);
  }, [loi, thongBao]);

  async function capNhat(id: string, duLieu: Record<string, unknown>) {
    setDangXuLyId(id);
    setLoi("");
    setThongBao("");
    try {
      const phanHoi = await fetch("/api/quan-tri/bai-viet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...duLieu }),
      });
      const ketQua = await phanHoi.json();
      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(ketQua.loi || "Không thể cập nhật bài viết.");
      }
      setThongBao(ketQua.thong_bao || "Cập nhật bài viết thành công.");
      setBaiDangSua(null);
      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(loiBatDuoc instanceof Error ? loiBatDuoc.message : "Không thể cập nhật bài viết.");
    } finally {
      setDangXuLyId(null);
    }
  }

  async function xoa(baiViet: BaiViet) {
    if (!window.confirm(`Xóa bài viết “${baiViet.tieu_de}”?`)) return;
    setDangXuLyId(baiViet.id);
    try {
      const phanHoi = await fetch(`/api/quan-tri/bai-viet?id=${baiViet.id}`, {
        method: "DELETE",
      });
      const ketQua = await phanHoi.json();
      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(ketQua.loi || "Không thể xóa bài viết.");
      }
      setThongBao(ketQua.thong_bao || "Đã xóa bài viết.");
      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(loiBatDuoc instanceof Error ? loiBatDuoc.message : "Không thể xóa bài viết.");
    } finally {
      setDangXuLyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {thongBao ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 shadow-lg">
          {thongBao}
        </div>
      ) : null}
      {loi ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-lg">
          {loi}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
        <input
          value={tuKhoa}
          onChange={(suKien) => setTuKhoa(suKien.target.value)}
          placeholder="Tìm theo tiêu đề"
          className="h-11 flex-1 rounded-xl border border-slate-300 px-4"
        />
        <select
          value={trangThai}
          onChange={(suKien) => setTrangThai(suKien.target.value)}
          className="h-11 rounded-xl border border-slate-300 px-4"
        >
          <option value="tat_ca">Tất cả trạng thái</option>
          <option value="da_dang">Đã đăng</option>
          <option value="ban_nhap">Bản nháp</option>
          <option value="da_an">Đã ẩn</option>
        </select>
        <Link
          href="/dang-bai"
          className="flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white"
        >
          Đăng bài mới
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1050px]">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-4">Tiêu đề</th>
              <th className="p-4">Tác giả</th>
              <th className="p-4">Đề mục</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Cập nhật</th>
              <th className="p-4">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {danhSach.map((baiViet) => {
              const nguoiDung = layGiaTriLienKet(baiViet.nguoi_dung);
              const deMuc = layGiaTriLienKet(baiViet.de_muc);
              const deMucCon = layGiaTriLienKet(baiViet.de_muc_con);
              const dangXuLy = dangXuLyId === baiViet.id;

              return (
                <tr key={baiViet.id} className="border-t border-slate-200 align-top">
                  <td className="max-w-md p-4">
                    <p className="font-bold text-slate-900">{baiViet.tieu_de}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {baiViet.tom_tat || "Không có tóm tắt"}
                    </p>
                  </td>
                  <td className="p-4">{nguoiDung?.ten_hien_thi || "Không rõ"}</td>
                  <td className="p-4">
                    <div>{deMuc?.ten_de_muc || "Không rõ"}</div>
                    <div className="text-sm text-slate-500">
                      {deMucCon?.ten_de_muc_con || "Không rõ"}
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      value={baiViet.trang_thai}
                      disabled={dangXuLy}
                      onChange={(suKien) =>
                        capNhat(baiViet.id, { trang_thai: suKien.target.value })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="ban_nhap">Bản nháp</option>
                      <option value="da_dang">Đã đăng</option>
                      <option value="da_an">Đã ẩn</option>
                    </select>
                    <div className="mt-1 text-xs text-slate-500">
                      {tenTrangThai(baiViet.trang_thai)}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(baiViet.ngay_cap_nhat).toLocaleString("vi-VN")}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {baiViet.trang_thai === "da_dang" ? (
                        <Link
                          href={`/bai-viet/${baiViet.duong_dan}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                        >
                          Xem
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={dangXuLy}
                        onClick={() => setBaiDangSua(baiViet)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={dangXuLy}
                        onClick={() => xoa(baiViet)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!dangTai && danhSach.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500">
                  Chưa có bài viết phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {dangTai ? <p className="p-6 text-slate-500">Đang tải dữ liệu...</p> : null}
      </div>

      {baiDangSua ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black">Sửa bài viết</h2>
              <button
                type="button"
                onClick={() => setBaiDangSua(null)}
                className="rounded-lg px-3 py-2 text-xl"
              >
                ×
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(suKien) => {
                suKien.preventDefault();
                const form = new FormData(suKien.currentTarget);
                capNhat(baiDangSua.id, {
                  tieu_de: String(form.get("tieu_de") || ""),
                  tom_tat: String(form.get("tom_tat") || ""),
                  noi_dung: String(form.get("noi_dung") || ""),
                  loai_noi_dung: String(form.get("loai_noi_dung") || "trinh_soan_thao"),
                });
              }}
            >
              <div>
                <label className="mb-2 block font-semibold">Tiêu đề</label>
                <input
                  name="tieu_de"
                  defaultValue={baiDangSua.tieu_de}
                  required
                  className="h-11 w-full rounded-xl border border-slate-300 px-4"
                />
              </div>
              <div>
                <label className="mb-2 block font-semibold">Tóm tắt</label>
                <textarea
                  name="tom_tat"
                  defaultValue={baiDangSua.tom_tat || ""}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
              <div>
                <label className="mb-2 block font-semibold">Kiểu nội dung</label>
                <select
                  name="loai_noi_dung"
                  defaultValue={baiDangSua.loai_noi_dung}
                  className="h-11 w-full rounded-xl border border-slate-300 px-4"
                >
                  <option value="trinh_soan_thao">Nội dung thường</option>
                  <option value="html">HTML</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block font-semibold">Nội dung</label>
                <textarea
                  name="noi_dung"
                  defaultValue={baiDangSua.noi_dung}
                  rows={15}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBaiDangSua(null)}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={dangXuLyId === baiDangSua.id}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

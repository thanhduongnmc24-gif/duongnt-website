"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type VaiTro = "quan_tri" | "nguoi_dung";

type TaiKhoan = {
  id: string;
  ten_dang_nhap: string;
  ten_hien_thi: string;
  email: string | null;
  vai_tro: VaiTro;
  dang_hoat_dong: boolean;
  ngay_tao: string;
};

type DuLieuTaoTaiKhoan = {
  ten_dang_nhap: string;
  ten_hien_thi: string;
  email: string;
  mat_khau: string;
  vai_tro: VaiTro;
};

const duLieuMacDinh: DuLieuTaoTaiKhoan = {
  ten_dang_nhap: "",
  ten_hien_thi: "",
  email: "",
  mat_khau: "",
  vai_tro: "nguoi_dung",
};

export default function TrangQuanLyTaiKhoan() {
  const [danhSach, setDanhSach] = useState<TaiKhoan[]>([]);
  const [duLieuTao, setDuLieuTao] =
    useState<DuLieuTaoTaiKhoan>(duLieuMacDinh);

  const [dangTai, setDangTai] = useState(true);
  const [dangXuLyId, setDangXuLyId] =
    useState<string | null>(null);

  const [dangTao, setDangTao] = useState(false);
  const [thongBao, setThongBao] = useState("");
  const [loi, setLoi] = useState("");

  const taiDanhSach = useCallback(async () => {
    setDangTai(true);
    setLoi("");

    try {
      const phanHoi = await fetch(
        "/api/quan-tri/tai-khoan",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi ||
            "Không thể tải danh sách tài khoản."
        );
      }

      setDanhSach(ketQua.du_lieu || []);
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể tải danh sách tài khoản."
      );
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiDanhSach();
  }, [taiDanhSach]);

  async function taoTaiKhoan() {
    setThongBao("");
    setLoi("");

    if (!duLieuTao.ten_dang_nhap.trim()) {
      setLoi("Tên đăng nhập không được để trống.");
      return;
    }

    if (!duLieuTao.ten_hien_thi.trim()) {
      setLoi("Tên hiển thị không được để trống.");
      return;
    }

    if (!duLieuTao.mat_khau) {
      setLoi("Mật khẩu không được để trống.");
      return;
    }

    setDangTao(true);

    try {
      const phanHoi = await fetch(
        "/api/quan-tri/tai-khoan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(duLieuTao),
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi || "Không thể tạo tài khoản."
        );
      }

      setThongBao("Tạo tài khoản thành công.");
      setDuLieuTao(duLieuMacDinh);

      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể tạo tài khoản."
      );
    } finally {
      setDangTao(false);
    }
  }

  async function capNhatTaiKhoan(
    taiKhoan: TaiKhoan,
    thayDoi: Partial<TaiKhoan>
  ) {
    setThongBao("");
    setLoi("");
    setDangXuLyId(taiKhoan.id);

    const duLieuMoi: TaiKhoan = {
      ...taiKhoan,
      ...thayDoi,
    };

    try {
      const phanHoi = await fetch(
        "/api/quan-tri/tai-khoan",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: duLieuMoi.id,
            ten_hien_thi: duLieuMoi.ten_hien_thi,
            email: duLieuMoi.email || "",
            vai_tro: duLieuMoi.vai_tro,
            dang_hoat_dong:
              duLieuMoi.dang_hoat_dong,
          }),
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi ||
            "Không thể cập nhật tài khoản."
        );
      }

      setThongBao("Cập nhật tài khoản thành công.");

      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể cập nhật tài khoản."
      );
    } finally {
      setDangXuLyId(null);
    }
  }

  async function doiVaiTro(
    taiKhoan: TaiKhoan,
    vaiTroMoi: VaiTro
  ) {
    const noiDung =
      vaiTroMoi === "quan_tri"
        ? `Cấp quyền quản trị cho tài khoản "${taiKhoan.ten_dang_nhap}"?`
        : `Hạ quyền tài khoản "${taiKhoan.ten_dang_nhap}" xuống người dùng?`;

    if (!window.confirm(noiDung)) {
      return;
    }

    await capNhatTaiKhoan(taiKhoan, {
      vai_tro: vaiTroMoi,
    });
  }

  async function doiTrangThai(taiKhoan: TaiKhoan) {
    const trangThaiMoi = !taiKhoan.dang_hoat_dong;

    const noiDung = trangThaiMoi
      ? `Mở khóa tài khoản "${taiKhoan.ten_dang_nhap}"?`
      : `Khóa tài khoản "${taiKhoan.ten_dang_nhap}"?`;

    if (!window.confirm(noiDung)) {
      return;
    }

    await capNhatTaiKhoan(taiKhoan, {
      dang_hoat_dong: trangThaiMoi,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="font-semibold text-blue-600">
            Trang quản trị
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Quản lý tài khoản
          </h1>

          <p className="mt-2 text-slate-600">
            Tạo mới, phân quyền, khóa và mở khóa tài khoản.
          </p>
        </header>

        {thongBao ? (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            {thongBao}
          </div>
        ) : null}

        {loi ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {loi}
          </div>
        ) : null}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Tạo tài khoản mới
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              value={duLieuTao.ten_dang_nhap}
              onChange={(suKien) =>
                setDuLieuTao({
                  ...duLieuTao,
                  ten_dang_nhap:
                    suKien.target.value,
                })
              }
              placeholder="Tên đăng nhập"
              disabled={dangTao}
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={duLieuTao.ten_hien_thi}
              onChange={(suKien) =>
                setDuLieuTao({
                  ...duLieuTao,
                  ten_hien_thi:
                    suKien.target.value,
                })
              }
              placeholder="Tên hiển thị"
              disabled={dangTao}
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={duLieuTao.email}
              onChange={(suKien) =>
                setDuLieuTao({
                  ...duLieuTao,
                  email: suKien.target.value,
                })
              }
              type="email"
              placeholder="Email, không bắt buộc"
              disabled={dangTao}
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={duLieuTao.mat_khau}
              onChange={(suKien) =>
                setDuLieuTao({
                  ...duLieuTao,
                  mat_khau: suKien.target.value,
                })
              }
              type="password"
              placeholder="Mật khẩu"
              disabled={dangTao}
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <select
              value={duLieuTao.vai_tro}
              onChange={(suKien) =>
                setDuLieuTao({
                  ...duLieuTao,
                  vai_tro:
                    suKien.target.value as VaiTro,
                })
              }
              disabled={dangTao}
              className="rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="nguoi_dung">
                Người dùng
              </option>

              <option value="quan_tri">
                Quản trị
              </option>
            </select>

            <button
              type="button"
              onClick={taoTaiKhoan}
              disabled={dangTao}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {dangTao
                ? "Đang tạo..."
                : "Tạo tài khoản"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Danh sách tài khoản
            </h2>
          </div>

          {dangTai ? (
            <p className="p-6 text-slate-600">
              Đang tải dữ liệu...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-4">
                      Tên đăng nhập
                    </th>

                    <th className="p-4">
                      Tên hiển thị
                    </th>

                    <th className="p-4">Email</th>
                    <th className="p-4">Vai trò</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Ngày tạo</th>
                    <th className="p-4">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {danhSach.map((taiKhoan) => {
                    const dangXuLy =
                      dangXuLyId === taiKhoan.id;

                    return (
                      <tr
                        key={taiKhoan.id}
                        className="border-t border-slate-200"
                      >
                        <td className="p-4 font-semibold">
                          {taiKhoan.ten_dang_nhap}
                        </td>

                        <td className="p-4">
                          {taiKhoan.ten_hien_thi}
                        </td>

                        <td className="p-4">
                          {taiKhoan.email || "Không có"}
                        </td>

                        <td className="p-4">
                          <select
                            value={taiKhoan.vai_tro}
                            disabled={dangXuLy}
                            onChange={(suKien) =>
                              doiVaiTro(
                                taiKhoan,
                                suKien.target
                                  .value as VaiTro
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2"
                          >
                            <option value="nguoi_dung">
                              Người dùng
                            </option>

                            <option value="quan_tri">
                              Quản trị
                            </option>
                          </select>
                        </td>

                        <td className="p-4">
                          <span
                            className={
                              taiKhoan.dang_hoat_dong
                                ? "rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                                : "rounded-full bg-red-100 px-3 py-1 text-sm text-red-700"
                            }
                          >
                            {taiKhoan.dang_hoat_dong
                              ? "Đang hoạt động"
                              : "Đã khóa"}
                          </span>
                        </td>

                        <td className="p-4">
                          {new Date(
                            taiKhoan.ngay_tao
                          ).toLocaleString("vi-VN")}
                        </td>

                        <td className="p-4">
                          <button
                            type="button"
                            disabled={dangXuLy}
                            onClick={() =>
                              doiTrangThai(taiKhoan)
                            }
                            className={
                              taiKhoan.dang_hoat_dong
                                ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                : "rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            }
                          >
                            {dangXuLy
                              ? "Đang xử lý..."
                              : taiKhoan.dang_hoat_dong
                                ? "Khóa"
                                : "Mở khóa"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {danhSach.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-slate-500"
                      >
                        Chưa có tài khoản.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type LoaiDeMuc = "cap_1" | "cap_2";

type DeMucCon = {
  id: string;
  de_muc_id: string;
  ten_de_muc_con: string;
  duong_dan: string;
  mo_ta: string | null;
  thu_tu: number;
  dang_hien_thi: boolean;
};

type DeMuc = {
  id: string;
  ten_de_muc: string;
  duong_dan: string;
  mo_ta: string | null;
  thu_tu: number;
  dang_hien_thi: boolean;
  de_muc_con: DeMucCon[];
};

type DuLieuForm = {
  loai: LoaiDeMuc;
  de_muc_id: string;
  ten: string;
  mo_ta: string;
  thu_tu: number;
  dang_hien_thi: boolean;
};

type DuLieuLuuDeMuc = {
  id: string;
  loai: LoaiDeMuc;
  de_muc_id: string;
  ten: string;
  mo_ta: string;
  thu_tu: number;
  dang_hien_thi: boolean;
};

const formMacDinh: DuLieuForm = {
  loai: "cap_1",
  de_muc_id: "",
  ten: "",
  mo_ta: "",
  thu_tu: 0,
  dang_hien_thi: true,
};

const lopLuoiDeMuc =
  "grid w-full items-center gap-2 " +
  "lg:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_100px_120px_96px]";

const lopOThuTu =
  "h-11 w-full rounded-lg border border-slate-300 px-3 outline-none " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const lopNhanHienThi =
  "flex h-11 items-center gap-2 whitespace-nowrap";

const lopNutXoa =
  "h-11 w-full rounded-lg bg-red-600 px-3 font-semibold text-white " +
  "transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function TrangQuanLyDeMuc() {
  const [danhSach, setDanhSach] = useState<DeMuc[]>([]);
  const [form, setForm] =
    useState<DuLieuForm>(formMacDinh);

  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);

  const [thongBao, setThongBao] = useState("");
  const [loi, setLoi] = useState("");

  const taiDanhSach = useCallback(async () => {
    setDangTai(true);
    setLoi("");

    try {
      const phanHoi = await fetch(
        "/api/quan-tri/de-muc",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi ||
            "Không thể tải danh sách đề mục."
        );
      }

      setDanhSach(ketQua.du_lieu || []);
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể tải danh sách đề mục."
      );
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiDanhSach();
  }, [taiDanhSach]);

  useEffect(() => {
    if (!thongBao && !loi) {
      return;
    }

    const boDem = window.setTimeout(() => {
      setThongBao("");
      setLoi("");
    }, 3000);

    return () => {
      window.clearTimeout(boDem);
    };
  }, [thongBao, loi]);

  async function taoDeMuc(
    suKien: FormEvent<HTMLFormElement>
  ) {
    suKien.preventDefault();

    setDangXuLy(true);
    setThongBao("");
    setLoi("");

    try {
      const phanHoi = await fetch(
        "/api/quan-tri/de-muc",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi || "Không thể tạo đề mục."
        );
      }

      setThongBao(
        ketQua.thong_bao ||
          "Tạo đề mục thành công."
      );

      setForm(formMacDinh);

      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể tạo đề mục."
      );
    } finally {
      setDangXuLy(false);
    }
  }

  function layGiaTriInput(id: string): string {
    const phanTu = document.getElementById(
      id
    ) as HTMLInputElement | null;

    return phanTu?.value ?? "";
  }

  function layGiaTriCheckbox(id: string): boolean {
    const phanTu = document.getElementById(
      id
    ) as HTMLInputElement | null;

    return phanTu?.checked ?? false;
  }

  function taoDanhSachCanLuu(): DuLieuLuuDeMuc[] {
    return danhSach.flatMap((deMuc) => {
      const deMucCapMot: DuLieuLuuDeMuc = {
        id: deMuc.id,
        loai: "cap_1",
        de_muc_id: "",
        ten: layGiaTriInput(`ten-${deMuc.id}`),
        mo_ta: layGiaTriInput(
          `mo-ta-${deMuc.id}`
        ),
        thu_tu: Number(
          layGiaTriInput(`thu-tu-${deMuc.id}`)
        ),
        dang_hien_thi: layGiaTriCheckbox(
          `hien-thi-${deMuc.id}`
        ),
      };

      const danhSachDeMucCon: DuLieuLuuDeMuc[] =
        deMuc.de_muc_con.map((deMucCon) => ({
          id: deMucCon.id,
          loai: "cap_2",
          de_muc_id: deMuc.id,
          ten: layGiaTriInput(
            `ten-${deMucCon.id}`
          ),
          mo_ta: layGiaTriInput(
            `mo-ta-${deMucCon.id}`
          ),
          thu_tu: Number(
            layGiaTriInput(
              `thu-tu-${deMucCon.id}`
            )
          ),
          dang_hien_thi: layGiaTriCheckbox(
            `hien-thi-${deMucCon.id}`
          ),
        }));

      return [
        deMucCapMot,
        ...danhSachDeMucCon,
      ];
    });
  }

  async function luuTatCaThayDoi() {
    setDangXuLy(true);
    setThongBao("");
    setLoi("");

    try {
      const danhSachCanLuu = taoDanhSachCanLuu();

      if (danhSachCanLuu.length === 0) {
        throw new Error(
          "Chưa có đề mục nào để lưu."
        );
      }

      for (const deMucCanLuu of danhSachCanLuu) {
        if (!deMucCanLuu.ten.trim()) {
          throw new Error(
            "Tên đề mục không được để trống."
          );
        }

        if (
          !Number.isInteger(deMucCanLuu.thu_tu) ||
          deMucCanLuu.thu_tu < 0
        ) {
          throw new Error(
            `Thứ tự của đề mục "${deMucCanLuu.ten}" không hợp lệ.`
          );
        }
      }

      const ketQuaLuu = await Promise.all(
        danhSachCanLuu.map(
          async (deMucCanLuu) => {
            const phanHoi = await fetch(
              "/api/quan-tri/de-muc",
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  deMucCanLuu
                ),
              }
            );

            const ketQua =
              await phanHoi.json();

            if (
              !phanHoi.ok ||
              !ketQua.thanh_cong
            ) {
              throw new Error(
                ketQua.loi ||
                  `Không thể lưu đề mục "${deMucCanLuu.ten}".`
              );
            }

            return ketQua;
          }
        )
      );

      setThongBao(
        `Đã lưu thành công ${ketQuaLuu.length} đề mục.`
      );

      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể lưu các thay đổi."
      );
    } finally {
      setDangXuLy(false);
    }
  }

  async function xoa(
    loai: LoaiDeMuc,
    id: string,
    ten: string
  ) {
    const dongY = window.confirm(
      `Anh Hai có chắc muốn xóa "${ten}" không?`
    );

    if (!dongY) {
      return;
    }

    setDangXuLy(true);
    setThongBao("");
    setLoi("");

    try {
      const thamSo = new URLSearchParams({
        id,
        loai,
      });

      const phanHoi = await fetch(
        `/api/quan-tri/de-muc?${thamSo.toString()}`,
        {
          method: "DELETE",
        }
      );

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(
          ketQua.loi || "Không thể xóa đề mục."
        );
      }

      setThongBao(
        ketQua.thong_bao ||
          "Xóa đề mục thành công."
      );

      await taiDanhSach();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể xóa đề mục."
      );
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {thongBao ? (
          <div className="fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 shadow-lg">
            <span className="flex-1">
              {thongBao}
            </span>

            <button
              type="button"
              onClick={() => setThongBao("")}
              className="font-bold text-green-700"
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        ) : null}

        {loi ? (
          <div className="fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-lg">
            <span className="flex-1">{loi}</span>

            <button
              type="button"
              onClick={() => setLoi("")}
              className="font-bold text-red-700"
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        ) : null}

        <header className="mb-6">
          <p className="font-semibold text-blue-600">
            Trang quản trị
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Quản lý đề mục
          </h1>
        </header>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Tạo đề mục mới
          </h2>

          <form
            onSubmit={taoDeMuc}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <select
              value={form.loai}
              disabled={dangXuLy}
              onChange={(suKien) =>
                setForm({
                  ...form,
                  loai:
                    suKien.target
                      .value as LoaiDeMuc,
                  de_muc_id: "",
                })
              }
              className="h-11 rounded-xl border border-slate-300 px-4"
            >
              <option value="cap_1">
                Đề mục cấp 1
              </option>

              <option value="cap_2">
                Đề mục cấp 2
              </option>
            </select>

            {form.loai === "cap_2" ? (
              <select
                value={form.de_muc_id}
                disabled={dangXuLy}
                onChange={(suKien) =>
                  setForm({
                    ...form,
                    de_muc_id:
                      suKien.target.value,
                  })
                }
                required
                className="h-11 rounded-xl border border-slate-300 px-4"
              >
                <option value="">
                  Chọn đề mục cấp 1
                </option>

                {danhSach.map((deMuc) => (
                  <option
                    key={deMuc.id}
                    value={deMuc.id}
                  >
                    {deMuc.ten_de_muc}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}

            <input
              value={form.ten}
              disabled={dangXuLy}
              onChange={(suKien) =>
                setForm({
                  ...form,
                  ten: suKien.target.value,
                })
              }
              placeholder="Tên đề mục"
              required
              className="h-11 rounded-xl border border-slate-300 px-4"
            />

            <input
              value={form.thu_tu}
              disabled={dangXuLy}
              onChange={(suKien) =>
                setForm({
                  ...form,
                  thu_tu: Number(
                    suKien.target.value
                  ),
                })
              }
              type="number"
              min="0"
              placeholder="Thứ tự"
              className="h-11 rounded-xl border border-slate-300 px-4"
            />

            <textarea
              value={form.mo_ta}
              disabled={dangXuLy}
              onChange={(suKien) =>
                setForm({
                  ...form,
                  mo_ta: suKien.target.value,
                })
              }
              placeholder="Mô tả"
              className="min-h-20 rounded-xl border border-slate-300 px-4 py-3 md:col-span-2"
            />

            <label className="flex h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={form.dang_hien_thi}
                disabled={dangXuLy}
                onChange={(suKien) =>
                  setForm({
                    ...form,
                    dang_hien_thi:
                      suKien.target.checked,
                  })
                }
              />

              Hiển thị trên website
            </label>

            <button
              type="submit"
              disabled={dangXuLy}
              className="h-11 rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {dangXuLy
                ? "Đang xử lý..."
                : "Tạo đề mục"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="sticky top-3 z-40 flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-md">
            <div>
              <h2 className="font-bold text-slate-900">
                Danh sách đề mục
              </h2>

              <p className="text-sm text-slate-500">
                Chỉnh sửa nhiều đề mục rồi lưu
                toàn bộ một lần.
              </p>
            </div>

            <button
              type="button"
              disabled={dangXuLy || dangTai}
              onClick={luuTatCaThayDoi}
              className="h-11 whitespace-nowrap rounded-lg bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {dangXuLy
                ? "Đang lưu..."
                : "Lưu tất cả thay đổi"}
            </button>
          </div>

          {dangTai ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              Đang tải dữ liệu...
            </div>
          ) : null}

          {!dangTai && danhSach.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
              Chưa có đề mục.
            </div>
          ) : null}

          {danhSach.map((deMuc) => (
            <div
              key={deMuc.id}
              className="rounded-2xl bg-white p-3 shadow-sm"
            >
              <div className={lopLuoiDeMuc}>
                <input
                  id={`ten-${deMuc.id}`}
                  defaultValue={deMuc.ten_de_muc}
                  disabled={dangXuLy}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  aria-label="Tên đề mục cấp 1"
                />

                <input
                  id={`mo-ta-${deMuc.id}`}
                  defaultValue={deMuc.mo_ta || ""}
                  disabled={dangXuLy}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  aria-label="Mô tả đề mục cấp 1"
                />

                <input
                  id={`thu-tu-${deMuc.id}`}
                  defaultValue={deMuc.thu_tu}
                  disabled={dangXuLy}
                  type="number"
                  min="0"
                  className={lopOThuTu}
                  aria-label="Thứ tự đề mục cấp 1"
                />

                <label
                  className={lopNhanHienThi}
                >
                  <input
                    id={`hien-thi-${deMuc.id}`}
                    type="checkbox"
                    defaultChecked={
                      deMuc.dang_hien_thi
                    }
                    disabled={dangXuLy}
                  />

                  Hiển thị
                </label>

                <button
                  type="button"
                  disabled={dangXuLy}
                  onClick={() =>
                    xoa(
                      "cap_1",
                      deMuc.id,
                      deMuc.ten_de_muc
                    )
                  }
                  className={lopNutXoa}
                >
                  Xóa
                </button>
              </div>

              <div className="mt-2 space-y-2 border-l-4 border-blue-100 pl-3">
                {deMuc.de_muc_con.map(
                  (deMucCon) => (
                    <div
                      key={deMucCon.id}
                      className={`${lopLuoiDeMuc} rounded-xl bg-slate-50 py-2`}
                    >
                      <input
                        id={`ten-${deMucCon.id}`}
                        defaultValue={
                          deMucCon.ten_de_muc_con
                        }
                        disabled={dangXuLy}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        aria-label="Tên đề mục cấp 2"
                      />

                      <input
                        id={`mo-ta-${deMucCon.id}`}
                        defaultValue={
                          deMucCon.mo_ta || ""
                        }
                        disabled={dangXuLy}
                        className="h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        aria-label="Mô tả đề mục cấp 2"
                      />

                      <input
                        id={`thu-tu-${deMucCon.id}`}
                        defaultValue={
                          deMucCon.thu_tu
                        }
                        disabled={dangXuLy}
                        type="number"
                        min="0"
                        className={lopOThuTu}
                        aria-label="Thứ tự đề mục cấp 2"
                      />

                      <label
                        className={
                          lopNhanHienThi
                        }
                      >
                        <input
                          id={`hien-thi-${deMucCon.id}`}
                          type="checkbox"
                          defaultChecked={
                            deMucCon.dang_hien_thi
                          }
                          disabled={dangXuLy}
                        />

                        Hiển thị
                      </label>

                      <button
                        type="button"
                        disabled={dangXuLy}
                        onClick={() =>
                          xoa(
                            "cap_2",
                            deMucCon.id,
                            deMucCon.ten_de_muc_con
                          )
                        }
                        className={lopNutXoa}
                      >
                        Xóa
                      </button>
                    </div>
                  )
                )}

                {deMuc.de_muc_con.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    Chưa có đề mục cấp 2.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
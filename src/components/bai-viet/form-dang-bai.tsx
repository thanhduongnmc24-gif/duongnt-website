"use client";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type DeMucCon = {
  id: string;
  ten_de_muc_con: string;
};

type DeMuc = {
  id: string;
  ten_de_muc: string;
  de_muc_con: DeMucCon[];
};

type ThuocTinh = {
  danhSachDeMuc: DeMuc[];
};

export function FormDangBai({ danhSachDeMuc }: ThuocTinh) {
  const router = useRouter();
  const [deMucId, setDeMucId] = useState("");
  const [deMucConId, setDeMucConId] = useState("");
  const [loaiNoiDung, setLoaiNoiDung] = useState<
    "trinh_soan_thao" | "html"
  >("trinh_soan_thao");
  const [anhDaiDien, setAnhDaiDien] = useState<File | null>(null);
  const [anhXemTruoc, setAnhXemTruoc] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState("");

  const danhSachDeMucCon = useMemo(() => {
    return (
      danhSachDeMuc.find((deMuc) => deMuc.id === deMucId)
        ?.de_muc_con ?? []
    );
  }, [danhSachDeMuc, deMucId]);

  function chonAnh(suKien: ChangeEvent<HTMLInputElement>) {
    const tep = suKien.target.files?.[0] ?? null;
    setLoi("");

    if (!tep) {
      setAnhDaiDien(null);
      setAnhXemTruoc("");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(tep.type)) {
      setLoi("Ảnh phải có định dạng JPG, PNG hoặc WebP.");
      suKien.target.value = "";
      return;
    }

    if (tep.size > 10 * 1024 * 1024) {
      setLoi("Ảnh đại diện không được vượt quá 10 MB.");
      suKien.target.value = "";
      return;
    }

    setAnhDaiDien(tep);
    setAnhXemTruoc(URL.createObjectURL(tep));
  }

  async function guiBaiViet(
    suKien: FormEvent<HTMLFormElement>,
    trangThai: "ban_nhap" | "da_dang"
  ) {
    suKien.preventDefault();
    setDangXuLy(true);
    setLoi("");

    try {
      const form = suKien.currentTarget;
      const formData = new FormData(form);
      formData.set("de_muc_id", deMucId);
      formData.set("de_muc_con_id", deMucConId);
      formData.set("loai_noi_dung", loaiNoiDung);
      formData.set("trang_thai", trangThai);

      if (anhDaiDien) {
        formData.set("anh_dai_dien", anhDaiDien);
      } else {
        formData.delete("anh_dai_dien");
      }

      const phanHoi = await fetch("/api/bai-viet", {
        method: "POST",
        body: formData,
      });

      const ketQua = await phanHoi.json();

      if (!phanHoi.ok || !ketQua.thanh_cong) {
        throw new Error(ketQua.loi || "Không thể đăng bài.");
      }

      if (trangThai === "da_dang") {
        router.push(`/bai-viet/${ketQua.du_lieu.duong_dan}`);
      } else {
        router.push("/quan-tri");
      }

      router.refresh();
    } catch (loiBatDuoc) {
      setLoi(
        loiBatDuoc instanceof Error
          ? loiBatDuoc.message
          : "Không thể đăng bài."
      );
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <form className="space-y-5">
      {loi ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {loi}
        </div>
      ) : null}

      <div>
        <label className="mb-2 block font-semibold text-slate-700">
          Tiêu đề
        </label>
        <input
          name="tieu_de"
          required
          disabled={dangXuLy}
          className="h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Nhập tiêu đề bài viết"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold text-slate-700">
          Tóm tắt
        </label>
        <textarea
          name="tom_tat"
          disabled={dangXuLy}
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Nội dung tóm tắt hiển thị trên card bài viết"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-semibold text-slate-700">
            Đề mục cấp 1
          </label>
          <select
            value={deMucId}
            disabled={dangXuLy}
            required
            onChange={(suKien) => {
              setDeMucId(suKien.target.value);
              setDeMucConId("");
            }}
            className="h-12 w-full rounded-xl border border-slate-300 px-4"
          >
            <option value="">Chọn đề mục cấp 1</option>
            {danhSachDeMuc.map((deMuc) => (
              <option key={deMuc.id} value={deMuc.id}>
                {deMuc.ten_de_muc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block font-semibold text-slate-700">
            Đề mục cấp 2
          </label>
          <select
            value={deMucConId}
            disabled={dangXuLy || !deMucId}
            required
            onChange={(suKien) => setDeMucConId(suKien.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 px-4 disabled:bg-slate-100"
          >
            <option value="">Chọn đề mục cấp 2</option>
            {danhSachDeMucCon.map((deMucCon) => (
              <option key={deMucCon.id} value={deMucCon.id}>
                {deMucCon.ten_de_muc_con}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-semibold text-slate-700">
          Kiểu nội dung
        </label>
        <select
          value={loaiNoiDung}
          disabled={dangXuLy}
          onChange={(suKien) =>
            setLoaiNoiDung(
              suKien.target.value === "html"
                ? "html"
                : "trinh_soan_thao"
            )
          }
          className="h-12 w-full rounded-xl border border-slate-300 px-4"
        >
          <option value="trinh_soan_thao">Nội dung thông thường</option>
          <option value="html">Nội dung HTML</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block font-semibold text-slate-700">
          {loaiNoiDung === "html" ? "Mã HTML" : "Nội dung bài viết"}
        </label>
        <textarea
          name="noi_dung"
          required
          disabled={dangXuLy}
          rows={16}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder={
            loaiNoiDung === "html"
              ? "Nhập mã HTML an toàn"
              : "Nhập nội dung bài viết"
          }
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold text-slate-700">
          Ảnh đại diện
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={dangXuLy}
          onChange={chonAnh}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
        />
        <p className="mt-2 text-sm text-slate-500">
          Chấp nhận JPG, PNG hoặc WebP, tối đa 10 MB.
        </p>

        {anhXemTruoc ? (
          <img
            src={anhXemTruoc}
            alt="Xem trước ảnh đại diện"
            className="mt-4 max-h-80 w-full rounded-xl border border-slate-200 object-contain"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          disabled={dangXuLy}
          onClick={(suKien) => {
            const form = suKien.currentTarget.form;
            if (form) {
              guiBaiViet(
                { currentTarget: form, preventDefault() {} } as FormEvent<HTMLFormElement>,
                "ban_nhap"
              );
            }
          }}
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Lưu bản nháp
        </button>

        <button
          type="submit"
          disabled={dangXuLy}
          onClick={(suKien) => {
            const form = suKien.currentTarget.form;
            if (form) {
              guiBaiViet(
                { currentTarget: form, preventDefault() {} } as FormEvent<HTMLFormElement>,
                "da_dang"
              );
            }
          }}
          className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {dangXuLy ? "Đang xử lý..." : "Đăng bài"}
        </button>
      </div>
    </form>
  );
}

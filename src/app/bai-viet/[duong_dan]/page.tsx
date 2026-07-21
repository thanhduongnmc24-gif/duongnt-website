import { notFound } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import {
  chuyenVanBanSangHtml,
  lamSachHtml,
} from "@/lib/bao-mat/lam-sach-html";

export const dynamic = "force-dynamic";

type ThuocTinhTrang = {
  params: Promise<{ duong_dan: string }>;
};

export default async function TrangChiTietBaiViet({ params }: ThuocTinhTrang) {
  const { duong_dan } = await params;
  const supabase = await taoSupabaseMayChu();

  const { data: baiViet } = await supabase
    .from("bai_viet")
    .select(`
      id,
      tieu_de,
      tom_tat,
      loai_noi_dung,
      noi_dung,
      google_drive_anh_dai_dien_file_id,
      ngay_dang,
      luot_xem,
      nguoi_dung (ten_hien_thi),
      de_muc (ten_de_muc),
      de_muc_con (ten_de_muc_con)
    `)
    .eq("duong_dan", duong_dan)
    .eq("trang_thai", "da_dang")
    .is("ngay_xoa", null)
    .maybeSingle();

  if (!baiViet) notFound();

  const noiDungHtml =
    baiViet.loai_noi_dung === "html"
      ? lamSachHtml(baiViet.noi_dung)
      : chuyenVanBanSangHtml(baiViet.noi_dung);

  const nguoiDung = Array.isArray(baiViet.nguoi_dung)
    ? baiViet.nguoi_dung[0]
    : baiViet.nguoi_dung;
  const deMuc = Array.isArray(baiViet.de_muc)
    ? baiViet.de_muc[0]
    : baiViet.de_muc;
  const deMucCon = Array.isArray(baiViet.de_muc_con)
    ? baiViet.de_muc_con[0]
    : baiViet.de_muc_con;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-8">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm">
        {baiViet.google_drive_anh_dai_dien_file_id ? (
          <img
            src={`/api/google-drive/tep/${baiViet.google_drive_anh_dai_dien_file_id}`}
            alt={baiViet.tieu_de}
            className="max-h-[520px] w-full object-cover"
          />
        ) : null}

        <div className="p-6 md:p-10">
          <p className="font-semibold text-blue-600">
            {deMuc?.ten_de_muc} / {deMucCon?.ten_de_muc_con}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-slate-900">
            {baiViet.tieu_de}
          </h1>
          {baiViet.tom_tat ? (
            <p className="mt-4 text-lg leading-8 text-slate-600">{baiViet.tom_tat}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-4 border-y border-slate-200 py-4 text-sm text-slate-500">
            <span>Tác giả: {nguoiDung?.ten_hien_thi || "Người dùng"}</span>
            <span>
              Ngày đăng: {baiViet.ngay_dang
                ? new Date(baiViet.ngay_dang).toLocaleString("vi-VN")
                : "Không có"}
            </span>
            <span>{baiViet.luot_xem || 0} lượt xem</span>
          </div>
          <div
            className="mt-8 whitespace-normal text-base leading-8 text-slate-800"
            dangerouslySetInnerHTML={{ __html: noiDungHtml }}
          />
        </div>
      </article>
    </main>
  );
}

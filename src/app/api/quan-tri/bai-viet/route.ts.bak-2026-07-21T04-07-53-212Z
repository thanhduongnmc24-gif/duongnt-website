import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

type VaiTro = "quan_tri" | "nguoi_dung";
type TrangThai = "ban_nhap" | "da_dang" | "da_an";

type QuyenTruyCap = {
  hopLe: boolean;
  loi: string;
  userId: string | null;
  vaiTro: VaiTro | null;
};

async function layQuyenTruyCap(): Promise<QuyenTruyCap> {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { hopLe: false, loi: "Chưa đăng nhập.", userId: null, vaiTro: null };
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (!nguoiDung?.dang_hoat_dong) {
    return { hopLe: false, loi: "Tài khoản đang bị khóa.", userId: null, vaiTro: null };
  }

  return {
    hopLe: true,
    loi: "",
    userId: user.id,
    vaiTro: nguoiDung.vai_tro as VaiTro,
  };
}

export async function GET(yeuCau: Request) {
  const quyen = await layQuyenTruyCap();
  if (!quyen.hopLe || !quyen.userId) {
    return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  }

  const url = new URL(yeuCau.url);
  const trangThai = url.searchParams.get("trang_thai") || "tat_ca";
  const tuKhoa = (url.searchParams.get("tu_khoa") || "").trim();
  const supabaseQuanTri = taoSupabaseQuanTri();

  let truyVan = supabaseQuanTri
    .from("bai_viet")
    .select(`
      id,
      tieu_de,
      duong_dan,
      tom_tat,
      loai_noi_dung,
      noi_dung,
      trang_thai,
      ngay_dang,
      ngay_tao,
      ngay_cap_nhat,
      ngay_xoa,
      google_drive_anh_dai_dien_file_id,
      nguoi_dang_id,
      nguoi_dung (ten_hien_thi),
      de_muc (ten_de_muc),
      de_muc_con (ten_de_muc_con)
    `)
    .is("ngay_xoa", null)
    .order("ngay_cap_nhat", { ascending: false });

  if (quyen.vaiTro !== "quan_tri") {
    truyVan = truyVan.eq("nguoi_dang_id", quyen.userId);
  }

  if (["ban_nhap", "da_dang", "da_an"].includes(trangThai)) {
    truyVan = truyVan.eq("trang_thai", trangThai);
  }

  if (tuKhoa) {
    truyVan = truyVan.ilike("tieu_de", `%${tuKhoa}%`);
  }

  const { data, error } = await truyVan;
  if (error) {
    return NextResponse.json(
      { thanh_cong: false, loi: "Không thể tải danh sách bài viết.", chi_tiet: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ thanh_cong: true, du_lieu: data || [] });
}

export async function PATCH(yeuCau: Request) {
  const quyen = await layQuyenTruyCap();
  if (!quyen.hopLe || !quyen.userId) {
    return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  }

  let duLieu: {
    id?: string;
    tieu_de?: string;
    tom_tat?: string;
    noi_dung?: string;
    loai_noi_dung?: "trinh_soan_thao" | "html";
    trang_thai?: TrangThai;
  };

  try {
    duLieu = await yeuCau.json();
  } catch {
    return NextResponse.json(
      { thanh_cong: false, loi: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 }
    );
  }

  const id = String(duLieu.id || "").trim();
  if (!id) {
    return NextResponse.json({ thanh_cong: false, loi: "Thiếu ID bài viết." }, { status: 400 });
  }

  const supabaseQuanTri = taoSupabaseQuanTri();
  const { data: baiVietCu } = await supabaseQuanTri
    .from("bai_viet")
    .select("id, nguoi_dang_id, tieu_de, tom_tat, noi_dung, loai_noi_dung, trang_thai")
    .eq("id", id)
    .is("ngay_xoa", null)
    .maybeSingle();

  if (!baiVietCu) {
    return NextResponse.json({ thanh_cong: false, loi: "Không tìm thấy bài viết." }, { status: 404 });
  }

  if (quyen.vaiTro !== "quan_tri" && baiVietCu.nguoi_dang_id !== quyen.userId) {
    return NextResponse.json({ thanh_cong: false, loi: "Không có quyền sửa bài viết này." }, { status: 403 });
  }

  const capNhat: Record<string, unknown> = {
    ngay_cap_nhat: new Date().toISOString(),
  };

  if (typeof duLieu.tieu_de === "string") {
    const tieuDe = duLieu.tieu_de.trim();
    if (!tieuDe) {
      return NextResponse.json({ thanh_cong: false, loi: "Tiêu đề không được để trống." }, { status: 400 });
    }
    capNhat.tieu_de = tieuDe;
    if (tieuDe !== baiVietCu.tieu_de) {
      capNhat.duong_dan = `${taoDuongDan(tieuDe) || "bai-viet"}-${Date.now()}`;
    }
  }

  if (typeof duLieu.tom_tat === "string") capNhat.tom_tat = duLieu.tom_tat.trim() || null;
  if (typeof duLieu.noi_dung === "string") {
    if (!duLieu.noi_dung.trim()) {
      return NextResponse.json({ thanh_cong: false, loi: "Nội dung không được để trống." }, { status: 400 });
    }
    capNhat.noi_dung = duLieu.noi_dung.trim();
  }
  if (duLieu.loai_noi_dung) capNhat.loai_noi_dung = duLieu.loai_noi_dung;

  if (duLieu.trang_thai && ["ban_nhap", "da_dang", "da_an"].includes(duLieu.trang_thai)) {
    capNhat.trang_thai = duLieu.trang_thai;
    capNhat.ngay_dang = duLieu.trang_thai === "da_dang"
      ? new Date().toISOString()
      : baiVietCu.trang_thai === "da_dang"
        ? null
        : undefined;
  }

  const { data: baiVietMoi, error } = await supabaseQuanTri
    .from("bai_viet")
    .update(capNhat)
    .eq("id", id)
    .select("id, duong_dan, trang_thai")
    .single();

  if (error) {
    return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 400 });
  }

  await supabaseQuanTri.from("lich_su_quan_tri").insert({
    nguoi_thuc_hien_id: quyen.userId,
    hanh_dong: "cap_nhat_bai_viet",
    doi_tuong: "bai_viet",
    doi_tuong_id: id,
    du_lieu_cu: baiVietCu,
    du_lieu_moi: capNhat,
  });

  return NextResponse.json({
    thanh_cong: true,
    thong_bao: "Cập nhật bài viết thành công.",
    du_lieu: baiVietMoi,
  });
}

export async function DELETE(yeuCau: Request) {
  const quyen = await layQuyenTruyCap();
  if (!quyen.hopLe || !quyen.userId) {
    return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  }

  const id = new URL(yeuCau.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ thanh_cong: false, loi: "Thiếu ID bài viết." }, { status: 400 });
  }

  const supabaseQuanTri = taoSupabaseQuanTri();
  const { data: baiViet } = await supabaseQuanTri
    .from("bai_viet")
    .select("id, nguoi_dang_id, tieu_de, trang_thai")
    .eq("id", id)
    .is("ngay_xoa", null)
    .maybeSingle();

  if (!baiViet) {
    return NextResponse.json({ thanh_cong: false, loi: "Không tìm thấy bài viết." }, { status: 404 });
  }

  if (quyen.vaiTro !== "quan_tri" && baiViet.nguoi_dang_id !== quyen.userId) {
    return NextResponse.json({ thanh_cong: false, loi: "Không có quyền xóa bài viết này." }, { status: 403 });
  }

  const { error } = await supabaseQuanTri
    .from("bai_viet")
    .update({
      ngay_xoa: new Date().toISOString(),
      trang_thai: "da_an",
      ngay_cap_nhat: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 400 });
  }

  await supabaseQuanTri.from("lich_su_quan_tri").insert({
    nguoi_thuc_hien_id: quyen.userId,
    hanh_dong: "xoa_mem_bai_viet",
    doi_tuong: "bai_viet",
    doi_tuong_id: id,
    du_lieu_cu: baiViet,
    du_lieu_moi: { ngay_xoa: new Date().toISOString(), trang_thai: "da_an" },
  });

  return NextResponse.json({ thanh_cong: true, thong_bao: "Đã xóa bài viết." });
}

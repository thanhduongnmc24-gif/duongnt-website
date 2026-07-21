import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoGoogleDrive, layGoogleDriveFolderId } from "@/lib/google-drive/ket-noi";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

type VaiTro = "quan_tri" | "nguoi_dung";
type TrangThai = "ban_nhap" | "da_dang" | "da_an";

async function layQuyen() {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hopLe: false, loi: "Chưa đăng nhập.", userId: "", vaiTro: null as VaiTro | null };
  const { data } = await supabase.from("nguoi_dung")
    .select("vai_tro, dang_hoat_dong").eq("id", user.id).maybeSingle();
  if (!data?.dang_hoat_dong) return { hopLe: false, loi: "Tài khoản đang bị khóa.", userId: "", vaiTro: null as VaiTro | null };
  return { hopLe: true, loi: "", userId: user.id, vaiTro: data.vai_tro as VaiTro };
}

function coQuyen(vaiTro: VaiTro | null, userId: string, chuBaiId: string) {
  return vaiTro === "quan_tri" || userId === chuBaiId;
}

function duoiAnh(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function GET(yeuCau: Request) {
  const quyen = await layQuyen();
  if (!quyen.hopLe) return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  const url = new URL(yeuCau.url);
  const thungRac = url.searchParams.get("thung_rac") === "true";
  const trangThai = url.searchParams.get("trang_thai") || "tat_ca";
  const tuKhoa = (url.searchParams.get("tu_khoa") || "").trim();
  const supabase = taoSupabaseQuanTri();
  let q = supabase.from("bai_viet").select(`
    id,tieu_de,duong_dan,tom_tat,loai_noi_dung,noi_dung,trang_thai,
    ngay_dang,ngay_tao,ngay_cap_nhat,ngay_xoa,nguoi_dang_id,de_muc_id,de_muc_con_id,
    google_drive_anh_dai_dien_file_id,ten_tep_anh_dai_dien,kieu_tep_anh_dai_dien,
    nguoi_dung(ten_hien_thi),de_muc(ten_de_muc),de_muc_con(ten_de_muc_con)
  `).order("ngay_cap_nhat", { ascending: false });
  q = thungRac ? q.not("ngay_xoa", "is", null) : q.is("ngay_xoa", null);
  if (quyen.vaiTro !== "quan_tri") q = q.eq("nguoi_dang_id", quyen.userId);
  if (!thungRac && ["ban_nhap","da_dang","da_an"].includes(trangThai)) q = q.eq("trang_thai", trangThai);
  if (tuKhoa) q = q.ilike("tieu_de", `%${tuKhoa}%`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 500 });
  return NextResponse.json({ thanh_cong: true, du_lieu: data || [] });
}

export async function PATCH(yeuCau: Request) {
  const quyen = await layQuyen();
  if (!quyen.hopLe) return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  const form = await yeuCau.formData();
  const id = String(form.get("id") || "").trim();
  const hanhDong = String(form.get("hanh_dong") || "cap_nhat");
  if (!id) return NextResponse.json({ thanh_cong: false, loi: "Thiếu ID bài viết." }, { status: 400 });
  const supabase = taoSupabaseQuanTri();
  const { data: cu } = await supabase.from("bai_viet").select("*").eq("id", id).maybeSingle();
  if (!cu) return NextResponse.json({ thanh_cong: false, loi: "Không tìm thấy bài viết." }, { status: 404 });
  if (!coQuyen(quyen.vaiTro, quyen.userId, cu.nguoi_dang_id)) return NextResponse.json({ thanh_cong: false, loi: "Không có quyền sửa bài viết này." }, { status: 403 });

  if (hanhDong === "khoi_phuc") {
    const { error } = await supabase.from("bai_viet").update({ ngay_xoa: null, trang_thai: "ban_nhap", ngay_cap_nhat: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 400 });
    return NextResponse.json({ thanh_cong: true, thong_bao: "Khôi phục bài viết thành công." });
  }

  const tieuDe = String(form.get("tieu_de") || "").trim();
  const noiDung = String(form.get("noi_dung") || "").trim();
  const deMucId = String(form.get("de_muc_id") || "").trim();
  const deMucConId = String(form.get("de_muc_con_id") || "").trim();
  const trangThai = String(form.get("trang_thai") || cu.trang_thai) as TrangThai;
  if (!tieuDe || !noiDung || !deMucId || !deMucConId) return NextResponse.json({ thanh_cong: false, loi: "Tiêu đề, nội dung và đề mục không được để trống." }, { status: 400 });
  const { data: deMucCon } = await supabase.from("de_muc_con").select("id").eq("id", deMucConId).eq("de_muc_id", deMucId).maybeSingle();
  if (!deMucCon) return NextResponse.json({ thanh_cong: false, loi: "Đề mục cấp 2 không thuộc đề mục cấp 1." }, { status: 400 });

  let fileId = cu.google_drive_anh_dai_dien_file_id as string | null;
  let tenTep = cu.ten_tep_anh_dai_dien as string | null;
  let mime = cu.kieu_tep_anh_dai_dien as string | null;
  let fileMoi: string | null = null;
  const anh = form.get("anh_dai_dien");
  try {
    if (anh instanceof File && anh.size > 0) {
      if (!["image/jpeg","image/png","image/webp"].includes(anh.type) || anh.size > 10 * 1024 * 1024) {
        return NextResponse.json({ thanh_cong: false, loi: "Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 10 MB." }, { status: 400 });
      }
      const drive = taoGoogleDrive();
      tenTep = `anh-dai-dien__${taoDuongDan(tieuDe)}-${Date.now()}.${duoiAnh(anh.type)}`;
      const { data } = await drive.files.create({
        requestBody: { name: tenTep, parents: [layGoogleDriveFolderId()] },
        media: { mimeType: anh.type, body: Readable.from(Buffer.from(await anh.arrayBuffer())) },
        fields: "id",
      });
      fileMoi = data.id || null;
      if (!fileMoi) throw new Error("Google Drive không trả về File ID.");
      fileId = fileMoi;
      mime = anh.type;
    }

    const duongDan = tieuDe === cu.tieu_de ? cu.duong_dan : `${taoDuongDan(tieuDe) || "bai-viet"}-${Date.now()}`;
    const capNhat = {
      tieu_de: tieuDe,
      duong_dan: duongDan,
      tom_tat: String(form.get("tom_tat") || "").trim() || null,
      noi_dung: noiDung,
      loai_noi_dung: form.get("loai_noi_dung") === "html" ? "html" : "trinh_soan_thao",
      de_muc_id: deMucId,
      de_muc_con_id: deMucConId,
      trang_thai: ["ban_nhap","da_dang","da_an"].includes(trangThai) ? trangThai : "ban_nhap",
      ngay_dang: trangThai === "da_dang" ? (cu.ngay_dang || new Date().toISOString()) : null,
      google_drive_anh_dai_dien_file_id: fileId,
      ten_tep_anh_dai_dien: tenTep,
      kieu_tep_anh_dai_dien: mime,
      ngay_cap_nhat: new Date().toISOString(),
    };
    const { data: moi, error } = await supabase.from("bai_viet").update(capNhat).eq("id", id).select("id,duong_dan,trang_thai").single();
    if (error) throw error;
    if (fileMoi && cu.google_drive_anh_dai_dien_file_id) await taoGoogleDrive().files.delete({ fileId: cu.google_drive_anh_dai_dien_file_id }).catch(() => undefined);
    await supabase.from("lich_su_quan_tri").insert({ nguoi_thuc_hien_id: quyen.userId, hanh_dong: "cap_nhat_bai_viet", doi_tuong: "bai_viet", doi_tuong_id: id, du_lieu_cu: cu, du_lieu_moi: capNhat });
    return NextResponse.json({ thanh_cong: true, thong_bao: "Cập nhật bài viết thành công.", du_lieu: moi });
  } catch (loi) {
    if (fileMoi) await taoGoogleDrive().files.delete({ fileId: fileMoi }).catch(() => undefined);
    return NextResponse.json({ thanh_cong: false, loi: loi instanceof Error ? loi.message : "Không thể cập nhật bài viết." }, { status: 400 });
  }
}

export async function DELETE(yeuCau: Request) {
  const quyen = await layQuyen();
  if (!quyen.hopLe) return NextResponse.json({ thanh_cong: false, loi: quyen.loi }, { status: 403 });
  const url = new URL(yeuCau.url);
  const id = url.searchParams.get("id") || "";
  const vinhVien = url.searchParams.get("vinh_vien") === "true";
  const supabase = taoSupabaseQuanTri();
  const { data: bai } = await supabase.from("bai_viet").select("*").eq("id", id).maybeSingle();
  if (!bai) return NextResponse.json({ thanh_cong: false, loi: "Không tìm thấy bài viết." }, { status: 404 });
  if (!coQuyen(quyen.vaiTro, quyen.userId, bai.nguoi_dang_id)) return NextResponse.json({ thanh_cong: false, loi: "Không có quyền xóa bài viết này." }, { status: 403 });
  if (vinhVien) {
    if (!bai.ngay_xoa) return NextResponse.json({ thanh_cong: false, loi: "Phải xóa mềm trước khi xóa vĩnh viễn." }, { status: 400 });
    const { error } = await supabase.from("bai_viet").delete().eq("id", id);
    if (error) return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 400 });
    if (bai.google_drive_anh_dai_dien_file_id) await taoGoogleDrive().files.delete({ fileId: bai.google_drive_anh_dai_dien_file_id }).catch(() => undefined);
    return NextResponse.json({ thanh_cong: true, thong_bao: "Đã xóa vĩnh viễn bài viết và ảnh đại diện." });
  }
  const { error } = await supabase.from("bai_viet").update({ ngay_xoa: new Date().toISOString(), trang_thai: "da_an", ngay_cap_nhat: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ thanh_cong: false, loi: error.message }, { status: 400 });
  return NextResponse.json({ thanh_cong: true, thong_bao: "Đã chuyển bài viết vào thùng rác." });
}

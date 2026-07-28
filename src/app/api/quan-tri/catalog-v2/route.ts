import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

async function layQuyen() {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("nguoi_dung").select("vai_tro,dang_hoat_dong").eq("id", user.id).maybeSingle();
  return data?.dang_hoat_dong ? { userId: user.id, vaiTro: data.vai_tro as string } : null;
}

async function coQuyenCatalog(id: string, quyen: { userId: string; vaiTro: string }) {
  const db = taoSupabaseQuanTri();
  const { data } = await db.from("catalog").select("id,nguoi_tao_id,google_drive_folder_id").eq("id", id).maybeSingle();
  return data && (quyen.vaiTro === "quan_tri" || data.nguoi_tao_id === quyen.userId) ? data : null;
}

export async function GET(request: Request) {
  const quyen = await layQuyen();
  if (!quyen) return NextResponse.json({ thanh_cong:false, loi:"Chưa đăng nhập." }, { status:401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ thanh_cong:false, loi:"Thiếu Catalog ID." }, { status:400 });
  const catalogQuyen = await coQuyenCatalog(id, quyen);
  if (!catalogQuyen) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền." }, { status:403 });
  const db = taoSupabaseQuanTri();
  const [{ data: catalog }, { data: cot }, { data: thietBi }] = await Promise.all([
    db.from("catalog").select("*").eq("id", id).single(),
    db.from("catalog_cot").select("*").eq("catalog_id", id).order("thu_tu"),
    db.from("catalog_thiet_bi").select("*,catalog_gia_tri(cot_id,gia_tri)").eq("catalog_id", id).is("ngay_xoa", null).order("thu_tu"),
  ]);
  return NextResponse.json({ thanh_cong:true, du_lieu:{ catalog, cot:cot || [], thiet_bi:thietBi || [] } });
}

export async function PATCH(request: Request) {
  const quyen = await layQuyen();
  if (!quyen) return NextResponse.json({ thanh_cong:false, loi:"Chưa đăng nhập." }, { status:401 });
  const contentType = request.headers.get("content-type") || "";
  const db = taoSupabaseQuanTri();

  if (contentType.includes("application/json")) {
    const body = await request.json();
    const catalog = await coQuyenCatalog(String(body.catalog_id || body.id || ""), quyen);
    if (!catalog) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền." }, { status:403 });

    if (body.loai === "catalog") {
      const { error } = await db.from("catalog").update({
        tieu_de: String(body.ten_hien_thi || "").trim(),
        duong_dan: taoDuongDan(String(body.ten_hien_thi || "")) || `catalog-${Date.now()}`,
        de_muc_id: body.de_muc_id,
        ngay_cap_nhat: new Date().toISOString(),
      }).eq("id", body.id);
      return NextResponse.json(error ? { thanh_cong:false, loi:error.message } : { thanh_cong:true }, { status:error ? 400 : 200 });
    }

    if (body.loai === "cot") {
      const { error } = await db.from("catalog_cot").update({
        ten_cot: String(body.ten_cot || "").trim(),
        do_rong: Math.max(60, Math.min(1000, Number(body.do_rong) || 180)),
        thu_tu: Number(body.thu_tu) || 0,
        cho_tim_kiem: Boolean(body.cho_tim_kiem),
        hien_trong_danh_sach: Boolean(body.hien_trong_danh_sach),
        hien_trong_chi_tiet: Boolean(body.hien_trong_chi_tiet),
      }).eq("id", body.id).eq("catalog_id", body.catalog_id);
      return NextResponse.json(error ? { thanh_cong:false, loi:error.message } : { thanh_cong:true }, { status:error ? 400 : 200 });
    }
  }

  const form = await request.formData();
  const catalogId = String(form.get("catalog_id") || "");
  const itemId = String(form.get("id") || "");
  const catalog = await coQuyenCatalog(catalogId, quyen);
  if (!catalog) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền." }, { status:403 });
  const { data: old } = await db.from("catalog_thiet_bi").select("*").eq("id", itemId).eq("catalog_id", catalogId).single();
  if (!old) return NextResponse.json({ thanh_cong:false, loi:"Không tìm thấy thiết bị." }, { status:404 });

  let fileId = old.google_drive_anh_file_id as string | null;
  let newFile: string | null = null;
  let fileName = old.ten_tep_anh as string | null;
  let mime = old.kieu_tep_anh as string | null;
  const image = form.get("anh");
  try {
    if (image instanceof File && image.size > 0) {
      if (!["image/jpeg","image/png","image/webp"].includes(image.type) || image.size > 10 * 1024 * 1024) throw new Error("Ảnh phải là JPG, PNG hoặc WebP, tối đa 10 MB.");
      fileName = `${taoDuongDan(String(form.get("ten_thiet_bi") || "thiet-bi"))}-${Date.now()}.${image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg"}`;
      const upload = await taoGoogleDrive().files.create({
        requestBody: { name:fileName, parents:[catalog.google_drive_folder_id] },
        media: { mimeType:image.type, body:Readable.from(Buffer.from(await image.arrayBuffer())) }, fields:"id",
      });
      newFile = upload.data.id || null;
      if (!newFile) throw new Error("Không thể tải ảnh lên Google Drive.");
      fileId = newFile; mime = image.type;
    }
    const ten = String(form.get("ten_thiet_bi") || "").trim();
    const { error } = await db.from("catalog_thiet_bi").update({ ten_thiet_bi:ten, google_drive_anh_file_id:fileId, ten_tep_anh:fileName, kieu_tep_anh:mime, ngay_cap_nhat:new Date().toISOString() }).eq("id", itemId);
    if (error) throw error;
    const values = JSON.parse(String(form.get("gia_tri") || "{}"));
    for (const [cotId, giaTri] of Object.entries(values)) {
      await db.from("catalog_gia_tri").upsert({ thiet_bi_id:itemId, cot_id:cotId, gia_tri:String(giaTri ?? ""), ngay_cap_nhat:new Date().toISOString() }, { onConflict:"thiet_bi_id,cot_id" });
    }
    if (newFile && old.google_drive_anh_file_id) await taoGoogleDrive().files.delete({ fileId:old.google_drive_anh_file_id }).catch(() => undefined);
    return NextResponse.json({ thanh_cong:true });
  } catch (error) {
    if (newFile) await taoGoogleDrive().files.delete({ fileId:newFile }).catch(() => undefined);
    return NextResponse.json({ thanh_cong:false, loi:error instanceof Error ? error.message : "Không thể cập nhật thiết bị." }, { status:400 });
  }
}

export async function DELETE(request: Request) {
  const quyen = await layQuyen();
  if (!quyen) return NextResponse.json({ thanh_cong:false, loi:"Chưa đăng nhập." }, { status:401 });
  const url = new URL(request.url); const loai = url.searchParams.get("loai"); const id = url.searchParams.get("id") || ""; const catalogId = url.searchParams.get("catalog_id") || "";
  const catalog = await coQuyenCatalog(catalogId, quyen);
  if (!catalog) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền." }, { status:403 });
  const db = taoSupabaseQuanTri();
  if (loai === "cot") {
    const { error } = await db.from("catalog_cot").delete().eq("id", id).eq("catalog_id", catalogId);
    return NextResponse.json(error ? { thanh_cong:false, loi:error.message } : { thanh_cong:true }, { status:error ? 400 : 200 });
  }
  const { data:item } = await db.from("catalog_thiet_bi").select("google_drive_anh_file_id").eq("id", id).eq("catalog_id", catalogId).maybeSingle();
  const { error } = await db.from("catalog_thiet_bi").delete().eq("id", id).eq("catalog_id", catalogId);
  if (!error && item?.google_drive_anh_file_id) await taoGoogleDrive().files.delete({ fileId:item.google_drive_anh_file_id }).catch(() => undefined);
  return NextResponse.json(error ? { thanh_cong:false, loi:error.message } : { thanh_cong:true }, { status:error ? 400 : 200 });
}

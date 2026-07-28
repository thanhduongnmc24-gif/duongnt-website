import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";
import { timHoacTaoThuMucConCatalog } from "@/lib/google-drive/catalog";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

async function quyen() {
  const s = await taoSupabaseMayChu();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data } = await s.from("nguoi_dung").select("vai_tro,dang_hoat_dong").eq("id", user.id).maybeSingle();
  return data?.dang_hoat_dong ? { user, vaiTro: data.vai_tro as string } : null;
}

function duoiAnh(mime: string) { return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"; }

export async function GET(req: Request) {
  const qn = await quyen();
  if (!qn) return NextResponse.json({ thanh_cong:false, loi:"Chưa đăng nhập." }, { status:401 });
  const url = new URL(req.url); const id = url.searchParams.get("id");
  const db = taoSupabaseQuanTri();
  if (!id) {
    let q = db.from("catalog").select("id,tieu_de,duong_dan,trang_thai,ngay_cap_nhat,nguoi_tao_id,de_muc_id,de_muc_con_id").is("ngay_xoa",null).order("ngay_cap_nhat",{ascending:false});
    if (qn.vaiTro !== "quan_tri") q = q.eq("nguoi_tao_id", qn.user.id);
    const { data,error }=await q; return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true,du_lieu:data||[]},{status:error?400:200});
  }
  const { data: catalog,error }=await db.from("catalog").select("*").eq("id",id).maybeSingle();
  if(error||!catalog) return NextResponse.json({thanh_cong:false,loi:error?.message||"Không tìm thấy Catalog."},{status:404});
  if(qn.vaiTro!=="quan_tri"&&catalog.nguoi_tao_id!==qn.user.id) return NextResponse.json({thanh_cong:false,loi:"Không có quyền."},{status:403});
  const [{data:cot},{data:thietBi}] = await Promise.all([
    db.from("catalog_cot").select("*").eq("catalog_id",id).order("thu_tu"),
    db.from("catalog_thiet_bi").select("*,catalog_gia_tri(cot_id,gia_tri)").eq("catalog_id",id).is("ngay_xoa",null).order("thu_tu")
  ]);
  return NextResponse.json({thanh_cong:true,du_lieu:{catalog,cot:cot||[],thiet_bi:thietBi||[]}});
}

export async function POST(req: Request) {
  const qn=await quyen(); if(!qn) return NextResponse.json({thanh_cong:false,loi:"Chưa đăng nhập."},{status:401});
  const ct=req.headers.get("content-type")||""; const db=taoSupabaseQuanTri();
  if(ct.includes("application/json")) {
    const b=await req.json();
    if(b.hanh_dong==="tao_catalog") {
      const t=String(b.tieu_de||"").trim(); if(!t) return NextResponse.json({thanh_cong:false,loi:"Thiếu tiêu đề."},{status:400});
      const folder=await timHoacTaoThuMucConCatalog(`${taoDuongDan(t)||"catalog"}-${Date.now()}`);
      const {data,error}=await db.from("catalog").insert({tieu_de:t,duong_dan:`${taoDuongDan(t)||"catalog"}-${Date.now()}`,tom_tat:String(b.tom_tat||"").trim()||null,de_muc_id:b.de_muc_id,de_muc_con_id:b.de_muc_con_id,nguoi_tao_id:qn.user.id,trang_thai:b.trang_thai||"ban_nhap",ngay_dang:b.trang_thai==="da_dang"?new Date().toISOString():null,google_drive_folder_id:folder}).select().single();
      return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true,du_lieu:data},{status:error?400:200});
    }
    if(b.hanh_dong==="them_cot") {
      const ma=`${taoDuongDan(String(b.ten_cot||"cot"))||"cot"}-${Date.now()}`;
      const {data,error}=await db.from("catalog_cot").insert({catalog_id:b.catalog_id,ten_cot:b.ten_cot,ma_cot:ma,loai_du_lieu:b.loai_du_lieu||"van_ban_ngan",do_rong:Number(b.do_rong)||180,thu_tu:Number(b.thu_tu)||0,bat_buoc:Boolean(b.bat_buoc),cho_tim_kiem:b.cho_tim_kiem!==false,hien_trong_danh_sach:b.hien_trong_danh_sach!==false,hien_trong_chi_tiet:b.hien_trong_chi_tiet!==false}).select().single();
      return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true,du_lieu:data},{status:error?400:200});
    }
  }
  const f=await req.formData(); const catalogId=String(f.get("catalog_id")||""); const ten=String(f.get("ten_thiet_bi")||"").trim();
  if(!catalogId||!ten) return NextResponse.json({thanh_cong:false,loi:"Thiếu Catalog hoặc tên thiết bị."},{status:400});
  const {data:catalog}=await db.from("catalog").select("google_drive_folder_id,nguoi_tao_id").eq("id",catalogId).maybeSingle();
  if(!catalog||(qn.vaiTro!=="quan_tri"&&catalog.nguoi_tao_id!==qn.user.id)) return NextResponse.json({thanh_cong:false,loi:"Không có quyền."},{status:403});
  let fileId:null|string=null, tenTep:null|string=null, mime:null|string=null; const image=f.get("anh");
  try {
    if(image instanceof File&&image.size>0){if(!["image/jpeg","image/png","image/webp"].includes(image.type)||image.size>10*1024*1024)return NextResponse.json({thanh_cong:false,loi:"Ảnh phải là JPG, PNG, WebP và tối đa 10 MB."},{status:400}); const drive=taoGoogleDrive(); tenTep=`${taoDuongDan(ten)||"thiet-bi"}-${Date.now()}.${duoiAnh(image.type)}`; const uploaded=await drive.files.create({requestBody:{name:tenTep,parents:[catalog.google_drive_folder_id]},media:{mimeType:image.type,body:Readable.from(Buffer.from(await image.arrayBuffer()))},fields:"id"}); fileId=uploaded.data.id||null; mime=image.type;}
    const {data:item,error}=await db.from("catalog_thiet_bi").insert({catalog_id:catalogId,ten_thiet_bi:ten,duong_dan:`${taoDuongDan(ten)||"thiet-bi"}-${Date.now()}`,google_drive_anh_file_id:fileId,ten_tep_anh:tenTep,kieu_tep_anh:mime,thu_tu:Number(f.get("thu_tu"))||0}).select().single(); if(error) throw error;
    const values=JSON.parse(String(f.get("gia_tri")||"{}")); const rows=Object.entries(values).filter(([,v])=>String(v??"").trim()).map(([cot_id,gia_tri])=>({thiet_bi_id:item.id,cot_id,gia_tri:String(gia_tri)})); if(rows.length) await db.from("catalog_gia_tri").insert(rows);
    return NextResponse.json({thanh_cong:true,du_lieu:item});
  }catch(e){if(fileId) await taoGoogleDrive().files.delete({fileId}).catch(()=>undefined); return NextResponse.json({thanh_cong:false,loi:e instanceof Error?e.message:"Không thể thêm thiết bị."},{status:400});}
}

export async function PATCH(req: Request) {
  const qn=await quyen(); if(!qn) return NextResponse.json({thanh_cong:false,loi:"Chưa đăng nhập."},{status:401});
  const b=await req.json(); const db=taoSupabaseQuanTri();
  if(b.loai==="catalog_vi_tri") {
    const { error } = await db.from("catalog").update({ de_muc_id:b.de_muc_id, de_muc_con_id:b.de_muc_con_id||null, ngay_cap_nhat:new Date().toISOString() }).eq("id",b.id);
    return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200});
  }
  if(b.loai==="do_rong_cot") {
    const rows=(b.danh_sach||[]).filter((x:any)=>x.id!=="anh"&&x.id!=="ten_thiet_bi");
    for(const row of rows){const width=Math.max(60,Math.min(1000,Number(row.do_rong)||180));const {error}=await db.from("catalog_cot").update({do_rong:width}).eq("id",row.id).eq("catalog_id",b.catalog_id);if(error)return NextResponse.json({thanh_cong:false,loi:error.message},{status:400});}
    return NextResponse.json({thanh_cong:true});
  }
  if(b.loai==="catalog") { const patch={tieu_de:b.tieu_de,tom_tat:b.tom_tat||null,de_muc_id:b.de_muc_id,de_muc_con_id:b.de_muc_con_id,trang_thai:b.trang_thai,ngay_dang:b.trang_thai==="da_dang"?new Date().toISOString():null,ngay_cap_nhat:new Date().toISOString()}; const {error}=await db.from("catalog").update(patch).eq("id",b.id); return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200}); }
  if(b.loai==="cot") { const {error}=await db.from("catalog_cot").update({ten_cot:b.ten_cot,loai_du_lieu:b.loai_du_lieu,do_rong:Number(b.do_rong),thu_tu:Number(b.thu_tu),bat_buoc:Boolean(b.bat_buoc),cho_tim_kiem:Boolean(b.cho_tim_kiem),hien_trong_danh_sach:Boolean(b.hien_trong_danh_sach),hien_trong_chi_tiet:Boolean(b.hien_trong_chi_tiet)}).eq("id",b.id); return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200}); }
  return NextResponse.json({thanh_cong:false,loi:"Hành động không hợp lệ."},{status:400});
}

export async function DELETE(req: Request) {
  const qn=await quyen(); if(!qn) return NextResponse.json({thanh_cong:false,loi:"Chưa đăng nhập."},{status:401});
  const u=new URL(req.url), loai=u.searchParams.get("loai"), id=u.searchParams.get("id"); const db=taoSupabaseQuanTri(); if(!id) return NextResponse.json({thanh_cong:false,loi:"Thiếu ID."},{status:400});
  if(loai==="cot"){const{error}=await db.from("catalog_cot").delete().eq("id",id);return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200});}
  if(loai==="thiet_bi"){const{data:item}=await db.from("catalog_thiet_bi").select("google_drive_anh_file_id").eq("id",id).maybeSingle();const{error}=await db.from("catalog_thiet_bi").update({ngay_xoa:new Date().toISOString()}).eq("id",id);if(!error&&item?.google_drive_anh_file_id)await taoGoogleDrive().files.delete({fileId:item.google_drive_anh_file_id}).catch(()=>undefined);return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200});}
  const{error}=await db.from("catalog").update({ngay_xoa:new Date().toISOString(),trang_thai:"da_an"}).eq("id",id);return NextResponse.json(error?{thanh_cong:false,loi:error.message}:{thanh_cong:true},{status:error?400:200});
}

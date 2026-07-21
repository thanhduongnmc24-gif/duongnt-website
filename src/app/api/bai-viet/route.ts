import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import {
  taoGoogleDrive,
  layGoogleDriveFolderId,
} from "@/lib/google-drive/ket-noi";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

const KIEU_ANH_HOP_LE = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const DUNG_LUONG_TOI_DA = 10 * 1024 * 1024;

function layDuoiTep(kieuTep: string) {
  if (kieuTep === "image/png") return "png";
  if (kieuTep === "image/webp") return "webp";
  return "jpg";
}

export async function POST(yeuCau: Request) {
  let googleDriveFileId: string | null = null;

  try {
    const supabase = await taoSupabaseMayChu();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: nguoiDung } = await supabase
      .from("nguoi_dung")
      .select("id, dang_hoat_dong")
      .eq("id", user.id)
      .maybeSingle();

    if (!nguoiDung?.dang_hoat_dong) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Tài khoản đang bị khóa." },
        { status: 403 }
      );
    }

    const formData = await yeuCau.formData();
    const tieuDe = String(formData.get("tieu_de") ?? "").trim();
    const tomTat = String(formData.get("tom_tat") ?? "").trim();
    const deMucId = String(formData.get("de_muc_id") ?? "").trim();
    const deMucConId = String(formData.get("de_muc_con_id") ?? "").trim();
    const loaiNoiDung =
      formData.get("loai_noi_dung") === "html"
        ? "html"
        : "trinh_soan_thao";
    const noiDung = String(formData.get("noi_dung") ?? "").trim();
    const trangThai =
      formData.get("trang_thai") === "ban_nhap"
        ? "ban_nhap"
        : "da_dang";
    const anhDaiDien = formData.get("anh_dai_dien");

    if (!tieuDe) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Tiêu đề không được để trống." },
        { status: 400 }
      );
    }

    if (!deMucId || !deMucConId) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Phải chọn đề mục cấp 1 và cấp 2." },
        { status: 400 }
      );
    }

    if (!noiDung) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Nội dung bài viết không được để trống." },
        { status: 400 }
      );
    }

    const supabaseQuanTri = taoSupabaseQuanTri();

    const { data: deMucCon } = await supabaseQuanTri
      .from("de_muc_con")
      .select("id, de_muc_id")
      .eq("id", deMucConId)
      .eq("de_muc_id", deMucId)
      .maybeSingle();

    if (!deMucCon) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Đề mục cấp 2 không thuộc đề mục cấp 1 đã chọn." },
        { status: 400 }
      );
    }

    const duongDanGoc = taoDuongDan(tieuDe) || "bai-viet";
    const duongDan = `${duongDanGoc}-${Date.now()}`;
    let tenTepAnh: string | null = null;
    let kieuTepAnh: string | null = null;

    if (anhDaiDien instanceof File && anhDaiDien.size > 0) {
      if (!KIEU_ANH_HOP_LE.includes(anhDaiDien.type)) {
        return NextResponse.json(
          { thanh_cong: false, loi: "Ảnh phải có định dạng JPG, PNG hoặc WebP." },
          { status: 400 }
        );
      }

      if (anhDaiDien.size > DUNG_LUONG_TOI_DA) {
        return NextResponse.json(
          { thanh_cong: false, loi: "Ảnh đại diện không được vượt quá 10 MB." },
          { status: 400 }
        );
      }

      const drive = taoGoogleDrive();
      const folderId = layGoogleDriveFolderId();
      const duoiTep = layDuoiTep(anhDaiDien.type);
      tenTepAnh = `anh-dai-dien__${duongDan}.${duoiTep}`;
      kieuTepAnh = anhDaiDien.type;

      const buffer = Buffer.from(await anhDaiDien.arrayBuffer());
      const { data: tepDaTai } = await drive.files.create({
        requestBody: {
          name: tenTepAnh,
          parents: [folderId],
        },
        media: {
          mimeType: anhDaiDien.type,
          body: Readable.from(buffer),
        },
        fields: "id,name,mimeType",
      });

      googleDriveFileId = tepDaTai.id ?? null;

      if (!googleDriveFileId) {
        throw new Error("Google Drive không trả về File ID của ảnh.");
      }
    }

    const ngayDang =
      trangThai === "da_dang"
        ? new Date().toISOString()
        : null;

    const { data: baiViet, error: loiTaoBai } = await supabaseQuanTri
      .from("bai_viet")
      .insert({
        nguoi_dang_id: user.id,
        de_muc_id: deMucId,
        de_muc_con_id: deMucConId,
        tieu_de: tieuDe,
        duong_dan: duongDan,
        tom_tat: tomTat || null,
        loai_noi_dung: loaiNoiDung,
        noi_dung: noiDung,
        google_drive_anh_dai_dien_file_id: googleDriveFileId,
        ten_tep_anh_dai_dien: tenTepAnh,
        kieu_tep_anh_dai_dien: kieuTepAnh,
        trang_thai: trangThai,
        ngay_dang: ngayDang,
      })
      .select("id, duong_dan, trang_thai")
      .single();

    if (loiTaoBai || !baiViet) {
      if (googleDriveFileId) {
        const drive = taoGoogleDrive();
        await drive.files.delete({ fileId: googleDriveFileId }).catch(() => undefined);
      }

      return NextResponse.json(
        {
          thanh_cong: false,
          loi: loiTaoBai?.message || "Không thể lưu bài viết.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        thanh_cong: true,
        thong_bao:
          trangThai === "da_dang"
            ? "Đăng bài thành công."
            : "Lưu bản nháp thành công.",
        du_lieu: baiViet,
      },
      { status: 201 }
    );
  } catch (loi) {
    if (googleDriveFileId) {
      const drive = taoGoogleDrive();
      await drive.files.delete({ fileId: googleDriveFileId }).catch(() => undefined);
    }

    return NextResponse.json(
      {
        thanh_cong: false,
        loi: loi instanceof Error ? loi.message : "Không thể đăng bài.",
      },
      { status: 500 }
    );
  }
}

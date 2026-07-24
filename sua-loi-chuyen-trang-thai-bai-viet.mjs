import fs from "node:fs";

const file = "src/app/api/quan-tri/bai-viet/route.ts";

if (!fs.existsSync(file)) {
  console.error("Khong tim thay API quan ly bai viet.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-${stamp}`);

let source = fs.readFileSync(file, "utf8");
const start = source.indexOf("export async function PATCH");
const end = source.indexOf("export async function DELETE", start);

if (start < 0 || end < 0) {
  console.error("Khong tim thay ham PATCH hoac DELETE.");
  process.exit(1);
}

const patchFunction = `export async function PATCH(yeuCau: Request) {
  const quyen = await layQuyen();

  if (!quyen.hopLe) {
    return NextResponse.json(
      { thanh_cong: false, loi: quyen.loi },
      { status: 403 }
    );
  }

  let duLieu: Record<string, unknown> = {};
  let form: FormData | null = null;
  const contentType = yeuCau.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      duLieu = await yeuCau.json();
    } else {
      form = await yeuCau.formData();
      form.forEach((giaTri, khoa) => {
        duLieu[khoa] = giaTri;
      });
    }
  } catch {
    return NextResponse.json(
      { thanh_cong: false, loi: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 }
    );
  }

  const id = String(duLieu.id || "").trim();
  const hanhDong = String(duLieu.hanh_dong || "cap_nhat");

  if (!id) {
    return NextResponse.json(
      { thanh_cong: false, loi: "Thiếu ID bài viết." },
      { status: 400 }
    );
  }

  const supabase = taoSupabaseQuanTri();
  const { data: cu } = await supabase
    .from("bai_viet")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!cu) {
    return NextResponse.json(
      { thanh_cong: false, loi: "Không tìm thấy bài viết." },
      { status: 404 }
    );
  }

  if (!coQuyen(quyen.vaiTro, quyen.userId, cu.nguoi_dang_id)) {
    return NextResponse.json(
      { thanh_cong: false, loi: "Không có quyền sửa bài viết này." },
      { status: 403 }
    );
  }

  if (hanhDong === "khoi_phuc") {
    const { error } = await supabase
      .from("bai_viet")
      .update({
        ngay_xoa: null,
        trang_thai: "ban_nhap",
        ngay_cap_nhat: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { thanh_cong: false, loi: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      thanh_cong: true,
      thong_bao: "Khôi phục bài viết thành công.",
    });
  }

  const chiDoiTrangThai =
    typeof duLieu.trang_thai === "string" &&
    !duLieu.tieu_de &&
    !duLieu.noi_dung;

  if (chiDoiTrangThai) {
    const trangThai = String(duLieu.trang_thai);

    if (!["ban_nhap", "da_dang", "da_an"].includes(trangThai)) {
      return NextResponse.json(
        { thanh_cong: false, loi: "Trạng thái bài viết không hợp lệ." },
        { status: 400 }
      );
    }

    const { data: moi, error } = await supabase
      .from("bai_viet")
      .update({
        trang_thai: trangThai,
        ngay_dang:
          trangThai === "da_dang"
            ? cu.ngay_dang || new Date().toISOString()
            : null,
        ngay_cap_nhat: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, duong_dan, trang_thai, ngay_dang")
      .single();

    if (error) {
      return NextResponse.json(
        { thanh_cong: false, loi: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      thanh_cong: true,
      thong_bao:
        trangThai === "da_dang"
          ? "Đăng bài viết thành công."
          : trangThai === "da_an"
            ? "Ẩn bài viết thành công."
            : "Chuyển bài viết về bản nháp thành công.",
      du_lieu: moi,
    });
  }

  const tieuDe = String(duLieu.tieu_de ?? cu.tieu_de).trim();
  const noiDung = String(duLieu.noi_dung ?? cu.noi_dung).trim();
  const deMucId = String(duLieu.de_muc_id ?? cu.de_muc_id).trim();
  const deMucConId = String(
    duLieu.de_muc_con_id ?? cu.de_muc_con_id
  ).trim();
  const trangThai = String(
    duLieu.trang_thai ?? cu.trang_thai
  );

  if (!tieuDe || !noiDung || !deMucId || !deMucConId) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Tiêu đề, nội dung và đề mục không được để trống.",
      },
      { status: 400 }
    );
  }

  const { data: deMucCon } = await supabase
    .from("de_muc_con")
    .select("id")
    .eq("id", deMucConId)
    .eq("de_muc_id", deMucId)
    .maybeSingle();

  if (!deMucCon) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Đề mục cấp 2 không thuộc đề mục cấp 1.",
      },
      { status: 400 }
    );
  }

  let fileId = cu.google_drive_anh_dai_dien_file_id as string | null;
  let tenTep = cu.ten_tep_anh_dai_dien as string | null;
  let mime = cu.kieu_tep_anh_dai_dien as string | null;
  let fileMoi: string | null = null;
  const anh = form?.get("anh_dai_dien");

  try {
    if (anh instanceof File && anh.size > 0) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(anh.type) ||
        anh.size > 10 * 1024 * 1024
      ) {
        return NextResponse.json(
          {
            thanh_cong: false,
            loi: "Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 10 MB.",
          },
          { status: 400 }
        );
      }

      const drive = taoGoogleDrive();
      tenTep = \`anh-dai-dien__\${taoDuongDan(tieuDe)}-\${Date.now()}.\${duoiAnh(anh.type)}\`;

      const { data } = await drive.files.create({
        requestBody: {
          name: tenTep,
          parents: [layGoogleDriveFolderId()],
        },
        media: {
          mimeType: anh.type,
          body: Readable.from(
            Buffer.from(await anh.arrayBuffer())
          ),
        },
        fields: "id",
      });

      fileMoi = data.id || null;

      if (!fileMoi) {
        throw new Error("Google Drive không trả về File ID.");
      }

      fileId = fileMoi;
      mime = anh.type;
    }

    const duongDan =
      tieuDe === cu.tieu_de
        ? cu.duong_dan
        : \`\${taoDuongDan(tieuDe) || "bai-viet"}-\${Date.now()}\`;

    const capNhat = {
      tieu_de: tieuDe,
      duong_dan: duongDan,
      tom_tat:
        String(duLieu.tom_tat ?? cu.tom_tat ?? "").trim() || null,
      noi_dung: noiDung,
      loai_noi_dung:
        duLieu.loai_noi_dung === "html"
          ? "html"
          : cu.loai_noi_dung === "html" && !duLieu.loai_noi_dung
            ? "html"
            : "trinh_soan_thao",
      de_muc_id: deMucId,
      de_muc_con_id: deMucConId,
      trang_thai: ["ban_nhap", "da_dang", "da_an"].includes(
        trangThai
      )
        ? trangThai
        : "ban_nhap",
      ngay_dang:
        trangThai === "da_dang"
          ? cu.ngay_dang || new Date().toISOString()
          : null,
      google_drive_anh_dai_dien_file_id: fileId,
      ten_tep_anh_dai_dien: tenTep,
      kieu_tep_anh_dai_dien: mime,
      ngay_cap_nhat: new Date().toISOString(),
    };

    const { data: moi, error } = await supabase
      .from("bai_viet")
      .update(capNhat)
      .eq("id", id)
      .select("id, duong_dan, trang_thai")
      .single();

    if (error) {
      throw error;
    }

    if (fileMoi && cu.google_drive_anh_dai_dien_file_id) {
      await taoGoogleDrive()
        .files.delete({
          fileId: cu.google_drive_anh_dai_dien_file_id,
        })
        .catch(() => undefined);
    }

    return NextResponse.json({
      thanh_cong: true,
      thong_bao: "Cập nhật bài viết thành công.",
      du_lieu: moi,
    });
  } catch (loi) {
    if (fileMoi) {
      await taoGoogleDrive()
        .files.delete({ fileId: fileMoi })
        .catch(() => undefined);
    }

    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          loi instanceof Error
            ? loi.message
            : "Không thể cập nhật bài viết.",
      },
      { status: 400 }
    );
  }
}

`;

source = source.slice(0, start) + patchFunction + source.slice(end);
fs.writeFileSync(file, source, "utf8");
console.log("Da sua API chuyen trang thai bai viet.");
console.log("API bay gio ho tro ca JSON va FormData.");

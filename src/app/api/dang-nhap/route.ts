import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoEmailDangNhapNoiBo } from "@/lib/tien-ich/tao-duong-dan";
import { taoUrlWebsite } from "@/lib/tien-ich/url-website";

export async function POST(yeuCau: Request) {
  try {
    const duLieu = await yeuCau.formData();

    const tenDangNhap = String(
      duLieu.get("ten_dang_nhap") ?? ""
    ).trim();

    const matKhau = String(
      duLieu.get("mat_khau") ?? ""
    );

    if (!tenDangNhap || !matKhau) {
      return NextResponse.redirect(
        taoUrlWebsite("/dang-nhap?loi=thieu_thong_tin", yeuCau),
        303
      );
    }

    const emailNoiBo =
      taoEmailDangNhapNoiBo(tenDangNhap);

    const supabase = await taoSupabaseMayChu();

    const {
      data: duLieuDangNhap,
      error: loiDangNhap,
    } = await supabase.auth.signInWithPassword({
      email: emailNoiBo,
      password: matKhau,
    });

    if (loiDangNhap || !duLieuDangNhap.user) {
      return NextResponse.redirect(
        taoUrlWebsite("/dang-nhap?loi=sai_thong_tin", yeuCau),
        303
      );
    }

    const {
      data: nguoiDung,
      error: loiNguoiDung,
    } = await supabase
      .from("nguoi_dung")
      .select(
        "id, ten_dang_nhap, ten_hien_thi, vai_tro, dang_hoat_dong"
      )
      .eq("id", duLieuDangNhap.user.id)
      .single();

    if (
      loiNguoiDung ||
      !nguoiDung ||
      !nguoiDung.dang_hoat_dong
    ) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        taoUrlWebsite("/dang-nhap?loi=tai_khoan_bi_khoa", yeuCau),
        303
      );
    }

    const duongDanSauDangNhap =
      nguoiDung.vai_tro === "quan_tri"
        ? "/quan-tri"
        : "/";

    return NextResponse.redirect(
      taoUrlWebsite(duongDanSauDangNhap, yeuCau),
      303
    );
  } catch (loi) {
    console.error("Loi dang nhap:", loi);

    return NextResponse.redirect(
      taoUrlWebsite("/dang-nhap?loi=he_thong", yeuCau),
      303
    );
  }
}
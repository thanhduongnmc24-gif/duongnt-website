import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoEmailDangNhapNoiBo } from "@/lib/tien-ich/tao-duong-dan";

type DuLieuTaoTaiKhoan = {
  ten_dang_nhap?: string;
  ten_hien_thi?: string;
  email?: string;
  mat_khau?: string;
  vai_tro?: "quan_tri" | "nguoi_dung";
};

async function kiemTraQuyenQuanTri() {
  const supabase = await taoSupabaseMayChu();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hopLe: false,
      loi: "Chua dang nhap.",
      user: null,
    };
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("id, vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .single();

  if (
    !nguoiDung ||
    !nguoiDung.dang_hoat_dong ||
    nguoiDung.vai_tro !== "quan_tri"
  ) {
    return {
      hopLe: false,
      loi: "Khong co quyen quan tri.",
      user: null,
    };
  }

  return {
    hopLe: true,
    loi: "",
    user,
  };
}

export async function GET() {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hopLe) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: quyen.loi,
      },
      {
        status: 403,
      }
    );
  }

  const supabaseQuanTri = taoSupabaseQuanTri();

  const { data, error } = await supabaseQuanTri
    .from("nguoi_dung")
    .select(
      "id, ten_dang_nhap, ten_hien_thi, email, vai_tro, dang_hoat_dong, ngay_tao"
    )
    .order("ngay_tao", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    thanh_cong: true,
    du_lieu: data,
  });
}

export async function POST(yeuCau: Request) {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hopLe || !quyen.user) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: quyen.loi,
      },
      {
        status: 403,
      }
    );
  }

  let duLieu: DuLieuTaoTaiKhoan;

  try {
    duLieu = await yeuCau.json();
  } catch {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Du lieu gui len khong hop le.",
      },
      {
        status: 400,
      }
    );
  }

  const tenDangNhap = String(
    duLieu.ten_dang_nhap ?? ""
  )
    .trim()
    .toLowerCase();

  const tenHienThi = String(
    duLieu.ten_hien_thi ?? ""
  ).trim();

  const email = String(duLieu.email ?? "").trim();
  const matKhau = String(duLieu.mat_khau ?? "");

  const vaiTro =
    duLieu.vai_tro === "quan_tri"
      ? "quan_tri"
      : "nguoi_dung";

  if (!tenDangNhap) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Ten dang nhap khong duoc de trong.",
      },
      {
        status: 400,
      }
    );
  }

  if (!tenHienThi) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Ten hien thi khong duoc de trong.",
      },
      {
        status: 400,
      }
    );
  }

  if (!matKhau) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Mat khau khong duoc de trong.",
      },
      {
        status: 400,
      }
    );
  }

  const supabaseQuanTri = taoSupabaseQuanTri();

  const { data: taiKhoanDaCo } =
    await supabaseQuanTri
      .from("nguoi_dung")
      .select("id")
      .eq("ten_dang_nhap", tenDangNhap)
      .maybeSingle();

  if (taiKhoanDaCo) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Ten dang nhap da ton tai.",
      },
      {
        status: 409,
      }
    );
  }

  const emailNoiBo =
    taoEmailDangNhapNoiBo(tenDangNhap);

  const {
    data: duLieuAuth,
    error: loiTaoAuth,
  } = await supabaseQuanTri.auth.admin.createUser({
    email: emailNoiBo,
    password: matKhau,
    email_confirm: true,

    user_metadata: {
      ten_dang_nhap: tenDangNhap,
      ten_hien_thi: tenHienThi,
    },

    app_metadata: {
      vai_tro: vaiTro,
    },
  });

  if (loiTaoAuth || !duLieuAuth.user) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          loiTaoAuth?.message ??
          "Khong tao duoc tai khoan Auth.",
      },
      {
        status: 400,
      }
    );
  }

  const { error: loiTaoHoSo } =
    await supabaseQuanTri
      .from("nguoi_dung")
      .insert({
        id: duLieuAuth.user.id,
        ten_dang_nhap: tenDangNhap,
        ten_hien_thi: tenHienThi,
        email: email || null,
        vai_tro: vaiTro,
        dang_hoat_dong: true,
      });

  if (loiTaoHoSo) {
    await supabaseQuanTri.auth.admin.deleteUser(
      duLieuAuth.user.id
    );

    return NextResponse.json(
      {
        thanh_cong: false,
        loi: loiTaoHoSo.message,
      },
      {
        status: 400,
      }
    );
  }

  await supabaseQuanTri
    .from("lich_su_quan_tri")
    .insert({
      nguoi_thuc_hien_id: quyen.user.id,
      hanh_dong: "tao_tai_khoan",
      doi_tuong: "nguoi_dung",
      doi_tuong_id: duLieuAuth.user.id,
      du_lieu_moi: {
        ten_dang_nhap: tenDangNhap,
        ten_hien_thi: tenHienThi,
        vai_tro: vaiTro,
      },
    });

  return NextResponse.json(
    {
      thanh_cong: true,
      thong_bao: "Tao tai khoan thanh cong.",
      du_lieu: {
        id: duLieuAuth.user.id,
        ten_dang_nhap: tenDangNhap,
        ten_hien_thi: tenHienThi,
        vai_tro: vaiTro,
      },
    },
    {
      status: 201,
    }
  );
}
import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

type LoaiDeMuc = "cap_1" | "cap_2";

type DuLieuDeMuc = {
  id?: string;
  loai?: LoaiDeMuc;
  de_muc_id?: string;
  ten?: string;
  mo_ta?: string;
  thu_tu?: number;
  dang_hien_thi?: boolean;
};

async function kiemTraQuyenQuanTri() {
  const supabase = await taoSupabaseMayChu();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hop_le: false,
      loi: "Chưa đăng nhập.",
      user: null,
    };
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .single();

  if (
    !nguoiDung ||
    !nguoiDung.dang_hoat_dong ||
    nguoiDung.vai_tro !== "quan_tri"
  ) {
    return {
      hop_le: false,
      loi: "Không có quyền quản trị.",
      user: null,
    };
  }

  return {
    hop_le: true,
    loi: "",
    user,
  };
}

async function ghiLichSu(
  nguoiThucHienId: string,
  hanhDong: string,
  doiTuong: string,
  doiTuongId: string,
  duLieuCu: unknown,
  duLieuMoi: unknown
) {
  const supabaseQuanTri = taoSupabaseQuanTri();

  const { error } = await supabaseQuanTri
    .from("lich_su_quan_tri")
    .insert({
      nguoi_thuc_hien_id: nguoiThucHienId,
      hanh_dong: hanhDong,
      doi_tuong: doiTuong,
      doi_tuong_id: doiTuongId,
      du_lieu_cu: duLieuCu,
      du_lieu_moi: duLieuMoi,
    });

  if (error) {
    console.error(
      "Không thể ghi lịch sử quản trị:",
      error.message
    );
  }
}

export async function GET() {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hop_le) {
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
    .from("de_muc")
    .select(`
      id,
      ten_de_muc,
      duong_dan,
      mo_ta,
      thu_tu,
      dang_hien_thi,
      ngay_tao,
      de_muc_con (
        id,
        de_muc_id,
        ten_de_muc_con,
        duong_dan,
        mo_ta,
        thu_tu,
        dang_hien_thi,
        ngay_tao
      )
    `)
    .order("thu_tu", {
      ascending: true,
    });

  if (error) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Không thể tải danh sách đề mục.",
        chi_tiet: error.message,
      },
      {
        status: 500,
      }
    );
  }

  const danhSach = (data ?? []).map((deMuc) => ({
    ...deMuc,
    de_muc_con: [...(deMuc.de_muc_con ?? [])].sort(
      (a, b) => a.thu_tu - b.thu_tu
    ),
  }));

  return NextResponse.json({
    thanh_cong: true,
    du_lieu: danhSach,
  });
}

export async function POST(yeuCau: Request) {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hop_le || !quyen.user) {
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

  let duLieu: DuLieuDeMuc;

  try {
    duLieu = await yeuCau.json();
  } catch {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Dữ liệu gửi lên không hợp lệ.",
      },
      {
        status: 400,
      }
    );
  }

  const loai: LoaiDeMuc =
    duLieu.loai === "cap_2" ? "cap_2" : "cap_1";

  const ten = String(duLieu.ten ?? "").trim();
  const moTa = String(duLieu.mo_ta ?? "").trim();
  const thuTu = Number(duLieu.thu_tu ?? 0);

  if (!ten) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Tên đề mục không được để trống.",
      },
      {
        status: 400,
      }
    );
  }

  if (!Number.isInteger(thuTu) || thuTu < 0) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Thứ tự phải là số nguyên không âm.",
      },
      {
        status: 400,
      }
    );
  }

  const duongDan = taoDuongDan(ten);
  const supabaseQuanTri = taoSupabaseQuanTri();

  if (loai === "cap_1") {
    const { data, error } = await supabaseQuanTri
      .from("de_muc")
      .insert({
        ten_de_muc: ten,
        duong_dan: duongDan,
        mo_ta: moTa || null,
        thu_tu: thuTu,
        dang_hien_thi:
          duLieu.dang_hien_thi !== false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          thanh_cong: false,
          loi:
            error.code === "23505"
              ? "Tên hoặc đường dẫn đề mục đã tồn tại."
              : error.message,
        },
        {
          status: 400,
        }
      );
    }

    await ghiLichSu(
      quyen.user.id,
      "tao_de_muc",
      "de_muc",
      data.id,
      null,
      data
    );

    return NextResponse.json(
      {
        thanh_cong: true,
        thong_bao: "Tạo đề mục cấp 1 thành công.",
        du_lieu: data,
      },
      {
        status: 201,
      }
    );
  }

  const deMucId = String(
    duLieu.de_muc_id ?? ""
  ).trim();

  if (!deMucId) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Chưa chọn đề mục cấp 1.",
      },
      {
        status: 400,
      }
    );
  }

  const { data: deMucCha } = await supabaseQuanTri
    .from("de_muc")
    .select("id")
    .eq("id", deMucId)
    .maybeSingle();

  if (!deMucCha) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Đề mục cấp 1 không tồn tại.",
      },
      {
        status: 404,
      }
    );
  }

  const { data, error } = await supabaseQuanTri
    .from("de_muc_con")
    .insert({
      de_muc_id: deMucId,
      ten_de_muc_con: ten,
      duong_dan: duongDan,
      mo_ta: moTa || null,
      thu_tu: thuTu,
      dang_hien_thi:
        duLieu.dang_hien_thi !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          error.code === "23505"
            ? "Đề mục con đã tồn tại trong đề mục này."
            : error.message,
      },
      {
        status: 400,
      }
    );
  }

  await ghiLichSu(
    quyen.user.id,
    "tao_de_muc_con",
    "de_muc_con",
    data.id,
    null,
    data
  );

  return NextResponse.json(
    {
      thanh_cong: true,
      thong_bao: "Tạo đề mục cấp 2 thành công.",
      du_lieu: data,
    },
    {
      status: 201,
    }
  );
}

export async function PATCH(yeuCau: Request) {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hop_le || !quyen.user) {
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

  let duLieu: DuLieuDeMuc;

  try {
    duLieu = await yeuCau.json();
  } catch {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Dữ liệu gửi lên không hợp lệ.",
      },
      {
        status: 400,
      }
    );
  }

  const id = String(duLieu.id ?? "").trim();
  const ten = String(duLieu.ten ?? "").trim();
  const moTa = String(duLieu.mo_ta ?? "").trim();
  const thuTu = Number(duLieu.thu_tu ?? 0);

  const loai: LoaiDeMuc =
    duLieu.loai === "cap_2" ? "cap_2" : "cap_1";

  if (!id) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Thiếu ID đề mục.",
      },
      {
        status: 400,
      }
    );
  }

  if (!ten) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Tên đề mục không được để trống.",
      },
      {
        status: 400,
      }
    );
  }

  if (!Number.isInteger(thuTu) || thuTu < 0) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Thứ tự phải là số nguyên không âm.",
      },
      {
        status: 400,
      }
    );
  }

  const supabaseQuanTri = taoSupabaseQuanTri();

  if (loai === "cap_1") {
    const { data: duLieuCu, error: loiDoc } =
      await supabaseQuanTri
        .from("de_muc")
        .select("*")
        .eq("id", id)
        .single();

    if (loiDoc || !duLieuCu) {
      return NextResponse.json(
        {
          thanh_cong: false,
          loi: "Không tìm thấy đề mục cấp 1.",
        },
        {
          status: 404,
        }
      );
    }

    const { data, error } = await supabaseQuanTri
      .from("de_muc")
      .update({
        ten_de_muc: ten,
        duong_dan: taoDuongDan(ten),
        mo_ta: moTa || null,
        thu_tu: thuTu,
        dang_hien_thi:
          duLieu.dang_hien_thi !== false,
        ngay_cap_nhat: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          thanh_cong: false,
          loi:
            error.code === "23505"
              ? "Tên hoặc đường dẫn đề mục đã tồn tại."
              : error.message,
        },
        {
          status: 400,
        }
      );
    }

    await ghiLichSu(
      quyen.user.id,
      "cap_nhat_de_muc",
      "de_muc",
      id,
      duLieuCu,
      data
    );

    return NextResponse.json({
      thanh_cong: true,
      thong_bao: "Cập nhật đề mục cấp 1 thành công.",
      du_lieu: data,
    });
  }

  const deMucId = String(
    duLieu.de_muc_id ?? ""
  ).trim();

  if (!deMucId) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Chưa chọn đề mục cấp 1.",
      },
      {
        status: 400,
      }
    );
  }

  const { data: duLieuCu, error: loiDoc } =
    await supabaseQuanTri
      .from("de_muc_con")
      .select("*")
      .eq("id", id)
      .single();

  if (loiDoc || !duLieuCu) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Không tìm thấy đề mục cấp 2.",
      },
      {
        status: 404,
      }
    );
  }

  const { data, error } = await supabaseQuanTri
    .from("de_muc_con")
    .update({
      de_muc_id: deMucId,
      ten_de_muc_con: ten,
      duong_dan: taoDuongDan(ten),
      mo_ta: moTa || null,
      thu_tu: thuTu,
      dang_hien_thi:
        duLieu.dang_hien_thi !== false,
      ngay_cap_nhat: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          error.code === "23505"
            ? "Đề mục con đã tồn tại trong đề mục này."
            : error.message,
      },
      {
        status: 400,
      }
    );
  }

  await ghiLichSu(
    quyen.user.id,
    "cap_nhat_de_muc_con",
    "de_muc_con",
    id,
    duLieuCu,
    data
  );

  return NextResponse.json({
    thanh_cong: true,
    thong_bao: "Cập nhật đề mục cấp 2 thành công.",
    du_lieu: data,
  });
}

export async function DELETE(yeuCau: Request) {
  const quyen = await kiemTraQuyenQuanTri();

  if (!quyen.hop_le || !quyen.user) {
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

  const diaChi = new URL(yeuCau.url);
  const id = diaChi.searchParams.get("id")?.trim();
  const loai = diaChi.searchParams.get("loai");

  if (!id) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: "Thiếu ID đề mục.",
      },
      {
        status: 400,
      }
    );
  }

  const supabaseQuanTri = taoSupabaseQuanTri();

  if (loai === "cap_2") {
    const { count: soBaiViet } =
      await supabaseQuanTri
        .from("bai_viet")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("de_muc_con_id", id);

    if ((soBaiViet ?? 0) > 0) {
      return NextResponse.json(
        {
          thanh_cong: false,
          loi:
            "Không thể xóa đề mục con đang có bài viết.",
        },
        {
          status: 409,
        }
      );
    }

    const { data: duLieuCu } = await supabaseQuanTri
      .from("de_muc_con")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabaseQuanTri
      .from("de_muc_con")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          thanh_cong: false,
          loi: error.message,
        },
        {
          status: 400,
        }
      );
    }

    await ghiLichSu(
      quyen.user.id,
      "xoa_de_muc_con",
      "de_muc_con",
      id,
      duLieuCu,
      null
    );

    return NextResponse.json({
      thanh_cong: true,
      thong_bao: "Xóa đề mục cấp 2 thành công.",
    });
  }

  const { count: soDeMucCon } =
    await supabaseQuanTri
      .from("de_muc_con")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("de_muc_id", id);

  if ((soDeMucCon ?? 0) > 0) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          "Phải xóa hoặc chuyển các đề mục con trước.",
      },
      {
        status: 409,
      }
    );
  }

  const { count: soBaiViet } = await supabaseQuanTri
    .from("bai_viet")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("de_muc_id", id);

  if ((soBaiViet ?? 0) > 0) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi:
          "Không thể xóa đề mục đang có bài viết.",
      },
      {
        status: 409,
      }
    );
  }

  const { data: duLieuCu } = await supabaseQuanTri
    .from("de_muc")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseQuanTri
    .from("de_muc")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        thanh_cong: false,
        loi: error.message,
      },
      {
        status: 400,
      }
    );
  }

  await ghiLichSu(
    quyen.user.id,
    "xoa_de_muc",
    "de_muc",
    id,
    duLieuCu,
    null
  );

  return NextResponse.json({
    thanh_cong: true,
    thong_bao: "Xóa đề mục cấp 1 thành công.",
  });
}
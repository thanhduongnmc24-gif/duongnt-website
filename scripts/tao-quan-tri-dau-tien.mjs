import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin as dauVao, stdout as dauRa } from "node:process";

function taoDuongDan(chuoi) {
  return chuoi
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function taoEmailNoiBo(tenDangNhap) {
  return `${taoDuongDan(tenDangNhap)}@internal.duongnt.io.vn`;
}

const diaChiSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const khoaBiMat = process.env.SUPABASE_SECRET_KEY;

if (!diaChiSupabase || !khoaBiMat) {
  console.error(
    "Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SECRET_KEY trong .env.local."
  );

  process.exit(1);
}

const supabase = createClient(diaChiSupabase, khoaBiMat, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const docDuLieu = createInterface({
  input: dauVao,
  output: dauRa,
});

let nguoiDungAuthDaTao = null;

try {
  console.log("");
  console.log("=== TAO TAI KHOAN QUAN TRI DAU TIEN ===");
  console.log("");

  const tenDangNhap = (
    await docDuLieu.question("Ten dang nhap: ")
  ).trim();

  const tenHienThi = (
    await docDuLieu.question("Ten hien thi: ")
  ).trim();

  const emailThat = (
    await docDuLieu.question(
      "Email that, co the bo trong: "
    )
  ).trim();

  const matKhau = await docDuLieu.question(
    "Mat khau: "
  );

  if (!tenDangNhap) {
    throw new Error("Ten dang nhap khong duoc de trong.");
  }

  if (!tenHienThi) {
    throw new Error("Ten hien thi khong duoc de trong.");
  }

  if (!matKhau) {
    throw new Error("Mat khau khong duoc de trong.");
  }

  const tenDangNhapChuanHoa = taoDuongDan(tenDangNhap);

  if (!tenDangNhapChuanHoa) {
    throw new Error("Ten dang nhap khong hop le.");
  }

  const emailDangNhap = taoEmailNoiBo(
    tenDangNhapChuanHoa
  );

  console.log("");
  console.log("Dang kiem tra tai khoan...");

  const {
    data: taiKhoanDaCo,
    error: loiKiemTra,
  } = await supabase
    .from("nguoi_dung")
    .select("id, ten_dang_nhap")
    .eq("ten_dang_nhap", tenDangNhapChuanHoa)
    .maybeSingle();

  if (loiKiemTra) {
    throw loiKiemTra;
  }

  if (taiKhoanDaCo) {
    throw new Error(
      `Ten dang nhap "${tenDangNhapChuanHoa}" da ton tai.`
    );
  }

  console.log("Dang tao tai khoan Supabase Auth...");

  const {
    data: duLieuAuth,
    error: loiTaoAuth,
  } = await supabase.auth.admin.createUser({
    email: emailDangNhap,
    password: matKhau,
    email_confirm: true,

    user_metadata: {
      ten_dang_nhap: tenDangNhapChuanHoa,
      ten_hien_thi: tenHienThi,
    },

    app_metadata: {
      vai_tro: "quan_tri",
    },
  });

  if (loiTaoAuth) {
    throw loiTaoAuth;
  }

  if (!duLieuAuth.user) {
    throw new Error(
      "Supabase khong tra ve thong tin nguoi dung."
    );
  }

  nguoiDungAuthDaTao = duLieuAuth.user;

  console.log("Dang tao ho so nguoi dung...");

  const { error: loiTaoHoSo } = await supabase
    .from("nguoi_dung")
    .insert({
      id: duLieuAuth.user.id,
      ten_dang_nhap: tenDangNhapChuanHoa,
      ten_hien_thi: tenHienThi,
      email: emailThat || null,
      vai_tro: "quan_tri",
      dang_hoat_dong: true,
    });

  if (loiTaoHoSo) {
    throw loiTaoHoSo;
  }

  console.log("");
  console.log("======================================");
  console.log("DA TAO TAI KHOAN QUAN TRI THANH CONG");
  console.log("======================================");
  console.log(`Ten dang nhap: ${tenDangNhapChuanHoa}`);
  console.log(`Ten hien thi: ${tenHienThi}`);
  console.log(`Email noi bo: ${emailDangNhap}`);
  console.log(`ID tai khoan: ${duLieuAuth.user.id}`);
  console.log("");
} catch (loi) {
  console.error("");
  console.error(
    "Khong the tao tai khoan:",
    loi instanceof Error ? loi.message : loi
  );

  if (nguoiDungAuthDaTao?.id) {
    console.log(
      "Dang xoa tai khoan Auth vi tao ho so that bai..."
    );

    const { error: loiXoa } =
      await supabase.auth.admin.deleteUser(
        nguoiDungAuthDaTao.id
      );

    if (loiXoa) {
      console.error(
        "Khong the tu dong xoa tai khoan Auth:",
        loiXoa.message
      );
    } else {
      console.log(
        "Da xoa tai khoan Auth chua hoan chinh."
      );
    }
  }

  process.exitCode = 1;
} finally {
  docDuLieu.close();
}
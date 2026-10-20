import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

const KHO_LUU_PHIEN = "duongnt-lichlamviec-auth";
let trinhDuyetDungChung: SupabaseClient | null = null;

export function taoEmailLichLamViec(tenDangNhap: string) {
  return `${taoDuongDan(tenDangNhap)}@lichlamviec.internal.duongnt.io.vn`;
}

export function taoSupabaseLichLamViec() {
  if (trinhDuyetDungChung) return trinhDuyetDungChung;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase.");

  trinhDuyetDungChung = createClient(url, key, {
    auth: {
      storageKey: KHO_LUU_PHIEN,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return trinhDuyetDungChung;
}

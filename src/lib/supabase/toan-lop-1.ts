import { createBrowserClient } from "@supabase/ssr";

export function taoSupabaseToanLop1() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase.");
  return createBrowserClient(url, key);
}

export function taoEmailToanLop1(tenDangNhap: string) {
  return `toanlop1.${tenDangNhap}@internal.duongnt.io.vn`;
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function taoSupabaseMayChu() {
  const diaChiSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const khoaCongKhai =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!diaChiSupabase || !khoaCongKhai) {
    throw new Error(
      "Thieu NEXT_PUBLIC_SUPABASE_URL hoac NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  const khoCookie = await cookies();

  return createServerClient(diaChiSupabase, khoaCongKhai, {
    cookies: {
      getAll() {
        return khoCookie.getAll();
      },

      setAll(danhSachCookie) {
        try {
          danhSachCookie.forEach(({ name, value, options }) => {
            khoCookie.set(name, value, options);
          });
        } catch {
          // Server Component co the khong duoc phep cap nhat cookie.
        }
      },
    },
  });
}

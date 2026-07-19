import { createBrowserClient } from "@supabase/ssr";

export function taoSupabaseTrinhDuyet() {
  const diaChiSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const khoaCongKhai =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!diaChiSupabase || !khoaCongKhai) {
    throw new Error(
      "Thieu NEXT_PUBLIC_SUPABASE_URL hoac NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient(diaChiSupabase, khoaCongKhai);
}

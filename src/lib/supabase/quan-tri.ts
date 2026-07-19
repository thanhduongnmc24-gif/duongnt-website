import "server-only";
import { createClient } from "@supabase/supabase-js";

export function taoSupabaseQuanTri() {
  const diaChiSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const khoaBiMat = process.env.SUPABASE_SECRET_KEY;

  if (!diaChiSupabase || !khoaBiMat) {
    throw new Error(
      "Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SECRET_KEY."
    );
  }

  return createClient(diaChiSupabase, khoaBiMat, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

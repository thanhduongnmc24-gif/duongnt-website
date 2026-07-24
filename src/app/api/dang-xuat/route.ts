import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoUrlWebsite } from "@/lib/tien-ich/url-website";

export async function POST(yeuCau: Request) {
  const supabase = await taoSupabaseMayChu();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    taoUrlWebsite("/dang-nhap", yeuCau),
    303
  );
}
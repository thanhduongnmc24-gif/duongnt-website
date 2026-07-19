import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

export async function POST(yeuCau: Request) {
  const supabase = await taoSupabaseMayChu();

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/dang-nhap", yeuCau.url),
    303
  );
}
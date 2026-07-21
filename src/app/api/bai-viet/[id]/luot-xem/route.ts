import { NextResponse } from "next/server";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export async function POST(
  _yeuCau: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseQuanTri = taoSupabaseQuanTri();

    const { data, error } = await supabaseQuanTri.rpc(
      "tang_luot_xem_bai_viet",
      { bai_viet_id: id }
    );

    if (error) {
      return NextResponse.json(
        { thanh_cong: false, loi: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      thanh_cong: true,
      luot_xem: data,
    });
  } catch {
    return NextResponse.json(
      { thanh_cong: false, loi: "Không thể cập nhật lượt xem." },
      { status: 500 }
    );
  }
}

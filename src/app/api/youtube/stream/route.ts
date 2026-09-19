import { NextResponse } from "next/server";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: Request,
) {
  const id =
    new URL(
      request.url,
    ).searchParams
      .get("id")
      ?.trim();

  if (
    !id ||
    !/^[a-zA-Z0-9_-]{6,20}$/.test(id)
  ) {
    return NextResponse.json(
      {
        loi:
          "ID video khong hop le.",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json(
    {
      url:
        "/api/youtube/audio?id=" +
        encodeURIComponent(id),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

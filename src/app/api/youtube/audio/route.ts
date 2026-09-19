import { createAudioHandler } from "@/lib/youtube/audio-proxy";
import { resolveAudioSource } from "@/lib/youtube/audio-source";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handle = createAudioHandler(resolveAudioSource);

export async function GET(request: Request) {
  return handle(request, "GET");
}

export async function HEAD(request: Request) {
  return handle(request, "HEAD");
}


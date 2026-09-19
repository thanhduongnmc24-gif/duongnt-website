export type AudioSource = { url: string; headers: Record<string, string>; expiresAt: number };
type ResolveSource = (id: string, refresh: boolean, signal: AbortSignal) => Promise<AudioSource>;

export class AudioError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function errorResponse(error: unknown, method: string, aborted: boolean) {
  const known = error instanceof AudioError ? error : new AudioError(
    'AUDIO_UNAVAILABLE', 'Không tải được âm thanh. Vui lòng thử lại hoặc chọn video khác.',
  );
  const status = aborted ? 499 : known.status;
  return new Response(method === 'HEAD' ? null : JSON.stringify({ loi: known.message, code: known.code }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Audio-Error': known.code },
  });
}

// A separate, dependency-injected handler lets protocol tests use real byte streams.
export function createAudioHandler(resolveSource: ResolveSource, fetchMedia: typeof fetch = fetch) {
  return async (request: Request, method: 'GET' | 'HEAD') => {
    const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return errorResponse(new AudioError('INVALID_VIDEO', 'ID video không hợp lệ.', 400), method, false);
    }
    const range = method === 'GET' ? request.headers.get('range') : null;
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
      return errorResponse(new AudioError('INVALID_RANGE', 'Khoảng âm thanh không hợp lệ.', 400), method, false);
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort(request.signal.reason);
    request.signal.addEventListener('abort', onAbort, { once: true });
    if (request.signal.aborted) onAbort();
    const cleanup = () => request.signal.removeEventListener('abort', onAbort);

    try {
      let upstream: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const source = await resolveSource(id, attempt === 1, controller.signal);
        const headers = new Headers(source.headers);
        if (range) headers.set('Range', range);
        const ifRange = request.headers.get('if-range');
        if (range && ifRange) headers.set('If-Range', ifRange);
        headers.set('Accept-Encoding', 'identity');
        // Limit connection startup, not the entire song. A total fetch timeout cuts long playback short.
        const timer = setTimeout(() => controller.abort(), 25_000);
        try {
          upstream = await fetchMedia(source.url, { method, headers, signal: controller.signal, cache: 'no-store', redirect: 'error' });
        } finally {
          clearTimeout(timer);
        }
        if (attempt === 0 && [401, 403, 410].includes(upstream.status)) {
          await upstream.body?.cancel();
          continue;
        }
        break;
      }
      if (!upstream) throw new Error('Missing upstream');
      const headers = new Headers({ 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' });
      for (const name of ['accept-ranges', 'content-length', 'content-range', 'content-type', 'etag', 'last-modified']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      // Preserve 416 and its total length, so native media seeking can recover correctly.
      if (upstream.status === 416) {
        await upstream.body?.cancel();
        headers.delete('content-length');
        cleanup();
        return new Response(null, { status: 416, headers });
      }
      if (!upstream.ok) {
        await upstream.body?.cancel();
        throw new AudioError('MEDIA_REJECTED', 'YouTube chưa cho phép phát âm thanh của video này. Hãy thử video khác.');
      }
      const mime = headers.get('content-type') ?? '';
      if (!/^(audio\/|video\/(mp4|webm)|application\/octet-stream)/i.test(mime)) {
        await upstream.body?.cancel();
        throw new AudioError('UNSUPPORTED_MEDIA', 'Video này chưa có định dạng âm thanh được hỗ trợ.');
      }
      if (method === 'HEAD' || !upstream.body) {
        await upstream.body?.cancel();
        cleanup();
        return new Response(null, { status: upstream.status, headers });
      }

      const reader = upstream.body.getReader();
      const body = new ReadableStream<Uint8Array>({
        async pull(output) {
          const timer = setTimeout(() => controller.abort(), 45_000);
          try {
            const next = await reader.read();
            if (next.done) { cleanup(); output.close(); }
            else output.enqueue(next.value);
          } catch (error) {
            cleanup();
            output.error(error);
          } finally {
            clearTimeout(timer);
          }
        },
        async cancel(reason) {
          cleanup();
          controller.abort();
          await reader.cancel(reason).catch(() => {});
        },
      });
      return new Response(body, { status: upstream.status, headers });
    } catch (error) {
      cleanup();
      controller.abort();
      return errorResponse(error, method, request.signal.aborted);
    }
  };
}

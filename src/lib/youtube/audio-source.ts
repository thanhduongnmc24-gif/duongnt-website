import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AudioError, type AudioSource } from './audio-proxy';

type Job = { promise: Promise<AudioSource>; controller: AbortController; consumers: number };
type State = {
  cache: Map<string, AudioSource>;
  pending: Map<string, Job>;
  cookies?: Promise<string | null>;
};
const shared = globalThis as typeof globalThis & { __duongTubeAudio?: State };
const state: State = shared.__duongTubeAudio ??= { cache: new Map(), pending: new Map() };
const DEFAULT_PIPED = ['https://pipedapi.kavin.rocks'];
const DEFAULT_INVIDIOUS = ['https://inv.nadeko.net'];

function instances(name: string, defaults: string[]) {
  const configured = process.env[name]?.split(',').map(value => value.trim()).filter(Boolean);
  return configured?.length ? configured : defaults;
}

async function getJson(url: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'DuongTube/1.0' },
      cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

function mediaSource(urlValue: unknown): AudioSource | null {
  if (typeof urlValue !== 'string') return null;
  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:') return null;
    return { url: url.href, headers: {}, expiresAt: Date.now() + 4 * 60_000 };
  } catch { return null; }
}

async function extractWithPiped(id: string, signal: AbortSignal) {
  for (const base of instances('PIPED_API_INSTANCES', DEFAULT_PIPED)) {
    try {
      const data = await getJson(`${base.replace(/\/$/, '')}/streams/${id}`, signal);
      const streams = Array.isArray(data.audioStreams) ? data.audioStreams as Record<string, unknown>[] : [];
      const selected = streams.filter(stream => typeof stream.url === 'string')
        .sort((a, b) => Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
      const source = mediaSource(selected?.url);
      if (source) return source;
    } catch (error) { if (signal.aborted) throw error; }
  }
  throw new Error('Piped unavailable');
}

async function extractWithInvidious(id: string, signal: AbortSignal) {
  for (const base of instances('INVIDIOUS_API_INSTANCES', DEFAULT_INVIDIOUS)) {
    try {
      const data = await getJson(`${base.replace(/\/$/, '')}/api/v1/videos/${id}`, signal);
      const formats = Array.isArray(data.adaptiveFormats) ? data.adaptiveFormats as Record<string, unknown>[] : [];
      const selected = formats.filter(format => typeof format.url === 'string' && /^audio\//i.test(String(format.type ?? '')))
        .sort((a, b) => Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0))[0];
      const source = mediaSource(selected?.url);
      if (source) return source;
    } catch (error) { if (signal.aborted) throw error; }
  }
  throw new Error('Invidious unavailable');
}

async function cookiePath() {
  if (!state.cookies) state.cookies = (async () => {
    const encoded = process.env.YOUTUBE_COOKIES_B64?.trim();
    if (!encoded) return null;
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    if (!/^# (?:Netscape )?HTTP Cookie File/.test(decoded) || !decoded.includes('youtube.com')) {
      console.warn('[DuongTube audio] Ignoring invalid YOUTUBE_COOKIES_B64');
      return null;
    }
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'duongtube-'));
    const destination = path.join(directory, 'cookies.txt');
    await fs.writeFile(destination, decoded, { encoding: 'utf8', mode: 0o600 });
    return destination;
  })();
  return state.cookies;
}

function extractionError(raw: string, signal: AbortSignal) {
  if (signal.aborted) return new AudioError('CANCELLED', 'Đã hủy yêu cầu phát.', 499);
  if (/not a bot|sign in to confirm/i.test(raw)) return new AudioError('YOUTUBE_VERIFICATION', 'YouTube đang yêu cầu máy chủ xác minh. Tạm thời chưa thể phát âm thanh.');
  if (/age.?restrict|confirm your age|private video|members.only|not available|unavailable|copyright/i.test(raw)) {
    return new AudioError('VIDEO_UNAVAILABLE', 'Video này không khả dụng để phát âm thanh. Hãy chọn video khác.');
  }
  if (/timed? ?out|timeout/i.test(raw)) return new AudioError('AUDIO_TIMEOUT', 'YouTube phản hồi chậm. Vui lòng thử lại.', 504);
  if (/ENOENT|No module named/.test(raw)) return new AudioError('AUDIO_SETUP', 'Máy chủ âm thanh chưa sẵn sàng. Vui lòng thử lại sau.', 503);
  return new AudioError('AUDIO_UNAVAILABLE', 'Không lấy được âm thanh từ YouTube. Vui lòng thử lại hoặc chọn video khác.');
}

async function extractWithYtDlp(id: string, signal: AbortSignal): Promise<AudioSource> {
  signal.throwIfAborted();
  const cookie = await cookiePath();
  const python = path.join(process.cwd(), '.ytdlp-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python3');
  const args = [
    '-m', 'yt_dlp', '--ignore-config', '--no-playlist', '--no-progress', '--no-warnings',
    '--socket-timeout', '15', '--retries', '1', '--extractor-retries', '1',
    '--impersonate', 'chrome',
    '--js-runtimes', `node:${process.execPath}`,
    // web_music currently yields progressive audio URLs that accept byte-range
    // requests. mweb may return a signed URL that immediately answers 403 even
    // when its PO token was generated successfully.
    '--extractor-args', 'youtube:player-client=web_music',
    // Native audio needs a progressive media file; a manifest cannot be proxied as audio/mp4.
    // web_music often exposes a progressive MP4 (format 18) rather than a
    // separate M4A. HTMLAudioElement can play its audio track directly.
    '-f', 'bestaudio[ext=m4a][protocol=https]/bestaudio[protocol=https]/best[ext=mp4][protocol=https]', '-J',
    ...(cookie ? ['--cookies', cookie] : []),
    `https://www.youtube.com/watch?v=${id}`,
  ];
  return new Promise((resolve, reject) => {
    execFile(python, args, { timeout: 60_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, signal, env: { ...process.env, NO_COLOR: '1' } }, (error, stdout, stderr) => {
      if (error) {
        const failure = extractionError(`${stderr}\n${error.message}`, signal);
        console.warn('[DuongTube audio]', failure.code, id);
        reject(failure);
        return;
      }
      try {
        const info = JSON.parse(stdout);
        const candidates = [info, ...(info.requested_downloads ?? []), ...(info.requested_formats ?? [])];
        const selected = candidates.find((candidate) => {
          if (typeof candidate?.url !== 'string') return false;
          const url = new URL(candidate.url);
          return url.protocol === 'https:' && url.hostname.endsWith('.googlevideo.com') && !/m3u8|dash/i.test(candidate.protocol ?? '');
        });
        if (!selected) throw new AudioError('UNSUPPORTED_MEDIA', 'Video này chưa có định dạng âm thanh được hỗ trợ.');
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(selected.http_headers ?? info.http_headers ?? {})) {
          if (typeof value === 'string' && ['user-agent', 'accept', 'accept-language', 'referer', 'origin'].includes(key.toLowerCase())) headers[key] = value;
        }
        resolve({ url: selected.url, headers, expiresAt: Date.now() + 4 * 60_000 });
      } catch (error) { reject(error); }
    });
  });
}

async function extract(id: string, signal: AbortSignal): Promise<AudioSource> {
  try {
    return await extractWithYtDlp(id, signal);
  } catch (primaryError) {
    if (signal.aborted) throw primaryError;
    console.warn('[DuongTube audio] Direct source failed; trying Piped and Invidious');
    try {
      return await Promise.any([
        extractWithPiped(id, signal),
        extractWithInvidious(id, signal),
      ]);
    } catch {
      throw primaryError;
    }
  }
}

export async function resolveAudioSource(id: string, refresh: boolean, signal: AbortSignal): Promise<AudioSource> {
  signal.throwIfAborted();
  const cached = state.cache.get(id);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached;
  if (refresh) state.cache.delete(id);
  let job = state.pending.get(id);
  if (!job) {
    if (state.pending.size >= 3) throw new AudioError('AUDIO_BUSY', 'Máy chủ âm thanh đang bận. Vui lòng thử lại sau ít giây.', 503);
    const controller = new AbortController();
    const created: Job = { controller, consumers: 0, promise: Promise.resolve(null as unknown as AudioSource) };
    created.promise = extract(id, controller.signal).then((source) => {
      for (const [key, value] of state.cache) if (value.expiresAt < Date.now()) state.cache.delete(key);
      if (state.cache.size >= 64) state.cache.delete(state.cache.keys().next().value!);
      state.cache.set(id, source);
      return source;
    }).finally(() => { if (state.pending.get(id) === created) state.pending.delete(id); });
    state.pending.set(id, created);
    job = created;
  }
  job.consumers++;
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new AudioError('CANCELLED', 'Đã hủy yêu cầu phát.', 499));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  try { return await Promise.race([job.promise, aborted]); }
  finally {
    signal.removeEventListener('abort', onAbort);
    job.consumers--;
    if (job.consumers === 0 && state.pending.get(id) === job) job.controller.abort();
  }
}

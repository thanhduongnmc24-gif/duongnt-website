import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AudioError, type AudioSource } from './audio-proxy';

type Job = { promise: Promise<AudioSource>; controller: AbortController; consumers: number };
type State = {
  cache: Map<string, AudioSource>;
  pending: Map<string, Job>;
  provider?: ChildProcess;
  providerReady?: Promise<void>;
  cookies?: Promise<string | null>;
};
const shared = globalThis as typeof globalThis & { __duongTubeAudio?: State };
const state: State = shared.__duongTubeAudio ??= { cache: new Map(), pending: new Map() };
const providerUrl = 'http://127.0.0.1:4416';

async function providerHealthy() {
  try {
    const response = await fetch(`${providerUrl}/ping`, { signal: AbortSignal.timeout(1500), cache: 'no-store' });
    const body = await response.json();
    return response.ok && body.version === '2.0.0';
  } catch { return false; }
}

async function ensureProvider() {
  if (state.providerReady) return state.providerReady;
  const job = (async () => {
    if (await providerHealthy()) return;
    const server = path.join(process.cwd(), '.yt-pot-provider', 'server');
    try { await fs.access(path.join(server, 'build', 'main.js')); }
    catch { throw new AudioError('AUDIO_SETUP', 'Máy chủ âm thanh chưa sẵn sàng. Vui lòng thử lại sau.', 503); }
    const child = spawn(process.execPath, [path.join(server, 'build', 'main.js'), '--host', '127.0.0.1', '--port', '4416'], {
      cwd: server, windowsHide: true, stdio: 'ignore', env: { ...process.env, NO_COLOR: '1' },
    });
    state.provider = child;
    let failed = false;
    const cleanup = () => {
      failed = true;
      if (state.provider === child) { state.provider = undefined; state.providerReady = undefined; }
    };
    child.once('error', cleanup);
    child.once('exit', cleanup);
    const onExit = () => child.kill();
    process.once('exit', onExit);
    child.once('exit', () => process.removeListener('exit', onExit));
    // Keep one private provider warm: the script variant starts Node for every video,
    // and its fixed 15-second version check times out on small production instances.
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      if (await providerHealthy()) return;
      if (failed) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    child.kill();
    throw new AudioError('AUDIO_STARTUP', 'Máy chủ âm thanh đang khởi động. Vui lòng thử lại sau ít giây.', 503);
  })();
  state.providerReady = job;
  try { await job; }
  catch (error) { if (state.providerReady === job) state.providerReady = undefined; throw error; }
}

async function cookiePath() {
  if (!state.cookies) state.cookies = (async () => {
    const encoded = process.env.YOUTUBE_COOKIES_B64?.trim();
    if (!encoded) return null;
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    if (!/^# (?:Netscape )?HTTP Cookie File/.test(decoded) || !decoded.includes('youtube.com')) {
      throw new AudioError('AUDIO_SETUP', 'Cấu hình âm thanh cần được cập nhật. Vui lòng thử lại sau.', 503);
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

async function extract(id: string, signal: AbortSignal): Promise<AudioSource> {
  await ensureProvider();
  signal.throwIfAborted();
  const cookie = await cookiePath();
  const python = path.join(process.cwd(), '.ytdlp-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python3');
  const args = [
    '-m', 'yt_dlp', '--ignore-config', '--no-playlist', '--no-progress', '--no-warnings',
    '--socket-timeout', '15', '--retries', '1', '--extractor-retries', '1',
    '--js-runtimes', `node:${process.execPath}`,
    '--extractor-args', 'youtube:player-client=mweb',
    '--extractor-args', `youtubepot-bgutilhttp:base_url=${providerUrl}`,
    // Native audio needs a progressive media file; a manifest cannot be proxied as audio/mp4.
    '-f', 'bestaudio[ext=m4a][protocol=https]/bestaudio[protocol=https]', '-J',
    ...(cookie ? ['--cookies', cookie] : []), `https://www.youtube.com/watch?v=${id}`,
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

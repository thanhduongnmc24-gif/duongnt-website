import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioError, createAudioHandler } from './audio-proxy.ts';
import { durationInSeconds, videoIdFromInput } from './validation.ts';

const id = 'dQw4w9WgXcQ';
const source = async () => ({ url: 'https://media.googlevideo.com/song', headers: {}, expiresAt: Date.now() + 60_000 });
const request = (options = {}) => new Request(`https://youtube.example/api/youtube/audio?id=${id}`, options);

test('recognizes pasted YouTube URLs without accepting lookalike hosts', () => {
  for (const value of [id, `https://youtu.be/${id}?t=5`, `https://www.youtube.com/watch?v=${id}`, `https://music.youtube.com/watch?v=${id}`, `youtube.com/shorts/${id}`]) {
    assert.equal(videoIdFromInput(value), id);
  }
  for (const value of ['invalid', `https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/${id}`]) assert.equal(videoIdFromInput(value), null);
  assert.equal(durationInSeconds('PT1H2M3S'), 3723);
  assert.equal(durationInSeconds('P1DT2H'), 93600);
});

test('invalid identifiers and multipart ranges never contact upstream', async () => {
  const handler = createAudioHandler(() => { throw new Error('must not be called'); });
  assert.equal((await handler(new Request('https://example.test/?id=abc'), 'GET')).status, 400);
  assert.equal((await handler(request({ headers: { Range: 'bytes=0-1,3-4' } }), 'GET')).status, 400);
});

test('forwards byte ranges and preserves 206 length, type, and bytes for native seeking', async () => {
  const handler = createAudioHandler(source, async (_url, options) => {
    assert.equal(new Headers(options.headers).get('range'), 'bytes=4-7');
    assert.equal(new Headers(options.headers).get('if-range'), '"etag"');
    return new Response(new Uint8Array([4, 5, 6, 7]), { status: 206, headers: {
      'Content-Type': 'audio/mp4', 'Content-Range': 'bytes 4-7/100', 'Content-Length': '4', 'Accept-Ranges': 'bytes',
    } });
  });
  const response = await handler(request({ headers: { Range: 'bytes=4-7', 'If-Range': '"etag"' } }), 'GET');
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 4-7/100');
  assert.equal(response.headers.get('content-length'), '4');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([4, 5, 6, 7]));
});

test('HEAD has no response body and does not forward a Range header', async () => {
  const handler = createAudioHandler(source, async (_url, options) => {
    assert.equal(options.method, 'HEAD');
    assert.equal(new Headers(options.headers).get('range'), null);
    return new Response(null, { headers: { 'Content-Type': 'audio/mp4', 'Content-Length': '100' } });
  });
  const response = await handler(request({ method: 'HEAD', headers: { Range: 'bytes=0-1' } }), 'HEAD');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '100');
  assert.equal(await response.text(), '');
});

test('preserves unsatisfiable 416 ranges instead of disguising them as a gateway failure', async () => {
  const response = await createAudioHandler(source, async () => new Response('not media', {
    status: 416, headers: { 'Content-Range': 'bytes */100', 'Content-Length': '9' },
  }))(request({ headers: { Range: 'bytes=999-' } }), 'GET');
  assert.equal(response.status, 416);
  assert.equal(response.headers.get('content-range'), 'bytes */100');
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(await response.text(), '');
});

test('refreshes an expired signed source once and releases the rejected upstream', async () => {
  const refreshes = [];
  let calls = 0;
  let cancelled = false;
  const handler = createAudioHandler(async (_id, refresh) => { refreshes.push(refresh); return source(); }, async () => {
    if (++calls === 1) return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 403 });
    return new Response('audio', { headers: { 'Content-Type': 'audio/mp4' } });
  });
  assert.equal(await (await handler(request(), 'GET')).text(), 'audio');
  assert.deepEqual(refreshes, [false, true]);
  assert.equal(cancelled, true);
});

test('cancelling playback cancels the upstream media request', async () => {
  let upstreamSignal;
  let cancelled = false;
  const handler = createAudioHandler(source, async (_url, options) => {
    upstreamSignal = options.signal;
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'Content-Type': 'audio/mp4' } });
  });
  const response = await handler(request(), 'GET');
  await response.body.cancel();
  assert.equal(upstreamSignal.aborted, true);
  assert.equal(cancelled, true);
});

test('upstream secrets and HTML error pages are not exposed as media or public errors', async () => {
  const failure = await createAudioHandler(async () => { throw new Error('cookie=secret token=private'); })(request(), 'GET');
  assert.equal(failure.status, 502);
  assert.doesNotMatch(await failure.text(), /secret|private/);
  const html = await createAudioHandler(source, async () => new Response('<html>blocked</html>', { headers: { 'Content-Type': 'text/html' } }))(request(), 'GET');
  assert.equal(html.status, 502);
  assert.equal((await html.json()).code, 'UNSUPPORTED_MEDIA');
  const head = await createAudioHandler(async () => { throw new AudioError('AUDIO_BUSY', 'busy', 503); })(request({ method: 'HEAD' }), 'HEAD');
  assert.equal(head.status, 503);
  assert.equal(await head.text(), '');
});

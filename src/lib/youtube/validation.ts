export const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

export function videoIdFromInput(input: string): string | null {
  if (VIDEO_ID.test(input)) return input;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|live|embed)\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
    }
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function durationInSeconds(value?: string): number | undefined {
  const parts = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value ?? '');
  return parts ? Number(parts[1] || 0) * 86400 + Number(parts[2] || 0) * 3600 + Number(parts[3] || 0) * 60 + Number(parts[4] || 0) : undefined;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Video } from "./types";

type PlayerEvent = { data: number; target: YouTubePlayer };
type YouTubePlayer = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVolume(): number;
  loadVideoById(id: string): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  stopVideo(): void;
};
type YouTubeApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error("YouTube IFrame API timeout")), 15_000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API unavailable"));
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Cannot load YouTube IFrame API"));
      };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

function mediaPlayback(state: MediaSessionPlaybackState) {
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
}

function mediaPosition(player: YouTubePlayer | null) {
  if (!player || !("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
  try {
    const duration = player.getDuration();
    const position = player.getCurrentTime();
    if (duration > 0 && Number.isFinite(duration) && Number.isFinite(position)) {
      navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(duration, Math.max(0, position)) });
    }
  } catch { /* Some browsers expose only part of Media Session. */ }
}

export function useYouTubeBackgroundPlayer({ onStarted }: { onStarted?: (video: Video) => void } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframePlayerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const currentRef = useRef<Video | null>(null);
  const queueRef = useRef<Video[]>([]);
  const repeatRef = useRef(false);
  const volumeRef = useRef(1);
  const pendingRef = useRef<Video | null>(null);
  const startedRef = useRef("");
  const onStartedRef = useRef(onStarted);
  const endedRef = useRef<() => void>(() => {});

  const [current, setCurrent] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, updateVolume] = useState(1);
  const [repeat, updateRepeat] = useState(false);

  useEffect(() => { onStartedRef.current = onStarted; }, [onStarted]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    void loadApi().then(api => {
      if (disposed) return;
      iframePlayerRef.current = new api.Player(host, {
        width: 200,
        height: 200,
        videoId: "",
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3,
          playsinline: 1, rel: 0, origin: window.location.origin,
        },
        events: {
          onReady: ({ target }: PlayerEvent) => {
            readyRef.current = true;
            target.setVolume(Math.round(volumeRef.current * 100));
            if (pendingRef.current) {
              target.loadVideoById(pendingRef.current.id);
              target.playVideo();
            }
          },
          onStateChange: ({ data, target }: PlayerEvent) => {
            if (data === 1) {
              setIsPlaying(true); setIsLoading(false); setError(null); mediaPlayback("playing"); mediaPosition(target);
              const video = currentRef.current;
              if (video && startedRef.current !== video.id) { startedRef.current = video.id; onStartedRef.current?.(video); }
            } else if (data === 2 || data === 5) {
              setIsPlaying(false); setIsLoading(false); mediaPlayback("paused"); mediaPosition(target);
            } else if (data === 3) setIsLoading(true);
            else if (data === 0) endedRef.current();
          },
          onError: () => {
            setError("YouTube không thể phát video này trong chế độ nghe. Hãy thử video khác hoặc xem bằng YouTube.");
            setIsPlaying(false); setIsLoading(false); mediaPlayback("paused");
          },
        },
      });
    }).catch(() => {
      if (!disposed) setError("Không tải được YouTube IFrame Player API. Vui lòng thử lại.");
    });
    return () => {
      disposed = true;
      readyRef.current = false;
      iframePlayerRef.current?.destroy();
      iframePlayerRef.current = null;
    };
  }, []);

  const resume = useCallback(() => {
    if (!currentRef.current) return;
    setError(null); setIsLoading(true);
    iframePlayerRef.current?.playVideo();
  }, []);

  const play = useCallback((video: Video, videos?: Video[], force = false) => {
    if (videos) {
      const seen = new Set<string>();
      const next = videos.filter(item => !seen.has(item.id) && !!seen.add(item.id));
      if (!seen.has(video.id)) next.unshift(video);
      queueRef.current = next; setQueue(next);
    } else if (!queueRef.current.some(item => item.id === video.id)) {
      queueRef.current = [video]; setQueue([video]);
    }
    if (!force && currentRef.current?.id === video.id) { resume(); return; }
    currentRef.current = video; pendingRef.current = video; startedRef.current = "";
    setCurrent(video); setPosition(0); setDuration(video.duration ?? 0); setError(null); setIsLoading(true); setIsPlaying(false);
    if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({ title: video.title, artist: video.channel, album: "DuongTube", artwork: video.thumbnail ? [{ src: video.thumbnail }] : [] });
    }
    if (readyRef.current && iframePlayerRef.current) {
      iframePlayerRef.current.loadVideoById(video.id);
      iframePlayerRef.current.playVideo();
    }
  }, [resume]);

  const pause = useCallback(() => { iframePlayerRef.current?.pauseVideo(); setIsLoading(false); }, []);
  const toggle = useCallback(() => { if (isPlaying) pause(); else resume(); }, [isPlaying, pause, resume]);
  const seek = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    iframePlayerRef.current?.seekTo(Math.max(0, seconds), true);
    setPosition(Math.max(0, seconds)); mediaPosition(iframePlayerRef.current);
  }, []);
  const next = useCallback(() => {
    const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
    const following = queueRef.current[(index + 1) % queueRef.current.length];
    if (following) play(following, undefined, true);
  }, [play]);
  const previous = useCallback(() => {
    const player = iframePlayerRef.current;
    if (player && player.getCurrentTime() > 3) { seek(0); return; }
    const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
    const prior = queueRef.current[Math.max(0, index - 1)];
    if (prior) play(prior, undefined, true);
  }, [play, seek]);
  const retry = useCallback(() => { if (currentRef.current) play(currentRef.current, undefined, true); }, [play]);
  const close = useCallback(() => {
    pendingRef.current = null; currentRef.current = null; startedRef.current = "";
    iframePlayerRef.current?.stopVideo();
    setCurrent(null); setIsPlaying(false); setIsLoading(false); setPosition(0); setDuration(0); setError(null); mediaPlayback("none");
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
  }, []);
  const setVolume = useCallback((value: number) => {
    const nextVolume = Math.max(0, Math.min(1, value));
    volumeRef.current = nextVolume;
    iframePlayerRef.current?.setVolume(Math.round(nextVolume * 100)); updateVolume(nextVolume);
  }, []);
  const setRepeat = useCallback((value: boolean) => { repeatRef.current = value; updateRepeat(value); }, []);

  endedRef.current = () => {
    if (repeatRef.current && currentRef.current) play(currentRef.current, undefined, true);
    else {
      const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
      const following = queueRef.current[index + 1];
      if (following) play(following, undefined, true);
      else { setIsPlaying(false); mediaPlayback("paused"); }
    }
  };

  useEffect(() => {
    if (!current) return;
    const timer = window.setInterval(() => {
      const player = iframePlayerRef.current;
      if (!player) return;
      const nextPosition = player.getCurrentTime();
      const nextDuration = player.getDuration();
      if (Number.isFinite(nextPosition)) setPosition(nextPosition);
      if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
      if (player.getPlayerState() === 1) mediaPosition(player);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [current]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: resume, pause, stop: close, previoustrack: previous, nexttrack: next,
      seekbackward: ({ seekOffset }) => seek((iframePlayerRef.current?.getCurrentTime() ?? 0) - (seekOffset ?? 10)),
      seekforward: ({ seekOffset }) => seek((iframePlayerRef.current?.getCurrentTime() ?? 0) + (seekOffset ?? 10)),
      seekto: ({ seekTime }) => { if (seekTime !== undefined) seek(seekTime); },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler ?? null); } catch { /* Unsupported action. */ }
    }
    return () => {
      for (const action of Object.keys(handlers)) {
        try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, null); } catch { /* Unsupported action. */ }
      }
    };
  }, [close, next, pause, previous, resume, seek]);

  return {
    hostRef, current, queue, isPlaying, isLoading, error, errorCode: null as string | null,
    position, duration, volume, repeat, play, toggle, next, previous, seek, setVolume, setRepeat, retry, close,
  };
}

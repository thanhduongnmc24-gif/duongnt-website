"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Video } from "./types";

type PlayerEvent = { data: number; target: YouTubePlayer };
type YouTubePlayer = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  loadVideoById(id: string): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  stopVideo(): void;
  unMute(): void;
};
type YouTubeApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
};

function isYouTubePlayer(value: unknown): value is YouTubePlayer {
  if (!value || typeof value !== "object") return false;
  const player = value as Partial<YouTubePlayer>;
  return typeof player.playVideo === "function"
    && typeof player.loadVideoById === "function"
    && typeof player.getCurrentTime === "function";
}

function canControlPlayer(value: unknown): value is YouTubePlayer {
  if (!value || typeof value !== "object") return false;
  const player = value as Partial<YouTubePlayer>;
  return typeof player.playVideo === "function" && typeof player.loadVideoById === "function";
}

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

export function useYouTubePlayer({ onStarted }: { onStarted?: (video: Video) => void } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframePlayerRef = useRef<YouTubePlayer | null>(null);
  const apiRef = useRef<YouTubeApi | null>(null);
  const createdRef = useRef(false);
  const preparedVideoIdRef = useRef("");
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
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, updateVolume] = useState(1);
  const [repeat, updateRepeat] = useState(false);

  useEffect(() => { onStartedRef.current = onStarted; }, [onStarted]);

  const createPlayer = useCallback((api: YouTubeApi, firstVideoId: string, warmingUp: boolean) => {
    const host = hostRef.current;
    if (!host || createdRef.current) return;
    createdRef.current = true;
    const created = new api.Player(host, {
      width: 200,
      height: 200,
      videoId: firstVideoId,
      playerVars: {
        autoplay: warmingUp ? 0 : 1, mute: warmingUp ? 1 : 0, controls: 1, disablekb: 0, fs: 1, iv_load_policy: 3,
        playsinline: 1, rel: 0, origin: window.location.origin,
      },
      events: {
        onReady: ({ target }: PlayerEvent) => {
          iframePlayerRef.current = target;
          readyRef.current = true;
          target.setVolume(Math.round(volumeRef.current * 100));
          const pending = pendingRef.current;
          if (!pending || !currentRef.current) {
            target.pauseVideo();
            target.unMute();
            setIsReady(true);
            setIsPlaying(false);
            setIsLoading(false);
            return;
          }
          target.unMute();
          if (pending.id !== firstVideoId) target.loadVideoById(pending.id);
          setIsReady(true);
          target.playVideo();
        },
        onStateChange: ({ data }: PlayerEvent) => {
          if (data === 1) {
            if (!currentRef.current) return;
            setIsPlaying(true); setIsLoading(false); setError(null);
            const video = currentRef.current;
            if (video && startedRef.current !== video.id) { startedRef.current = video.id; onStartedRef.current?.(video); }
          } else if (data === 2 || data === 5) {
            setIsPlaying(false); setIsLoading(false);
          } else if (data === 3) setIsLoading(true);
          else if (data === 0) endedRef.current();
        },
        onError: () => {
          setError("YouTube không thể phát video này. Hãy thử video khác hoặc mở trên YouTube.");
          setIsPlaying(false); setIsLoading(false);
        },
      },
    });
    iframePlayerRef.current = created;
  }, []);

  useEffect(() => {
    let disposed = false;
    void loadApi().then(api => {
      if (disposed) return;
      apiRef.current = api;
      if (pendingRef.current) createPlayer(api, pendingRef.current.id, false);
      else if (preparedVideoIdRef.current) createPlayer(api, preparedVideoIdRef.current, true);
    }).catch(() => {
      if (!disposed) setError("Không tải được trình phát YouTube. Vui lòng thử lại.");
    });
    return () => {
      disposed = true;
      apiRef.current = null;
      readyRef.current = false;
      createdRef.current = false;
      iframePlayerRef.current?.destroy();
      iframePlayerRef.current = null;
    };
  }, [createPlayer]);

  const prepare = useCallback((video: Video) => {
    if (createdRef.current) return;
    preparedVideoIdRef.current = video.id;
    if (apiRef.current) createPlayer(apiRef.current, video.id, true);
  }, [createPlayer]);

  const resume = useCallback(() => {
    if (!currentRef.current) return;
    setError(null); setIsLoading(true);
    const player = iframePlayerRef.current;
    if (canControlPlayer(player)) player.playVideo();
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
    const player = iframePlayerRef.current;
    if (canControlPlayer(player)) {
      if (typeof player.unMute === "function") player.unMute();
      player.loadVideoById(video.id);
      player.playVideo();
    } else if (!createdRef.current && apiRef.current) {
      createPlayer(apiRef.current, video.id, false);
    }
  }, [createPlayer, resume]);

  const pause = useCallback(() => {
    const player = iframePlayerRef.current;
    if (canControlPlayer(player)) player.pauseVideo();
    setIsLoading(false);
  }, []);
  const toggle = useCallback(() => { if (isPlaying) pause(); else resume(); }, [isPlaying, pause, resume]);
  const seek = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const player = iframePlayerRef.current;
    if (readyRef.current && isYouTubePlayer(player)) player.seekTo(Math.max(0, seconds), true);
    setPosition(Math.max(0, seconds));
  }, []);
  const next = useCallback(() => {
    const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
    const following = queueRef.current[(index + 1) % queueRef.current.length];
    if (following) play(following, undefined, true);
  }, [play]);
  const previous = useCallback(() => {
    const player = iframePlayerRef.current;
    if (readyRef.current && isYouTubePlayer(player) && player.getCurrentTime() > 3) { seek(0); return; }
    const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
    const prior = queueRef.current[Math.max(0, index - 1)];
    if (prior) play(prior, undefined, true);
  }, [play, seek]);
  const retry = useCallback(() => { if (currentRef.current) play(currentRef.current, undefined, true); }, [play]);
  const close = useCallback(() => {
    pendingRef.current = null; currentRef.current = null; startedRef.current = "";
    const player = iframePlayerRef.current;
    if (isYouTubePlayer(player)) player.stopVideo();
    setCurrent(null); setIsPlaying(false); setIsLoading(false); setPosition(0); setDuration(0); setError(null);
  }, []);
  const setVolume = useCallback((value: number) => {
    const nextVolume = Math.max(0, Math.min(1, value));
    volumeRef.current = nextVolume;
    const player = iframePlayerRef.current;
    if (readyRef.current && isYouTubePlayer(player)) player.setVolume(Math.round(nextVolume * 100));
    updateVolume(nextVolume);
  }, []);
  const setRepeat = useCallback((value: boolean) => { repeatRef.current = value; updateRepeat(value); }, []);

  endedRef.current = () => {
    if (repeatRef.current && currentRef.current) play(currentRef.current, undefined, true);
    else {
      const index = queueRef.current.findIndex(item => item.id === currentRef.current?.id);
      const following = queueRef.current[index + 1];
      if (following) play(following, undefined, true);
      else setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!current) return;
    const timer = window.setInterval(() => {
      const player = iframePlayerRef.current;
      if (!readyRef.current || !isYouTubePlayer(player)) return;
      const nextPosition = player.getCurrentTime();
      const nextDuration = player.getDuration();
      if (Number.isFinite(nextPosition)) setPosition(nextPosition);
      if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [current]);

  return {
    hostRef, current, queue, isPlaying, isLoading, isReady, error, position, duration, volume, repeat,
    prepare, play, toggle, next, previous, seek, setVolume, setRepeat, retry, close,
  };
}

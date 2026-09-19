"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioHTMLAttributes } from "react";
import type { Video } from "./types";

type AudioPlayerOptions = {
  onStarted?: (video: Video) => void;
};

const MEDIA_ACTIONS: MediaSessionAction[] = [
  "play", "pause", "stop", "previoustrack", "nexttrack",
  "seekbackward", "seekforward", "seekto",
];

function updateMediaPosition(audio: HTMLAudioElement) {
  if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
  try {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      navigator.mediaSession.setPositionState();
      return;
    }
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(audio.duration, Math.max(0, audio.currentTime)),
    });
  } catch {
    // Older browsers implement only part of the Media Session API.
  }
}

function updateMediaPlayback(state: MediaSessionPlaybackState) {
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
}

/** Keep the returned audio element mounted throughout in-app navigation. */
export function useAudioPlayer({ onStarted }: AudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentRef = useRef<Video | null>(null);
  const queueRef = useRef<Video[]>([]);
  const sourceRef = useRef("");
  const selectionRef = useRef(0);
  const attemptRef = useRef(0);
  const startedSelectionRef = useRef(-1);
  const intendedPlayingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const diagnosisRef = useRef<AbortController | null>(null);
  const diagnosedSelectionRef = useRef(-1);
  const repeatRef = useRef(false);
  const onStartedRef = useRef(onStarted);

  const [current, setCurrent] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, updateVolume] = useState(1);
  const [repeat, updateRepeat] = useState(false);

  useEffect(() => { onStartedRef.current = onStarted; }, [onStarted]);

  const clearError = useCallback(() => {
    errorRef.current = null;
    setError(null);
    setErrorCode(null);
  }, []);

  const cancelPending = useCallback(() => {
    ++selectionRef.current;
    ++attemptRef.current;
    diagnosisRef.current?.abort();
    diagnosisRef.current = null;
  }, []);

  const matchesSource = useCallback((audio: HTMLAudioElement) => (
    Boolean(currentRef.current && sourceRef.current) &&
    audio.src === sourceRef.current &&
    (!audio.currentSrc || audio.currentSrc === sourceRef.current)
  ), []);

  const reportMediaError = useCallback((audio: HTMLAudioElement) => {
    if (!matchesSource(audio)) return;
    const selection = selectionRef.current;
    const fallback = audio.error?.code === 2
      ? "Kết nối âm thanh bị gián đoạn. Kiểm tra mạng rồi nhấn Thử lại."
      : "Không thể phát âm thanh của video này. Nhấn Thử lại hoặc chọn video khác.";

    intendedPlayingRef.current = false;
    errorRef.current = fallback;
    setError(fallback);
    setIsLoading(false);
    setIsPlaying(false);
    updateMediaPlayback("paused");

    if (diagnosedSelectionRef.current === selection) return;
    diagnosedSelectionRef.current = selection;
    diagnosisRef.current?.abort();
    const controller = new AbortController();
    diagnosisRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    // Read a tiny range only after failure, so the initial play() stays in the user gesture.
    void fetch(sourceRef.current, {
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const payload: unknown = await response.json();
        if (selection !== selectionRef.current || controller.signal.aborted) return;
        if (payload && typeof payload === "object") {
          const body = payload as Record<string, unknown>;
          const message = typeof body.loi === "string" ? body.loi : body.error;
          const code = typeof body.code === "string" ? body.code : null;
          if (typeof message === "string" && message.trim()) {
            errorRef.current = message.slice(0, 600);
            setError(errorRef.current);
            setErrorCode(code);
          }
        }
      } else {
        // A server may ignore Range; never consume a full audio file for diagnostics.
        await response.body?.cancel();
      }
    }).catch(() => {
      // The original playback error remains useful when the server cannot be reached.
    }).finally(() => {
      window.clearTimeout(timeout);
      if (diagnosisRef.current === controller) diagnosisRef.current = null;
    });
  }, [matchesSource]);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current || !sourceRef.current) return;
    const selection = selectionRef.current;
    const attempt = ++attemptRef.current;
    intendedPlayingRef.current = true;
    clearError();
    setIsLoading(audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);

    // Do not await extraction or React rendering before play(): mobile browsers need the gesture.
    void audio.play().catch((reason: unknown) => {
      if (selection !== selectionRef.current || attempt !== attemptRef.current) return;
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (audio.error) {
        reportMediaError(audio);
        return;
      }
      intendedPlayingRef.current = false;
      const message = reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Trình duyệt cần thao tác của bạn. Nhấn nút Phát để tiếp tục nghe."
        : "Không thể bắt đầu phát. Nhấn Thử lại hoặc chọn video khác.";
      errorRef.current = message;
      setError(message);
      setIsPlaying(false);
      setIsLoading(false);
      updateMediaPlayback("paused");
    });
  }, [clearError, reportMediaError]);

  const play = useCallback((video: Video, videos?: Video[], force = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (videos) {
      const seen = new Set<string>();
      const nextQueue = videos.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      if (!seen.has(video.id)) nextQueue.unshift(video);
      queueRef.current = nextQueue;
      setQueue(nextQueue);
    } else if (!queueRef.current.some((item) => item.id === video.id)) {
      queueRef.current = [video];
      setQueue([video]);
    }

    if (!force && currentRef.current?.id === video.id && !errorRef.current && !audio.error) {
      resume();
      return;
    }

    cancelPending();
    intendedPlayingRef.current = true;
    currentRef.current = video;
    setCurrent(video);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    clearError();
    audio.pause();
    sourceRef.current = new URL(`/api/youtube/audio?id=${encodeURIComponent(video.id)}`, window.location.origin).href;
    audio.src = sourceRef.current;
    audio.loop = repeatRef.current;
    audio.load();

    if ("mediaSession" in navigator) {
      if (typeof MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: video.title,
          artist: video.channel,
          album: "DuongTube",
          artwork: video.thumbnail ? [{ src: video.thumbnail }] : [],
        });
      }
      updateMediaPlayback("paused");
      updateMediaPosition(audio);
    }
    resume();
  }, [cancelPending, clearError, resume]);

  const pause = useCallback(() => {
    intendedPlayingRef.current = false;
    ++attemptRef.current;
    audioRef.current?.pause();
    setIsLoading(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (!audio.paused || intendedPlayingRef.current) pause();
    else if (audio.error || errorRef.current) play(currentRef.current, undefined, true);
    else resume();
  }, [pause, play, resume]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    setPosition(audio.currentTime);
    updateMediaPosition(audio);
  }, []);

  const next = useCallback(() => {
    const videos = queueRef.current;
    if (!videos.length) return;
    const index = videos.findIndex((item) => item.id === currentRef.current?.id);
    play(videos[(index + 1) % videos.length], undefined, true);
  }, [play]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }
    const videos = queueRef.current;
    if (!videos.length) return;
    const index = videos.findIndex((item) => item.id === currentRef.current?.id);
    play(videos[Math.max(0, index - 1)], undefined, true);
  }, [play, seek]);

  const retry = useCallback(() => {
    if (currentRef.current) play(currentRef.current, undefined, true);
  }, [play]);

  const close = useCallback(() => {
    cancelPending();
    intendedPlayingRef.current = false;
    currentRef.current = null;
    sourceRef.current = "";
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPosition(0);
    setDuration(0);
    clearError();
    updateMediaPlayback("none");
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      try { navigator.mediaSession.setPositionState?.(); } catch { /* Partial API support. */ }
    }
  }, [cancelPending, clearError]);

  const setVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.volume = Math.max(0, Math.min(1, value));
    updateVolume(audio.volume);
  }, []);

  const setRepeat = useCallback((value: boolean) => {
    repeatRef.current = value;
    if (audioRef.current) audioRef.current.loop = value;
    updateRepeat(value);
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => {
        if (audioRef.current?.error || errorRef.current) retry();
        else resume();
      },
      pause,
      stop: () => { pause(); seek(0); },
      previoustrack: previous,
      nexttrack: next,
      seekbackward: ({ seekOffset }) => seek((audioRef.current?.currentTime ?? 0) - (seekOffset ?? 10)),
      seekforward: ({ seekOffset }) => seek((audioRef.current?.currentTime ?? 0) + (seekOffset ?? 10)),
      seekto: ({ seekTime }) => { if (seekTime !== undefined) seek(seekTime); },
    };
    for (const action of MEDIA_ACTIONS) {
      try { session.setActionHandler(action, handlers[action] ?? null); } catch { /* Unsupported action. */ }
    }
    return () => {
      for (const action of MEDIA_ACTIONS) {
        try { session.setActionHandler(action, null); } catch { /* Unsupported action. */ }
      }
    };
  }, [next, pause, previous, resume, retry, seek]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      cancelPending();
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
        updateMediaPlayback("none");
      }
    };
  }, [cancelPending]);

  const audioProps: AudioHTMLAttributes<HTMLAudioElement> = {
    preload: "none",
    onPlaying: ({ currentTarget: audio }) => {
      if (!matchesSource(audio) || audio.paused || audio.error || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      intendedPlayingRef.current = true;
      setIsPlaying(true);
      setIsLoading(false);
      clearError();
      updateMediaPlayback("playing");
      updateMediaPosition(audio);
      if (startedSelectionRef.current !== selectionRef.current && currentRef.current) {
        startedSelectionRef.current = selectionRef.current;
        onStartedRef.current?.(currentRef.current);
      }
    },
    onPause: ({ currentTarget: audio }) => {
      if (!matchesSource(audio) || !audio.paused) return;
      intendedPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoading(false);
      updateMediaPlayback("paused");
      updateMediaPosition(audio);
    },
    onWaiting: ({ currentTarget: audio }) => {
      if (matchesSource(audio) && !audio.paused && !audio.error) setIsLoading(true);
    },
    onCanPlay: ({ currentTarget: audio }) => {
      if (matchesSource(audio) && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) setIsLoading(false);
    },
    onLoadedMetadata: ({ currentTarget: audio }) => {
      if (!matchesSource(audio)) return;
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      updateMediaPosition(audio);
    },
    onDurationChange: ({ currentTarget: audio }) => {
      if (!matchesSource(audio)) return;
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      updateMediaPosition(audio);
    },
    onTimeUpdate: ({ currentTarget: audio }) => {
      if (!matchesSource(audio)) return;
      setPosition(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      updateMediaPosition(audio);
    },
    onRateChange: ({ currentTarget: audio }) => updateMediaPosition(audio),
    onVolumeChange: ({ currentTarget: audio }) => updateVolume(audio.muted ? 0 : audio.volume),
    onError: ({ currentTarget: audio }) => { if (audio.error) reportMediaError(audio); },
    onEnded: ({ currentTarget: audio }) => {
      if (!matchesSource(audio) || !audio.ended) return;
      intendedPlayingRef.current = false;
      setIsPlaying(false);
      setIsLoading(false);
      updateMediaPlayback("paused");
      if (repeatRef.current) {
        audio.currentTime = 0;
        resume();
        return;
      }
      const index = queueRef.current.findIndex((item) => item.id === currentRef.current?.id);
      const following = queueRef.current[index + 1];
      if (following) play(following, undefined, true);
    },
  };

  return {
    audioRef, audioProps, current, queue, isPlaying, isLoading, error, errorCode,
    position, duration, volume, repeat,
    play, toggle, next, previous, seek, setVolume, setRepeat, retry, close,
  };
}

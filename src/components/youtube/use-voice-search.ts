"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechResultEvent = Event & {
  results: ArrayLike<{ 0?: { transcript?: string } }>;
};

type SpeechErrorEvent = Event & { error?: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  start(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceSearchOptions = {
  onCaptureStart?: () => void;
  onCaptureEnd?: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function messageFor(error?: string) {
  if (error === "not-allowed" || error === "service-not-allowed") return "Hãy cho phép DuongTube sử dụng micro rồi thử lại.";
  if (error === "no-speech") return "Chưa nghe thấy giọng nói. Hãy nói gần micro hơn.";
  if (error === "audio-capture") return "Không tìm thấy micro khả dụng trên thiết bị.";
  if (error === "network") return "Nhận dạng giọng nói cần kết nối mạng. Hãy thử lại.";
  if (error === "aborted") return "";
  return "Chưa thể nhận dạng giọng nói. Hãy thử lại.";
}

export function useVoiceSearch(
  onResult: (transcript: string) => void,
  { onCaptureStart, onCaptureEnd }: VoiceSearchOptions = {},
) {
  const onResultRef = useRef(onResult);
  const onCaptureStartRef = useRef(onCaptureStart);
  const onCaptureEndRef = useRef(onCaptureEnd);
  const constructorRef = useRef<SpeechRecognitionConstructor | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const releaseTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onResultRef.current = onResult;
    onCaptureStartRef.current = onCaptureStart;
    onCaptureEndRef.current = onCaptureEnd;
  }, [onCaptureEnd, onCaptureStart, onResult]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    constructorRef.current = Recognition || null;
    setSupported(Boolean(Recognition));

    return () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (watchdogTimerRef.current !== null) {
        window.clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      constructorRef.current = null;
      if (!recognition) return;

      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        // The browser may already have closed the input device.
      }
    };
  }, []);

  const release = useCallback((recognition: SpeechRecognitionLike, abort = true) => {
    if (recognitionRef.current !== recognition) return;

    if (watchdogTimerRef.current !== null) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    recognitionRef.current = null;
    recognition.onstart = null;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;

    if (abort) {
      try {
        recognition.abort();
      } catch {
        // The browser may already have closed the input device.
      }
    }

    setListening(false);
  }, []);

  const finish = useCallback((
    recognition: SpeechRecognitionLike,
    afterRelease?: () => void,
    abort = true,
  ) => {
    if (recognitionRef.current !== recognition) return;
    release(recognition, abort);

    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = null;
      try {
        afterRelease?.();
      } finally {
        onCaptureEndRef.current?.();
      }
    }, 450);
  }, [release]);

  const toggle = useCallback(() => {
    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      finish(activeRecognition);
      return;
    }

    const Recognition = constructorRef.current;
    if (!Recognition || releaseTimerRef.current !== null) return;
    setError("");

    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      setListening(true);
      setError("");
    };
    recognition.onend = () => finish(recognition, undefined, false);
    recognition.onerror = event => {
      const message = messageFor(event.error);
      finish(recognition);
      if (message) setError(message);
    };
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";

      if (!transcript) {
        finish(recognition);
        setError("Chưa nghe rõ từ khóa. Hãy thử lại.");
        return;
      }

      finish(recognition, () => onResultRef.current(transcript));
    };

    recognitionRef.current = recognition;
    try {
      setListening(true);
      onCaptureStartRef.current?.();
      recognition.start();
      watchdogTimerRef.current = window.setTimeout(() => {
        if (recognitionRef.current !== recognition) return;
        setError("Micro không tự dừng. DuongTube đã đóng micro, hãy thử lại.");
        finish(recognition);
      }, 12_000);
    } catch {
      finish(recognition);
      setError("Micro đang bận. Hãy đợi một chút rồi thử lại.");
    }
  }, [finish]);

  return { supported, listening, error, toggle, clearError: () => setError("") };
}

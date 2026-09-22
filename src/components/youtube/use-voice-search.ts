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

type MicrophonePermissionState = "unknown" | "prompt" | "granted" | "denied" | "remembered";
const MICROPHONE_PERMISSION_KEY = "duongtube-microphone-enabled";

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
  const permissionRequestRef = useRef(false);
  const permissionStoredRef = useRef(false);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<MicrophonePermissionState>("unknown");

  useEffect(() => {
    onResultRef.current = onResult;
    onCaptureStartRef.current = onCaptureStart;
    onCaptureEndRef.current = onCaptureEnd;
  }, [onCaptureEnd, onCaptureStart, onResult]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    constructorRef.current = Recognition || null;
    setSupported(Boolean(Recognition));

    let disposed = false;
    let permissionStatus: PermissionStatus | null = null;
    let syncPermission: (() => void) | null = null;
    try {
      permissionStoredRef.current = localStorage.getItem(MICROPHONE_PERMISSION_KEY) === "1";
      if (permissionStoredRef.current) setPermission("remembered");
    } catch { /* Storage may be unavailable. */ }
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: "microphone" as PermissionName }).then(status => {
        if (disposed) return;
        permissionStatus = status;
        syncPermission = () => setPermission(status.state === "prompt" && permissionStoredRef.current ? "remembered" : status.state);
        syncPermission();
        status.addEventListener("change", syncPermission);
      }).catch(() => { /* Safari may not expose microphone through Permissions API. */ });
    }

    return () => {
      disposed = true;
      if (permissionStatus && syncPermission) permissionStatus.removeEventListener("change", syncPermission);
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
      permissionRequestRef.current = false;
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

  const requestRememberedPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      try { localStorage.setItem(MICROPHONE_PERMISSION_KEY, "1"); } catch { /* Storage may be unavailable. */ }
      permissionStoredRef.current = true;
      setPermission("granted");
      return true;
    } catch {
      permissionStoredRef.current = false;
      try { localStorage.removeItem(MICROPHONE_PERMISSION_KEY); } catch { /* Storage may be unavailable. */ }
      setPermission("denied");
      setError("iOS chưa cho phép dùng micro. Hãy đặt Micro thành Cho phép trong cài đặt của DuongTube rồi thử lại.");
      return false;
    }
  }, []);

  const toggle = useCallback(() => {
    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      finish(activeRecognition);
      return;
    }

    const Recognition = constructorRef.current;
    if (!Recognition || releaseTimerRef.current !== null || permissionRequestRef.current) return;
    setError("");

    permissionRequestRef.current = true;
    setListening(true);
    onCaptureStartRef.current?.();
    void (async () => {
      const remembered = permission === "granted" || permission === "remembered";
      const allowed = remembered || await requestRememberedPermission();
      permissionRequestRef.current = false;
      if (!allowed) {
        setListening(false);
        releaseTimerRef.current = window.setTimeout(() => {
          releaseTimerRef.current = null;
          onCaptureEndRef.current?.();
        }, 450);
        return;
      }
      if (constructorRef.current !== Recognition) return;

      const recognition = new Recognition();
      recognition.lang = "vi-VN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        try { localStorage.setItem(MICROPHONE_PERMISSION_KEY, "1"); } catch { /* Storage may be unavailable. */ }
        permissionStoredRef.current = true;
        setPermission("granted");
        setListening(true);
        setError("");
      };
      recognition.onend = () => finish(recognition, undefined, false);
      recognition.onerror = event => {
        const message = messageFor(event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          permissionStoredRef.current = false;
          try { localStorage.removeItem(MICROPHONE_PERMISSION_KEY); } catch { /* Storage may be unavailable. */ }
          setPermission("denied");
        }
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
    })();
  }, [finish, permission, requestRememberedPermission]);

  return { supported, listening, permission, error, toggle, clearError: () => setError("") };
}

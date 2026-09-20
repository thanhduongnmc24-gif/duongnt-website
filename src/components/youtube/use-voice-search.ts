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
  stop(): void;
  abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

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

export function useVoiceSearch(onResult: (transcript: string) => void) {
  const onResultRef = useRef(onResult);
  const constructorRef = useRef<SpeechRecognitionConstructor | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    constructorRef.current = Recognition || null;
    setSupported(Boolean(Recognition));

    return () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
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

  const toggle = useCallback(() => {
    const activeRecognition = recognitionRef.current;
    if (activeRecognition) {
      release(activeRecognition);
      return;
    }

    const Recognition = constructorRef.current;
    if (!Recognition) return;

    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
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
    recognition.onend = () => release(recognition, false);
    recognition.onerror = event => {
      const message = messageFor(event.error);
      release(recognition);
      if (message) setError(message);
    };
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
      release(recognition);

      if (!transcript) {
        setError("Chưa nghe rõ từ khóa. Hãy thử lại.");
        return;
      }

      // WebKit restores the media output session asynchronously after the
      // microphone is closed. Let it finish before search updates the player.
      resultTimerRef.current = window.setTimeout(() => {
        resultTimerRef.current = null;
        onResultRef.current(transcript);
      }, 200);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      release(recognition);
      setError("Micro đang bận. Hãy đợi một chút rồi thử lại.");
    }
  }, [release]);

  return { supported, listening, error, toggle, clearError: () => setError("") };
}

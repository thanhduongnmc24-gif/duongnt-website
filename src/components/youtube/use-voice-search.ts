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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setError(""); };
    recognition.onend = () => setListening(false);
    recognition.onerror = event => { setListening(false); setError(messageFor(event.error)); };
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
      if (transcript) onResultRef.current(transcript);
      else setError("Chưa nghe rõ từ khóa. Hãy thử lại.");
    };
    recognitionRef.current = recognition;
    setSupported(true);
    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError("");
    try {
      if (listening) recognition.stop();
      else recognition.start();
    } catch {
      setListening(false);
      setError("Micro đang bận. Hãy đợi một chút rồi thử lại.");
    }
  }, [listening]);

  return { supported, listening, error, toggle, clearError: () => setError("") };
}

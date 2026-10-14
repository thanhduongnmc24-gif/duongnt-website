"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  Download,
  Images,
  Image as ImageIcon,
  Link2,
  Moon,
  RotateCcw,
  ScanLine,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UserCircle2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useDemThepPwa } from "@/components/demthep/use-demthep-pwa";
import "./demthep.css";

const SERVER_URL_KEY = "SERVER_URL";
const MIN_CONF_KEY = "MIN_CONF";
const ALERT_CONF_KEY = "ALERT_CONF";
const HISTORY_KEY = "DEMTHEP_HISTORY";
const THEME_KEY = "APP_THEME";

const DEFAULT_SERVER_URL = "https://byvn.net/demthep";
const DEFAULT_MIN_CONF = "0.6";
const DEFAULT_ALERT_CONF = "0.7";
const MAX_BATCH_SELECTION = 10;
const MAX_HISTORY_ITEMS = 25;

type HistoryItem = {
  id: string;
  originalImage: string;
  processedImage?: string;
  count: number;
  date: string;
};

type BatchItem = {
  id: string;
  originalImage: string;
  processedImage: string | null;
  count: number | null;
  resultImages: { v1: string | null; v2: string | null; v3: string | null };
  status: "loading" | "success" | "error" | "idle";
  processingTime: number | null;
};

function normalizeStoredConf(value: string | null, fallback: string): string {
  if (!value || value.trim() === "") return fallback;
  const normalizedText = value.trim().replace(",", ".");
  const numberValue = Number(normalizedText);
  if (Number.isNaN(numberValue)) return fallback;
  if (numberValue > 1) {
    return String(numberValue / 100);
  }
  return normalizedText;
}

function formatHistoryDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${mo}/`;
  } catch {
    return isoDate;
  }
}

async function resizeImageFile(file: File, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const img = new window.Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const ratio = img.width > 0 ? maxWidth / img.width : 1;
          const targetW = maxWidth;
          const targetH = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function dataUrlToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

function SteelImageViewer({
  imageUri,
  resetTrigger,
}: {
  imageUri: string;
  resetTrigger: string;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const pinchDistRef = useRef<number | null>(null);
  const pinchScaleRef = useRef(1);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [imageUri, resetTrigger]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const clampScale = (next: number) => Math.min(5, Math.max(1, Number(next.toFixed(2))));

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      resetZoom();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (scale <= 1) return;
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingRef.current || scale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.ox + dx,
      y: dragStartRef.current.oy + dy,
    });
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      pinchScaleRef.current = scale;
      draggingRef.current = false;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        resetZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        draggingRef.current = true;
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offset.x,
          oy: offset.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = clampScale(pinchScaleRef.current * (dist / pinchDistRef.current));
      setScale(next);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1 && draggingRef.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setOffset({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
    draggingRef.current = false;
  };

  return (
    <div
      className="dt-viewer-viewport"
      onWheel={handleWheel}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUri}
        alt="Ảnh đếm thép"
        className="dt-main-image"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
        }}
      />

      <div className="dt-zoom-controls" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="dt-zoom-btn"
          title="Thu nhỏ"
          onClick={() => {
            const next = clampScale(scale - 0.5);
            setScale(next);
            if (next === 1) setOffset({ x: 0, y: 0 });
          }}
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          className="dt-zoom-btn"
          title="Đặt lại khung nhìn (hoặc chạm đúp vào ảnh)"
          onClick={resetZoom}
        >
          {scale > 1 ? `${Math.round(scale * 100)}%` : <RotateCcw size={13} />}
        </button>
        <button
          type="button"
          className="dt-zoom-btn"
          title="Phóng to"
          onClick={() => setScale((prev) => clampScale(prev + 0.5))}
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
}

export default function DemThepPage() {
  const { canInstall, installed, updateAvailable, install, update } = useDemThepPwa();

  const [activeTab, setActiveTab] = useState<"count" | "settings">("count");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Settings state
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [minConf, setMinConf] = useState<string>(DEFAULT_MIN_CONF);
  const [alertConf, setAlertConf] = useState<string>(DEFAULT_ALERT_CONF);

  // Counting workspace state
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentMode, setCurrentMode] = useState<number>(1);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load initial settings, theme, and history from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        setTheme("light");
      } else {
        setTheme("dark");
      }

      const savedUrl = localStorage.getItem(SERVER_URL_KEY);
      const savedMinConf = localStorage.getItem(MIN_CONF_KEY);
      const savedAlertConf = localStorage.getItem(ALERT_CONF_KEY);

      const nextServerUrl =
        savedUrl && savedUrl.trim() !== "" ? savedUrl.trim() : DEFAULT_SERVER_URL;
      const nextMinConf = normalizeStoredConf(savedMinConf, DEFAULT_MIN_CONF);
      const nextAlertConf = normalizeStoredConf(savedAlertConf, DEFAULT_ALERT_CONF);

      setServerUrl(nextServerUrl);
      setMinConf(nextMinConf);
      setAlertConf(nextAlertConf);

      localStorage.setItem(SERVER_URL_KEY, nextServerUrl);
      localStorage.setItem(MIN_CONF_KEY, nextMinConf);
      localStorage.setItem(ALERT_CONF_KEY, nextAlertConf);

      localStorage.removeItem("ACTIVE_SERVER");
      localStorage.removeItem("COLAB_URL");
      localStorage.removeItem("HF_URL");
      localStorage.removeItem("KAGGLE_URL");

      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (err) {
      console.error("Lỗi khởi tạo dữ liệu Đếm thép:", err);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const handleSaveServerUrl = (text: string) => {
    setServerUrl(text);
    try {
      localStorage.setItem(SERVER_URL_KEY, text);
    } catch {
      /* ignore */
    }
  };

  const handleSaveMinConf = (text: string) => {
    setMinConf(text);
    try {
      localStorage.setItem(MIN_CONF_KEY, text);
    } catch {
      /* ignore */
    }
  };

  const handleSaveAlertConf = (text: string) => {
    setAlertConf(text);
    try {
      localStorage.setItem(ALERT_CONF_KEY, text);
    } catch {
      /* ignore */
    }
  };

  const persistHistorySafely = (items: HistoryItem[]) => {
    let list = items.slice(0, MAX_HISTORY_ITEMS);
    while (list.length > 0) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
        return list;
      } catch {
        // Trim oldest item if localStorage quota is exceeded by base64 images
        list = list.slice(0, list.length - 1);
      }
    }
    return [];
  };

  const saveToHistory = useCallback(
    (original: string, processed: string | undefined, count: number) => {
      const newItem: HistoryItem = {
        id: `${Date.now()}-${Math.random()}`,
        originalImage: original,
        processedImage: processed,
        count,
        date: new Date().toISOString(),
      };

      setHistory((prev) => {
        const updated = [newItem, ...prev];
        return persistHistorySafely(updated);
      });
    },
    []
  );

  const clearHistory = () => {
    if (window.confirm("Anh hai có chắc muốn xóa hết lịch sử đếm không?")) {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {
        /* ignore */
      }
      setHistory([]);
    }
  };

  const viewHistoryItem = (item: HistoryItem) => {
    setBatch([
      {
        id: item.id,
        originalImage: item.originalImage,
        processedImage: item.processedImage || null,
        count: item.count,
        resultImages: {
          v1: item.processedImage || null,
          v2: null,
          v3: null,
        },
        status: "success",
        processingTime: null,
      },
    ]);
    setActiveIndex(0);
    setCurrentMode(1);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sendPredictRequest = async (
    blob: Blob,
    targetServerUrl: string,
    normalizedMinConf: string,
    normalizedAlertConf: string,
    filterFlag: boolean
  ) => {
    // 1. Call Next.js proxy route /api/demthep/predict first to avoid CORS & preserve POST across shortlink redirects
    try {
      const proxyForm = new FormData();
      proxyForm.append("file", blob, "image.jpg");
      proxyForm.append("server_url", targetServerUrl);
      proxyForm.append("min_conf", normalizedMinConf);
      proxyForm.append("alert_conf", normalizedAlertConf);
      proxyForm.append("is_filtering", filterFlag ? "true" : "false");

      const proxyRes = await fetch("/api/demthep/predict", {
        method: "POST",
        body: proxyForm,
      });

      const proxyData = await proxyRes.json().catch(() => null);
      if (proxyRes.ok && proxyData && !proxyData.error) {
        return proxyData;
      }

      // If user configured a local LAN/localhost server, fall through to direct browser fetch
      if (!proxyData?.directOnly && proxyData?.error) {
        throw new Error(proxyData.error);
      }
    } catch (proxyErr: unknown) {
      // If proxy returned a specific upstream error message, surface it; otherwise try direct fetch
      const msg = proxyErr instanceof Error ? proxyErr.message : "";
      if (
        msg.startsWith("Máy chủ lỗi") ||
        msg.startsWith("Máy chủ không trả JSON") ||
        msg.startsWith("Link máy chủ")
      ) {
        throw proxyErr;
      }
    }

    // 2. Fallback: direct browser fetch (for localhost / LAN endpoints or direct CORS-enabled endpoints)
    const directForm = new FormData();
    directForm.append("file", blob, "image.jpg");
    directForm.append("min_conf", normalizedMinConf);
    directForm.append("alert_conf", normalizedAlertConf);
    directForm.append("is_filtering", filterFlag ? "true" : "false");

    const response = await fetch(targetServerUrl, {
      method: "POST",
      body: directForm,
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Máy chủ lỗi ${response.status}: ${responseText.slice(0, 120)}`
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Máy chủ không trả JSON. Có thể link rút gọn đang trả HTML hoặc redirect sai."
      );
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const processSingleImage = async (
    uri: string,
    targetIndex: number,
    currentFilterMode: boolean,
    startTime?: number
  ) => {
    const processStartTime = startTime || Date.now();
    setErrorMessage(null);

    setBatch((prev) => {
      const next = [...prev];
      if (!next[targetIndex]) return prev;
      next[targetIndex] = {
        ...next[targetIndex],
        status: "loading",
        processingTime: null,
      };
      return next;
    });

    try {
      const savedUrl = localStorage.getItem(SERVER_URL_KEY);
      const savedMinConf = localStorage.getItem(MIN_CONF_KEY);
      const savedAlertConf = localStorage.getItem(ALERT_CONF_KEY);

      const currentServerUrl =
        savedUrl && savedUrl.trim() !== ""
          ? savedUrl.trim()
          : DEFAULT_SERVER_URL;
      const normalizedMin = normalizeStoredConf(savedMinConf, DEFAULT_MIN_CONF);
      const normalizedAlert = normalizeStoredConf(
        savedAlertConf,
        DEFAULT_ALERT_CONF
      );

      localStorage.setItem(SERVER_URL_KEY, currentServerUrl);
      localStorage.setItem(MIN_CONF_KEY, normalizedMin);
      localStorage.setItem(ALERT_CONF_KEY, normalizedAlert);

      const blob = await dataUrlToBlob(uri);
      const data = await sendPredictRequest(
        blob,
        currentServerUrl,
        normalizedMin,
        normalizedAlert,
        currentFilterMode
      );

      if (data.count !== undefined) {
        const elapsedSeconds = Number(
          ((Date.now() - processStartTime) / 1000).toFixed(1)
        );
        const uri1 = data.image_v1
          ? `data:image/jpeg;base64,${data.image_v1}`
          : null;
        const fallbackUri =
          uri1 ||
          (data.image_base64
            ? `data:image/jpeg;base64,${data.image_base64}`
            : null);

        setBatch((prev) => {
          const next = [...prev];
          if (!next[targetIndex]) return prev;
          next[targetIndex] = {
            ...next[targetIndex],
            count: data.count,
            resultImages: {
              v1: uri1,
              v2: data.image_v2
                ? `data:image/jpeg;base64,${data.image_v2}`
                : null,
              v3: data.image_v3
                ? `data:image/jpeg;base64,${data.image_v3}`
                : null,
            },
            processedImage: fallbackUri,
            status: "success",
            processingTime: elapsedSeconds,
          };
          return next;
        });

        if (fallbackUri && !currentFilterMode) {
          saveToHistory(uri, fallbackUri, data.count);
        }
      } else {
        throw new Error("Lỗi dữ liệu trả về!");
      }
    } catch (error: unknown) {
      const elapsedSeconds = Number(
        ((Date.now() - processStartTime) / 1000).toFixed(1)
      );
      const message =
        error instanceof Error
          ? error.message
          : "Không thể kết nối máy chủ.";

      setBatch((prev) => {
        const next = [...prev];
        if (!next[targetIndex]) return prev;
        next[targetIndex] = {
          ...next[targetIndex],
          status: "error",
          processingTime: elapsedSeconds,
        };
        return next;
      });

      setErrorMessage(message);
    }
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, MAX_BATCH_SELECTION);
    event.target.value = "";

    try {
      const batchStartTime = Date.now();
      const initialBatch: BatchItem[] = await Promise.all(
        files.map(async (file, index) => {
          const resizedDataUrl = await resizeImageFile(file, 1024, 0.7);
          return {
            id: `${Date.now()}-${index}`,
            originalImage: resizedDataUrl,
            processedImage: null,
            count: null,
            resultImages: { v1: null, v2: null, v3: null },
            status: "loading",
            processingTime: null,
          };
        })
      );

      setBatch(initialBatch);
      setActiveIndex(0);
      setCurrentMode(1);
      setErrorMessage(null);
      window.scrollTo({ top: 0, behavior: "smooth" });

      for (let i = 0; i < initialBatch.length; i++) {
        setActiveIndex(i);
        await processSingleImage(
          initialBatch[i].originalImage,
          i,
          isFiltering,
          batchStartTime
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể mở Camera hoặc Thư viện ảnh.";
      setErrorMessage(message);
    }
  };

  const toggleFilter = () => {
    const newMode = !isFiltering;
    const filterStartTime = Date.now();
    setIsFiltering(newMode);

    if (batch.length > 0 && activeIndex >= 0 && batch[activeIndex]) {
      void processSingleImage(
        batch[activeIndex].originalImage,
        activeIndex,
        newMode,
        filterStartTime
      );
    }
  };

  const currentActiveItem = batch[activeIndex];

  const getDisplayImage = (): string | null => {
    if (!currentActiveItem) return null;
    if (currentMode === 1 && currentActiveItem.resultImages.v1)
      return currentActiveItem.resultImages.v1;
    if (currentMode === 2 && currentActiveItem.resultImages.v2)
      return currentActiveItem.resultImages.v2;
    if (currentMode === 3 && currentActiveItem.resultImages.v3)
      return currentActiveItem.resultImages.v3;
    return currentActiveItem.processedImage || currentActiveItem.originalImage;
  };

  const displayUri = getDisplayImage();
  const isCurrentlyLoading = currentActiveItem?.status === "loading";
  const viewerResetKey = `${currentActiveItem?.id || "empty"}-${currentMode}-${
    currentActiveItem?.status || "idle"
  }-${displayUri ? displayUri.length : 0}`;

  return (
    <div className={`dt-app ${theme === "dark" ? "dt-dark" : "dt-light"}`}>
      {/* Hidden File Inputs for Camera & Photo Library */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="dt-hidden-input"
        onChange={handleFilesSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="dt-hidden-input"
        onChange={handleFilesSelected}
      />

      <main className="dt-container">
        {updateAvailable && (
          <div className="dt-pwa-banner">
            <span className="dt-pwa-banner-text">
              <Sparkles size={16} /> Đã có bản cập nhật mới cho Đếm thép
            </span>
            <button type="button" className="dt-pwa-banner-btn" onClick={update}>
              Cập nhật
            </button>
          </div>
        )}

        {activeTab === "count" ? (
          <>
            {/* Header */}
            <header className="dt-header">
              <div className="dt-header-side" />
              <div className="dt-header-center">
                <div className="dt-name-badge">
                  <UserCircle2 size={17} />
                  <span className="dt-subtitle">
                    Nguyễn Thanh Dương - HPDQ01016
                  </span>
                </div>
              </div>
              <div className="dt-header-side">
                {canInstall ? (
                  <button
                    type="button"
                    className="dt-header-icon-btn"
                    title="Cài đặt ứng dụng Đếm thép"
                    onClick={install}
                  >
                    <Download size={16} />
                  </button>
                ) : null}
              </div>
            </header>

            {/* Image Workspace Panel */}
            <section className="dt-image-panel">
              {isCurrentlyLoading ? (
                <div className="dt-loading-box">
                  <div className="dt-spinner" />
                  <span className="dt-loading-text">Đang đếm thép...</span>
                </div>
              ) : displayUri ? (
                <SteelImageViewer
                  key={viewerResetKey}
                  imageUri={displayUri}
                  resetTrigger={viewerResetKey}
                />
              ) : (
                <div className="dt-placeholder-box">
                  <ImageIcon size={50} strokeWidth={1.5} color="var(--dt-subtext)" />
                  <span className="dt-placeholder-text">
                    Chưa có ảnh nào được chọn
                  </span>
                </div>
              )}
            </section>

            {/* Error Alert */}
            {errorMessage && (
              <div className="dt-error-alert" role="alert">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  aria-label="Đóng thông báo lỗi"
                  onClick={() => setErrorMessage(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Total Count & Processing Time */}
            {currentActiveItem?.status === "success" &&
              currentActiveItem?.count !== null && (
                <div className="dt-total-container">
                  <div className="dt-total-row">
                    <span
                      className={`dt-total-text ${
                        isFiltering ? "is-filtering" : ""
                      }`}
                    >
                      {isFiltering
                        ? `ĐANG LỌC: ${currentActiveItem.count} LỖI`
                        : `Tổng: ${currentActiveItem.count} cây`}
                    </span>
                    {currentActiveItem.processingTime !== null && (
                      <span className="dt-processing-time">
                        {currentActiveItem.processingTime} giây
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* Multi-Image Batch Thumbnails */}
            {batch.length > 1 && (
              <div className="dt-thumbnail-container">
                {batch.map((item, idx) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`dt-thumb-wrap ${
                      activeIndex === idx ? "is-active" : ""
                    } ${item.status === "error" ? "is-error" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.processedImage || item.originalImage}
                      alt={`Ảnh ${idx + 1}`}
                      className="dt-thumb-image"
                    />
                    {item.status === "loading" && (
                      <div className="dt-thumb-overlay">
                        <div className="dt-spinner-sm" />
                      </div>
                    )}
                    {item.status === "success" && item.count !== null && (
                      <span className="dt-thumb-badge">{item.count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Mode & Filter Controls */}
            <div className="dt-control-row">
              <button
                type="button"
                className={`dt-mode-btn ${currentMode === 1 ? "is-active" : ""}`}
                onClick={() => setCurrentMode(1)}
              >
                Khung
              </button>
              <button
                type="button"
                className={`dt-mode-btn ${currentMode === 2 ? "is-active" : ""}`}
                onClick={() => setCurrentMode(2)}
              >
                K+Số
              </button>
              <button
                type="button"
                className={`dt-mode-btn ${currentMode === 3 ? "is-active" : ""}`}
                onClick={() => setCurrentMode(3)}
              >
                Số
              </button>
              <button
                type="button"
                className={`dt-mode-btn ${
                  isFiltering ? "is-filter-active" : ""
                }`}
                onClick={toggleFilter}
              >
                {isFiltering ? "Tắt Lọc" : "Bật Lọc"}
              </button>
            </div>

            {/* Capture / Pick Image Buttons */}
            <div className="dt-button-row">
              <button
                type="button"
                className="dt-action-btn primary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={22} />
                <span>Chụp Ảnh</span>
              </button>
              <button
                type="button"
                className="dt-action-btn secondary"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Images size={22} />
                <span>Chọn Ảnh</span>
              </button>
            </div>

            <div className="dt-separator" />

            {/* Recent History */}
            <div className="dt-history-header">
              <h2 className="dt-history-title">Lịch Sử Đếm Gần Đây</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  className="dt-clear-btn"
                  title="Xóa lịch sử"
                  onClick={clearHistory}
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="dt-empty-history">Chưa có lịch sử.</p>
            ) : (
              <div className="dt-history-list">
                {history.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="dt-history-card"
                    onClick={() => viewHistoryItem(item)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.processedImage || item.originalImage}
                      alt={`${item.count} cây`}
                      className="dt-history-thumb"
                    />
                    <div className="dt-history-info">
                      <span className="dt-history-count">{item.count} cây</span>
                      <span className="dt-history-date">
                        {formatHistoryDate(item.date)}
                      </span>
                    </div>
                    <ChevronRight size={16} color="var(--dt-subtext)" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Settings Tab */
          <section>
            <div className="dt-settings-header">
              <h1 className="dt-settings-title">Cài Đặt</h1>
            </div>

            <h2 className="dt-section-title">🌐 LINK MÁY CHỦ ĐẾM THÉP</h2>
            <div className="dt-card">
              <div className="dt-row">
                <Link2 size={26} color="var(--dt-primary)" />
                <div className="dt-row-body">
                  <label className="dt-label-primary" htmlFor="dt-server-url">
                    Link máy chủ
                  </label>
                  <input
                    id="dt-server-url"
                    type="url"
                    className="dt-auth-input"
                    placeholder="https://.../predict"
                    value={serverUrl}
                    onChange={(e) => handleSaveServerUrl(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {serverUrl !== DEFAULT_SERVER_URL && (
                    <button
                      type="button"
                      className="dt-reset-link-btn"
                      onClick={() => handleSaveServerUrl(DEFAULT_SERVER_URL)}
                    >
                      Khôi phục mặc định ({DEFAULT_SERVER_URL})
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h2 className="dt-section-title">⚙️ THÔNG SỐ ĐẾM THÉP</h2>
            <div className="dt-card">
              <div className="dt-row">
                <SlidersHorizontal size={26} color="var(--dt-primary)" />
                <div className="dt-row-body">
                  <label className="dt-label-title" htmlFor="dt-min-conf">
                    Ngưỡng đếm thép (Min)
                  </label>
                  <span className="dt-label-sub">Mặc định: 0.6</span>
                </div>
                <input
                  id="dt-min-conf"
                  type="text"
                  inputMode="decimal"
                  className="dt-number-input"
                  placeholder="0.6"
                  value={minConf}
                  onChange={(e) => handleSaveMinConf(e.target.value)}
                />
              </div>

              <div className="dt-setting-row">
                <AlertTriangle size={26} color="#EAB308" />
                <div className="dt-row-body">
                  <label className="dt-label-title" htmlFor="dt-alert-conf">
                    Ngưỡng báo lỗi
                  </label>
                  <span className="dt-label-sub">Mặc định: 0.7</span>
                </div>
                <input
                  id="dt-alert-conf"
                  type="text"
                  inputMode="decimal"
                  className="dt-number-input"
                  placeholder="0.7"
                  value={alertConf}
                  onChange={(e) => handleSaveAlertConf(e.target.value)}
                />
              </div>
            </div>

            <h2 className="dt-section-title">🎨 GIAO DIỆN</h2>
            <div className="dt-card">
              <div className="dt-row" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="dt-icon-box">
                    {theme === "dark" ? (
                      <Moon size={18} color="#FDB813" />
                    ) : (
                      <Sun size={18} color="#F59E0B" />
                    )}
                  </div>
                  <span className="dt-label-title" style={{ fontWeight: 600 }}>
                    {theme === "dark" ? "Chế độ Tối" : "Chế độ Sáng"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label="Chuyển đổi chế độ Sáng / Tối"
                  className={`dt-switch ${theme === "dark" ? "is-on" : ""}`}
                  onClick={toggleTheme}
                >
                  <span className="dt-switch-thumb" />
                </button>
              </div>
            </div>

            <h2 className="dt-section-title">📲 ỨNG DỤNG PWA</h2>
            <div className="dt-card">
              <div className="dt-row">
                <Smartphone size={26} color="var(--dt-primary)" />
                <div className="dt-row-body">
                  <span className="dt-label-title">
                    {installed
                      ? "Đã cài đặt trên thiết bị"
                      : "Cài đặt Đếm thép ra màn hình chính"}
                  </span>
                  <span className="dt-label-sub">
                    {installed
                      ? "Ứng dụng đang chạy độc lập tại duongnt.io.vn/demthep"
                      : "Trên iPhone/iPad (Safari): nhấn nút Chia sẻ rồi chọn 'Thêm vào MH chính'."}
                  </span>
                </div>
                {canInstall && !installed && (
                  <button
                    type="button"
                    className="dt-pwa-banner-btn"
                    onClick={install}
                  >
                    Cài đặt
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Tab Navigation (Đếm thép | Cài đặt) */}
      <nav className="dt-tabbar" aria-label="Điều hướng Đếm thép">
        <div className="dt-tabbar-inner">
          <button
            type="button"
            className={`dt-tab-item ${activeTab === "count" ? "is-active" : ""}`}
            onClick={() => setActiveTab("count")}
          >
            <ScanLine size={22} />
            <span>Đếm thép</span>
          </button>
          <button
            type="button"
            className={`dt-tab-item ${
              activeTab === "settings" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={22} />
            <span>Cài đặt</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

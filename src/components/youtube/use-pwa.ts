"use client";

import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function usePwa() {
  const promptRef = useRef<InstallEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const display = window.matchMedia("(display-mode: standalone)");
    setInstalled(display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const beforeInstall = (event: Event) => { event.preventDefault(); promptRef.current = event as InstallEvent; setCanInstall(true); };
    const onInstalled = () => { promptRef.current = null; setCanInstall(false); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void (async () => {
        const subdomain = window.location.hostname === "youtube.duongnt.io.vn" || window.location.hostname === "youtube.localhost" || window.location.hostname.startsWith("youtube.localhost.");
        if (!subdomain) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            const worker = registration.active || registration.waiting || registration.installing;
            if (new URL(registration.scope).pathname === "/" && worker && new URL(worker.scriptURL).pathname === "/youtube-sw.js") await registration.unregister();
          }
        }
        const registration = await navigator.serviceWorker.register("/youtube-sw.js", { scope: subdomain ? "/" : "/youtube", updateViaCache: "none" });
        if (disposed) return;
        registrationRef.current = registration;
        setUpdateAvailable(!!registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) setUpdateAvailable(true);
          });
        });
      })().catch(() => { if (!disposed) setError("Chưa thể chuẩn bị ứng dụng ngoại tuyến. Hãy tải lại khi có mạng."); });
    }
    return () => { disposed = true; window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    const event = promptRef.current;
    if (!event) return;
    try { await event.prompt(); await event.userChoice; } catch { setError("Hãy cài đặt từ menu trình duyệt."); }
    promptRef.current = null; setCanInstall(false);
  }
  function update() {
    const worker = registrationRef.current?.waiting;
    if (!worker) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    worker.postMessage({ type: "SKIP_WAITING" });
  }
  return { canInstall, installed, updateAvailable, error, install, update };
}

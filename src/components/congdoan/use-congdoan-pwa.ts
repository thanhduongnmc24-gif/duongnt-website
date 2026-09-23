"use client";

import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useCongDoanPwa() {
  const promptRef = useRef<InstallEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let disposed = false;
    const standalone = window.matchMedia("(display-mode: standalone)");
    setInstalled(standalone.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      promptRef.current = null;
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/congdoan-sw.js", {
        scope: "/congdoan",
        updateViaCache: "none",
      }).then(registration => {
        if (disposed) return;
        registrationRef.current = registration;
        setUpdateAvailable(!!registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) setUpdateAvailable(true);
          });
        });
      }).catch(() => { /* The online app remains usable without a worker. */ });
    }

    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const prompt = promptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    promptRef.current = null;
    setCanInstall(false);
  }

  function update() {
    const worker = registrationRef.current?.waiting;
    if (!worker) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  return { canInstall, installed, updateAvailable, install, update };
}

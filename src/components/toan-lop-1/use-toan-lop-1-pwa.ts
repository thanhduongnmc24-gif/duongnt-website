"use client";

import { useEffect, useRef, useState } from "react";

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function useToanLop1Pwa() {
  const promptRef = useRef<InstallEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [coTheCai, setCoTheCai] = useState(false);
  const [daCai, setDaCai] = useState(false);
  const [coBanMoi, setCoBanMoi] = useState(false);

  useEffect(() => {
    let disposed = false;
    setDaCai(window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const beforeInstall = (event: Event) => { event.preventDefault(); promptRef.current = event as InstallEvent; setCoTheCai(true); };
    const installed = () => { promptRef.current = null; setCoTheCai(false); setDaCai(true); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/toanlop1-sw.js", { scope: "/toanlop1", updateViaCache: "none" }).then(registration => {
        if (disposed) return;
        registrationRef.current = registration;
        setCoBanMoi(!!registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) setCoBanMoi(true);
          });
        });
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function caiDat() {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    await promptRef.current.userChoice;
    promptRef.current = null;
    setCoTheCai(false);
  }

  function capNhat() {
    const worker = registrationRef.current?.waiting;
    if (!worker) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  return { coTheCai, daCai, coBanMoi, caiDat, capNhat };
}

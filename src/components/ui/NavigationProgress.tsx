"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import BrandLoader from "./BrandLoader";

/** Barre de progression lors des changements de page — sans manipulation DOM externe */
const NavigationProgress = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isFirstRenderRef = useRef(true);

  const clearTimers = (): void => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startNavigation = useCallback(() => {
    clearTimers();
    setIsNavigating(true);
    setShowOverlay(false);
    setProgress(12);
    timersRef.current.push(setTimeout(() => setProgress(35), 80));
    timersRef.current.push(setTimeout(() => setProgress(55), 250));
    timersRef.current.push(setTimeout(() => setProgress(72), 500));
    timersRef.current.push(setTimeout(() => setProgress(88), 900));
    timersRef.current.push(setTimeout(() => setShowOverlay(true), 500));
  }, []);

  const finishNavigation = useCallback(() => {
    clearTimers();
    setProgress(100);
    timersRef.current.push(
      setTimeout(() => {
        setIsNavigating(false);
        setShowOverlay(false);
        setProgress(0);
      }, 280)
    );
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => clearTimers();
  }, []);

  // Fin de navigation — ignorer le premier rendu (montage initial)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    finishNavigation();
  }, [pathname, searchParams, finishNavigation]);

  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;

      const targetPath = href.replace(window.location.origin, "").split("?")[0] || "/";
      if (targetPath === pathname) return;

      startNavigation();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, startNavigation]);

  useEffect(() => {
    const handleProgrammatic = (): void => startNavigation();
    window.addEventListener("nko:navigation-start", handleProgrammatic);
    return () => window.removeEventListener("nko:navigation-start", handleProgrammatic);
  }, [startNavigation]);

  const isBarVisible = isNavigating || progress > 0;

  return (
    <>
      {/* Barre toujours présente — opacity évite insertBefore lors des toggles */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden pointer-events-none transition-opacity duration-200"
        style={{ opacity: isBarVisible ? 1 : 0 }}
        role="progressbar"
        aria-hidden={!isBarVisible}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Chargement de la page"
      >
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--brand-brown), var(--brand-gold))",
            boxShadow: isBarVisible ? "0 0 6px var(--brand-gold)" : "none",
          }}
        />
      </div>

      {/* Overlay via portal — hors de l'arbre React principal pour éviter les conflits */}
      {isMounted &&
        showOverlay &&
        isNavigating &&
        createPortal(
          <BrandLoader variant="overlay" message="Chargement de la page..." />,
          document.body
        )}
    </>
  );
};

export default NavigationProgress;

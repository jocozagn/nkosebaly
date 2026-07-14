"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";
import Image from "next/image";
import NkoShell from "./NkoShell";
import { BRAND } from "@/constants/brand";
import BrandTitle from "./BrandTitle";
import BrandLoader from "@/components/ui/BrandLoader";
import { triggerNavigationStart } from "@/utils/navigation";

type SessionStatus = "pending" | "confirmed" | "expired";

interface QrSessionData {
  token: string;
  qr_image: string;
  expires_at: number;
}

/** Page de connexion par QR code */
const QrLoginPage = () => {
  const router = useRouter();
  const [qrImage, setQrImage] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [status, setStatus] = useState<SessionStatus>("pending");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isDevLoggingIn, setIsDevLoggingIn] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Mode test : connexion sans APK (dev uniquement) */
  const isDevMode =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

  const handleDevLogin = async (): Promise<void> => {
    setIsDevLoggingIn(true);

    const response = await fetch("/api/web-session/dev-login", { method: "POST" });
    const result = await response.json();

    if (!result.error) {
      triggerNavigationStart();
      router.replace("/dashboard");
      return;
    }

    setIsDevLoggingIn(false);
  };

  const createSession = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setStatus("pending");
    setIsConnecting(false);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("/api/web-session/create", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const result = await response.json();

      if (result.error || !result.data) {
        setIsLoading(false);
        return;
      }

      const data = result.data as QrSessionData;
      setQrImage(data.qr_image);
      setSessionToken(data.token);
      setExpiresAt(data.expires_at);
      setSecondsLeft(Math.floor((data.expires_at - Date.now()) / 1000));
    } catch {
      // Échec silencieux — l'utilisateur peut rafraîchir le QR
    }

    setIsLoading(false);
  }, []);

  const completeLogin = useCallback(async (token: string): Promise<void> => {
    setIsConnecting(true);

    const response = await fetch("/api/web-session/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    if (!result.error) {
      triggerNavigationStart();
      window.location.assign("/dashboard");
      return;
    }

    setIsConnecting(false);
  }, []);

  const startPolling = useCallback((token: string): void => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      const response = await fetch(`/api/web-session/status?token=${token}`);
      const result = await response.json();

      if (result.error || !result.data) return;

      const sessionStatus = result.data.status as SessionStatus;
      setStatus(sessionStatus);

      if (sessionStatus === "confirmed") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        await completeLogin(token);
      }

      if (sessionStatus === "expired") {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 2000);
  }, [completeLogin]);

  useEffect(() => {
    createSession();
  }, [createSession]);

  useEffect(() => {
    if (!sessionToken || status !== "pending") return;
    startPolling(sessionToken);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionToken, status, startPolling]);

  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        setStatus("expired");
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleRefresh = (): void => {
    createSession();
  };

  const isExpired = status === "expired";

  return (
    <NkoShell showNav={false}>
      <div className="flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">
          {/* Logo centré au-dessus de la carte */}
          <div className="flex justify-center mb-6">
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={96}
              height={96}
              className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover ring-4 ring-[var(--brand-gold)] shadow-md"
              priority
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-[#e8ddd4] p-4 sm:p-6 md:p-8 w-full">
            <div className="text-center mb-6">
              <BrandTitle showProfessor className="mb-3 flex flex-col items-center" />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--brand-black)" }}>
                Connexion à la plateforme
              </p>
              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                Scannez le QR code avec votre application
              </p>
            </div>

            {/* Barre accent dorée */}
            <div className="h-1 w-16 mx-auto mb-6 bg-[var(--brand-gold)]" aria-hidden="true" />

            <div className="flex flex-col items-center mb-6 w-full">
              {isLoading ? (
                <div className="w-full max-w-[280px] aspect-square flex items-center justify-center rounded-lg border border-[#e8ddd4]" style={{ backgroundColor: "var(--brand-bg)" }}>
                  <BrandLoader compact message="Génération du QR code..." />
                </div>
              ) : isExpired ? (
                <div className="w-full max-w-[280px] aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d4c4b5] gap-3 px-4" style={{ backgroundColor: "var(--brand-bg)" }}>
                  <p className="text-sm" style={{ color: "var(--brand-gray)" }}>QR code expiré</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded transition-colors hover:opacity-90"
                    style={{ backgroundColor: "var(--brand-brown)" }}
                    aria-label="Générer un nouveau QR code"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Nouveau QR code
                  </button>
                </div>
              ) : (
                <div className="relative w-full max-w-[280px] p-2 sm:p-3 rounded-xl border-2" style={{ borderColor: "var(--brand-sky)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImage}
                    alt="QR code de connexion"
                    className="w-full h-auto rounded-lg"
                  />
                  {isConnecting && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: "var(--brand-brown)" }} />
                        <p className="text-sm font-medium" style={{ color: "var(--brand-brown)" }}>Connexion...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !isExpired && (
                <p className="mt-3 text-xs" style={{ color: "var(--brand-gray)" }}>
                  Expire dans{" "}
                  <span className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                    {secondsLeft}s
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-[#f0e8df] pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand-gray-dark)" }}>
                Comment se connecter
              </p>
              {[
                "Ouvrez l'application sur votre téléphone",
                "Allez dans Paramètres → Connexion web",
                "Scannez ce QR code avec votre appareil",
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: "var(--brand-brown)" }}
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm pt-0.5" style={{ color: "var(--brand-gray-dark)" }}>{step}</p>
                </div>
              ))}
            </div>

            {!isLoading && !isExpired && !isConnecting && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--brand-gray)" }}>
                <Smartphone className="w-4 h-4" style={{ color: "var(--brand-brown)" }} />
                <span>En attente du scan...</span>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--brand-brown)" }} />
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "var(--brand-gray)" }}>
            Besoin d&apos;aide ?{" "}
            <a href={`tel:${BRAND.contact.phone}`} className="font-nko underline" style={{ color: "var(--brand-brown)" }}>
              {BRAND.contact.phoneDisplayNko}
            </a>
            {" · "}
            <a href={`mailto:${BRAND.contact.email}`} className="underline" style={{ color: "var(--brand-brown)" }}>
              {BRAND.contact.email}
            </a>
          </p>

          {/* Bouton mode test — visible uniquement en développement */}
          {isDevMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleDevLogin}
                disabled={isDevLoggingIn}
                className="text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--brand-sky-dark)" }}
                aria-label="Continuer en mode test sans scanner le QR code"
              >
                {isDevLoggingIn ? "Connexion..." : "Continuer en mode test (sans APK)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </NkoShell>
  );
};

export default QrLoginPage;

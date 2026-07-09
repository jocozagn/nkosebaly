import { StoreProvider } from "@/redux/store/StoreProvider";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import NavigationProgress from "@/components/ui/NavigationProgress";
import { BRAND } from "@/constants/brand";

/** Langue par défaut — sans appel API externe (évite les retards au chargement) */
const defaultLang = {
  code: "fr",
  isRTL: false,
  translations: {} as Record<string, string>,
  languages: [] as Array<{ id: number; name: string; code: string; is_rtl: boolean; is_default: boolean; image: string }>,
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_TITLE || `${BRAND.name} - ${BRAND.tagline}`,
  description:
    process.env.NEXT_PUBLIC_DESCRIPTION ||
    `Plateforme d'apprentissage du N'ko Mandingue avec ${BRAND.name}.`,
  keywords: process.env.NEXT_PUBLIC_KEYWORDS || `N'ko,Mandingue,${BRAND.name}`,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLang.code} dir="ltr">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__INITIAL_LANG__=${JSON.stringify(defaultLang)};`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} font-sans !pointer-events-auto`} suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <StoreProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#7D4E2D", color: "#fff" },
            }}
          />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}

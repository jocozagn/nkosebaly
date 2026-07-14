import { StoreProvider } from "@/redux/store/StoreProvider";
import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_NKo } from "next/font/google";
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

const notoSansNko = Noto_Sans_NKo({
  subsets: ["nko"],
  weight: ["400"],
  variable: "--font-noto-nko",
  display: "swap",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_TITLE || `${BRAND.nameNko} · ${BRAND.name}`,
  description:
    process.env.NEXT_PUBLIC_DESCRIPTION ||
    `${BRAND.taglineNko} — ${BRAND.name}.`,
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
      <body className={`${dmSans.variable} ${notoSansNko.variable} font-sans !pointer-events-auto`} suppressHydrationWarning>
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

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a1841",
};

export const metadata: Metadata = {
  title: "Hisab Kitab - Digital Khata Book",
  description: "Manage customer ledgers, rate lists, payments, and statements for Indian businesses",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HisabKitab",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col bg-gray-50" suppressHydrationWarning>
        <PWARegistrationScript />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

function PWARegistrationScript() {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `
        (function() {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(function(registration) {
                console.log('Service Worker registered: ', registration.scope);
              })
              .catch(function(registrationError) {
                console.log('Service Worker registration failed: ', registrationError);
              });
          }
        })();
      `
    }} />
  );
}
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/pwa-install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hisab Kitab - Digital Khata Book",
  description: "Manage customer ledgers, rate lists, payments, and statements for Indian businesses",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  icons: [
    {
      rel: "apple-touch-icon",
      sizes: "192x192",
      url: "/icon-192.png",
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      sizes: "192x192",
      url: "/icon-192.png",
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      sizes: "512x512",
      url: "/icon-512.png",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col bg-gray-50">
        <PWAInitializer />
        <PWAInstallPrompt />
        {children}
      </body>
    </html>
  );
}

function PWAInitializer() {
  return <PWARegistrationScript />;
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
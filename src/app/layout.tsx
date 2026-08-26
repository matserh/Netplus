import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClientProviders } from "@/components/ClientProviders";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Netplus | Premium Cinema Streaming",
  description: "Votre destination premium pour découvrir les meilleurs films et séries TV. Une expérience cinématographique unique avec une interface élégante.",
  keywords: ["streaming", "films", "séries", "cinéma", "TV", "movies", "premium", "Netflix alternative"],
  authors: [{ name: "Netplus Team" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Netplus | Premium Cinema Streaming",
    description: "Découvrez les meilleurs films et séries TV en streaming",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Netplus | Premium Cinema Streaming",
    description: "Découvrez les meilleurs films et séries TV en streaming",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="dark">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* iOS: hide native status bar — app takes full screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Android: status bar color matches background */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Anti-popup shield: blocks ads/popups from embed iframes */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var _open=window.open;var _blocked=0;window.open=function(){_blocked++;return null;};document.addEventListener('DOMContentLoaded',function(){setInterval(function(){var ifs=document.querySelectorAll('iframe:not([sandbox])');for(var i=0;i<ifs.length;i++){ifs[i].setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');}var hidden=document.querySelectorAll('iframe[style*="display:none"],iframe[style*="opacity:0"],iframe[style*="visibility:hidden"],iframe[width="0"],iframe[height="0"]');for(var j=0;j<hidden.length;j++){if(!hidden[j].closest('[class*="video"]')&&!hidden[j].closest('[class*="player"]')){hidden[j].remove();}}},2000);});window.addEventListener('beforeunload',function(e){if(_blocked>0){e.preventDefault();e.returnValue='';}});})()` }} />
        {/* Puter.js — free auth, no API keys, no server needed */}
        <script src="https://js.puter.com/v2/" async></script>
        {/* Cache-bust: force fresh assets after every deployment */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{fetch('/BUILD_ID').then(function(r){return r.text()}).then(function(id){var prev=sessionStorage.getItem('np-build');if(prev&&prev!==id.trim()){if('caches' in window){caches.keys().then(function(names){return Promise.all(names.map(function(n){return caches.delete(n)}))})}sessionStorage.clear();window.location.reload(true)}sessionStorage.setItem('np-build',id.trim())}).catch(function(){})}catch(e){}})()` }} />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
    icon: "/logo.svg",
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
        <meta name="theme-color" content="#0f0f23" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

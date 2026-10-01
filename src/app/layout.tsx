import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { Footer } from "@/components/layout/Footer";
import { InstallBanner } from "@/components/layout/InstallBanner";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import AppShell from "@/components/molecules/AppShell";
import { EmotionProvider } from "@/components/providers/EmotionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans', 
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: "StarPoint",
  description: "Tu app de Pádel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StarPoint",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0EEE9" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${spaceGrotesk.variable} antialiased min-h-full flex flex-col bg-background overflow-x-hidden no-scrollbar`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <EmotionProvider>
            <AppShell>{children}</AppShell>
            <Footer />
            <InstallBanner />
            <ServiceWorkerRegister />
            <Toaster richColors position="top-center" />
          </EmotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

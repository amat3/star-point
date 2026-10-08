import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { InstallBanner } from "@/components/layout/InstallBanner";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import AppShell from "@/components/molecules/AppShell";
import DemoBanner from "@/components/molecules/DemoBanner";
import SplashScreen, { SPLASH_GUARD_SCRIPT } from "@/components/molecules/SplashScreen";
import { EmotionProvider } from "@/components/providers/EmotionProvider";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans', 
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})

const isDemo = process.env.NEXT_PUBLIC_DEMO === "true";

export const metadata: Metadata = {
  // Absolute base for the share image (og:image) and other metadata URLs: each deployment points to itself
  metadataBase: new URL(isDemo ? "https://star-point-demo.vercel.app" : "https://star-point.vercel.app"),
  title: isDemo ? "starpoint · Demo" : "starpoint",
  description: isDemo
    ? "Demo con datos ficticios de la PWA que usa un grupo real de pádel"
    : "Tu app de Pádel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "starpoint", // name under the icon on the iOS home screen
  },
  icons: {
    icon: "/pwa-icon/512",
    apple: "/pwa-icon/180",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1512" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${spaceGrotesk.variable}`}
      >
        {/* Decides before the first paint whether the splash shows */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_GUARD_SCRIPT }} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <EmotionProvider>
            <SplashScreen />
            {/* Only on the demo deployment */}
            {process.env.NEXT_PUBLIC_DEMO === 'true' && <DemoBanner />}
            <AppShell>{children}</AppShell>
            <InstallBanner />
            <ServiceWorkerRegister />
            <Toaster richColors position="top-center" />
          </EmotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

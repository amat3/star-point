import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { InstallBanner } from "@/components/layout/InstallBanner";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import AppShell from "@/components/molecules/AppShell";
import { EmotionProvider } from "@/components/providers/EmotionProvider";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans', 
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: "starpoint",
  description: "Tu app de Pádel",
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <EmotionProvider>
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

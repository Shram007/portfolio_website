import "@/app/globals.css";
import type { Metadata } from "next";
import { AppleStyleDock } from "@/components/site/AppleStyleDock";
import { ThemeProvider } from "next-themes";
import { TwentyFirstToolbar } from "@21st-extension/toolbar-next";
import { ReactPlugin } from "@21st-extension/react";

export const metadata: Metadata = {
  title: "Shram Kadia - Portfolio",
  description: "Full Stack Developer & Software Engineer Portfolio",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  metadataBase: new URL('https://your-domain.vercel.app'), // Update with your actual domain
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="relative min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <AppleStyleDock />
          <TwentyFirstToolbar config={{ plugins: [ReactPlugin] }} />
      </body>
    </html>
  );
}

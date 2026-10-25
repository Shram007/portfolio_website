import "@/app/globals.css";
import type { Metadata } from "next";
import { SiteNav } from "@/components/site/SiteNav";
import { ThemeProvider } from "next-themes";
import DevToolbar from "@/components/site/DevToolbar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} - Portfolio`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Portfolio`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} - Portfolio`, description: SITE_DESCRIPTION },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  metadataBase: new URL(SITE_URL),
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
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2">Skip to content</a>
            <SiteNav />
            {children}
          </ThemeProvider>
          <DevToolbar />
      </body>
    </html>
  );
}

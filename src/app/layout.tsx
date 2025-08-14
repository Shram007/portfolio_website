import "@/app/globals.css";
import type { Metadata } from "next";
import { AppleStyleDock } from "@/components/site/AppleStyleDock";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Shram Kadia",
  description: "My Portfolio",
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
      </body>
    </html>
  );
}

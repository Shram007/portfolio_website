import "@/app/globals.css";
import type { Metadata } from "next";
import { AppleStyleDock } from "@/components/site/AppleStyleDock";

export const metadata: Metadata = {
  title: "Your Name — Software Developer",
  description: "Portfolio of Your Name",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <div className="relative min-h-dvh">
          {children}
          <AppleStyleDock />
        </div>
      </body>
    </html>
  );
}

"use client";

import dynamic from "next/dynamic";

// Dev-only inspector: never fetched in production.
const Toolbar = dynamic(
  async () => {
    const [{ TwentyFirstToolbar }, { ReactPlugin }] = await Promise.all([
      import("@21st-extension/toolbar-next"),
      import("@21st-extension/react"),
    ]);
    return function DevToolbarInner() {
      return <TwentyFirstToolbar config={{ plugins: [ReactPlugin] }} />;
    };
  },
  { ssr: false }
);

export default function DevToolbar() {
  return process.env.NODE_ENV === "development" ? <Toolbar /> : null;
}

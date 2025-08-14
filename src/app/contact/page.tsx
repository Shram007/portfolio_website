"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/contact", { method: "POST", body: data });
      if (!res.ok) throw new Error("Bad response");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-semibold mb-6">Contact</h1>
      <p className="text-neutral-600 dark:text-neutral-300 mb-8">
        Send a quick message. I’ll get back to you soon.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" aria-label="Contact form">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            required
            className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700"
            placeholder="What would you like to discuss?"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {status === "sending" ? "Sending…" : "Send"}
          </button>

          {/* secondary contact option */}
          <a
            href="mailto:you@example.com"
            className="text-sm underline underline-offset-4 hover:no-underline"
          >
            or email me directly
          </a>
        </div>

        {/* status message for screen readers + visual feedback */}
        <p role="status" aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
          {status === "sent" && "Thanks! Your message was queued (demo)."}
          {status === "error" && "Something went wrong. Please try again."}
        </p>
      </form>
    </main>
  );
}

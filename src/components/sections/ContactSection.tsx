"use client";

import { FormEvent, useState } from "react";

export default function ContactSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      // If you made /api/contact earlier, you can POST to it here
      await new Promise((r) => setTimeout(r, 600));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="contact-title" className="mx-auto max-w-lg px-4 py-16">
      <h2 id="contact-title" className="text-3xl font-semibold mb-6">Contact</h2>
      <p className="text-neutral-600 dark:text-neutral-300 mb-8">
        Send a quick message. I’ll get back to you soon.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" aria-label="Contact form">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="name" name="name" required className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700" />
        </div>
        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium">Message</label>
          <textarea id="message" name="message" rows={6} required className="w-full rounded-md border border-neutral-300 bg-transparent p-3 dark:border-neutral-700" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={status === "sending"} className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
            {status === "sending" ? "Sending…" : "Send"}
          </button>
          <a href="mailto:you@example.com" className="text-sm underline underline-offset-4 hover:no-underline">or email me directly</a>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
          {status === "sent" && "Thanks! Your message was queued (demo)."}
          {status === "error" && "Something went wrong. Please try again."}
        </p>
      </form>
    </section>
  );
}

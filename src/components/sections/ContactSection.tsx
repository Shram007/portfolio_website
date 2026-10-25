"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Github, Linkedin, Mail, TriangleAlert } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { motion } from "framer-motion";
import { CONTACT_EMAIL } from "@/lib/site";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "w-full rounded-md border border-neutral-400 bg-transparent p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-neutral-600";

const direct =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors hover:bg-neutral-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

export default function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    const form = e.currentTarget;

    try {
      const response = await fetch("/api/contact", { method: "POST", body: new FormData(form) });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
        setErrorMessage(
          response.status === 429
            ? "You've sent a few messages already. Please try again in a few minutes."
            : response.status === 400 && result.error
              ? result.error
              : "Something went wrong sending your message."
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <Section ariaLabelledby="contact-title">
        <SectionHeader title="Contact" subtitle="Send a quick message, or reach me directly." titleId="contact-title" />

        <div className="mx-auto max-w-lg">
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Contact form" aria-describedby="contact-status">
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
              <input id="name" name="name" autoComplete="name" required maxLength={100} className={field} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className={field} />
            </div>
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium">Message</label>
              <textarea id="message" name="message" rows={6} required maxLength={5000} className={field} />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </button>

            <div id="contact-status" role="status" aria-live="polite" className="min-h-12 text-sm">
              {status === "sent" && (
                <p className="flex items-start gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Thanks! Your message was sent.
                </p>
              )}
              {status === "error" && (
                <p className="flex items-start gap-2 rounded-md border border-red-600/40 bg-red-500/10 p-3 text-red-800 dark:text-red-300">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    {errorMessage} You can also email{" "}
                    <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </span>
                </p>
              )}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-border pt-6">
            <a href={`mailto:${CONTACT_EMAIL}`} className={direct}>
              <Mail className="h-4 w-4" aria-hidden /> {CONTACT_EMAIL}
            </a>
            <a href="https://www.linkedin.com/in/shram-kadia" target="_blank" rel="noopener noreferrer" className={direct}>
              <Linkedin className="h-4 w-4" aria-hidden /> LinkedIn
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <a href="https://github.com/Shram007" target="_blank" rel="noopener noreferrer" className={direct}>
              <Github className="h-4 w-4" aria-hidden /> GitHub
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </div>
        </div>
      </Section>
    </motion.div>
  );
}

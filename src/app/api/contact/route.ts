import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

// Best-effort per-instance rate limit; use a shared store if traffic grows.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return fail("Too many requests. Please try again later.", 429);

  const user = process.env.CONTACT_EMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.CONTACT_EMAIL_TO || user;
  if (!user || !pass || !to) {
    console.error("Contact form misconfigured: set CONTACT_EMAIL_USER and GMAIL_APP_PASSWORD");
    return fail("Failed to send email", 500);
  }

  let data: FormData;
  try {
    data = await req.formData();
  } catch {
    return fail("Invalid request", 400);
  }

  // Honeypot: bots fill hidden fields. Pretend success so they don't retry.
  if (field(data, "website")) return NextResponse.json({ ok: true });

  const name = field(data, "name");
  const email = field(data, "email");
  const message = field(data, "message");

  if (!name || !email || !message) return fail("All fields are required", 400);
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    message.length > LIMITS.message
  ) {
    return fail("Input too long", 400);
  }
  if (!EMAIL_RE.test(email)) return fail("Invalid email address", 400);

  // Header values must never contain line breaks.
  const safeName = name.replace(/[\r\n]+/g, " ");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: user,
      to,
      replyTo: { name: safeName, address: email },
      subject: `${safeName} is trying to reach you via your portfolio website`,
      text: `Name: ${safeName}\nEmail: ${email}\n\n${message}`,
      html: `
        <h2>New Message from Your Portfolio Website</h2>
        <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    });
    console.log("Contact email sent:", info.messageId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send contact email:", error);
    return fail("Failed to send email", 500);
  }
}

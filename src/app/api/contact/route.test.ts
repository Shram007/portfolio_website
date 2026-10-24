import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "id-1" });
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { POST } from "./route";

let ipCounter = 0;
function request(fields: Record<string, string>, ip = `10.0.0.${++ipCounter}`) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request("http://localhost/api/contact", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip },
  });
}

const valid = { name: "Ada", email: "ada@example.com", message: "Hello there" };

beforeEach(() => {
  sendMail.mockClear();
  process.env.CONTACT_EMAIL_USER = "me@example.com";
  process.env.GMAIL_APP_PASSWORD = "secret";
  delete process.env.CONTACT_EMAIL_TO;
});

describe("POST /api/contact", () => {
  it("sends mail from the site account with visitor as reply-to", async () => {
    const res = await POST(request(valid));
    expect(res.status).toBe(200);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.from).toBe("me@example.com");
    expect(mail.to).toBe("me@example.com");
    expect(mail.replyTo).toEqual({ name: "Ada", address: "ada@example.com" });
  });

  it("escapes HTML in the message", async () => {
    await POST(request({ ...valid, message: "<script>alert(1)</script>" }));
    const { html } = sendMail.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("strips line breaks from header fields", async () => {
    await POST(request({ ...valid, name: "Ada\r\nBcc: evil@example.com" }));
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it.each([
    ["missing field", { ...valid, name: "" }],
    ["bad email", { ...valid, email: "not-an-email" }],
    ["oversized message", { ...valid, message: "a".repeat(5001) }],
  ])("rejects %s with 400", async (_label, fields) => {
    const res = await POST(request(fields));
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot hits without sending", async () => {
    const res = await POST(request({ ...valid, website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("returns 500 when env is missing", async () => {
    delete process.env.GMAIL_APP_PASSWORD;
    const res = await POST(request(valid));
    expect(res.status).toBe(500);
  });

  it("rate limits after 5 requests per IP", async () => {
    const ip = "192.168.9.9";
    for (let i = 0; i < 5; i++) expect((await POST(request(valid, ip))).status).toBe(200);
    expect((await POST(request(valid, ip))).status).toBe(429);
  });
});

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const body = Object.fromEntries(data.entries());
  console.log("API /contact payload:", body);
  // TODO: send email via Resend, store in DB, etc.
  return NextResponse.json({ ok: true });
}

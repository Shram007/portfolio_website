import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const body = Object.fromEntries(data.entries());

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "kadiashram@gmail.com", 
      pass: process.env.GMAIL_APP_PASSWORD, 
    },
  });

  const mailOptions = {
    from: body.email as string, 
    to: "kadiashram@gmail.com", 
    replyTo: body.email as string, 
    subject: `${body.name} is trying to reach you via your portfolio website`,
    html: `
      <h2>New Message from Your Portfolio Website</h2>
      <p><strong>Name:</strong> ${body.name}</p>
      <p><strong>Email:</strong> ${body.email}</p>
      <p><strong>Message:</strong> ${body.message}</p>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const body = Object.fromEntries(data.entries());
  console.log("API /contact payload:", body);
  
  // Check if API key exists
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return NextResponse.json({ ok: false, error: 'Email service not configured' }, { status: 500 });
  }
  
  // Send email via Resend
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('Attempting to send email...');
    
    const emailData = {
      from: 'onboarding@resend.dev', // Use Resend's default domain for testing
      to: ['sfshnky@gmail.com'],
      subject: `New Contact Form Submission from ${body.name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${body.name}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        <p><strong>Message:</strong> ${body.message}</p>
      `,
    };
    
    const result = await resend.emails.send(emailData);
    console.log('Email sent successfully:', result);
    
    return NextResponse.json({ ok: true, emailId: result.data?.id });
  } catch (emailError) {
    console.error('Failed to send email:', emailError);
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to send email',
      details: emailError instanceof Error ? emailError.message : 'Unknown error'
    }, { status: 500 });
  }
}

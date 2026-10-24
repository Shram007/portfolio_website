import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Shram Kadia.",
  alternates: { canonical: "/contact" },
};

import ContactSection from "@/components/sections/ContactSection";
export default function ContactPage() { return <ContactSection />; }

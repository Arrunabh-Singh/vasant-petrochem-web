import { NextResponse } from "next/server";
import { contact, site } from "@/app/content";

// audit.md M15: no way for a researcher to responsibly report a finding.
export async function GET() {
  const body = [
    `Contact: mailto:${contact.email}`,
    `Expires: 2027-08-16T00:00:00.000Z`,
    `Canonical: ${site.url}/.well-known/security.txt`,
  ].join("\n");

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

import type { Metadata } from "next";
import Industries from "@/app/components/Industries";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "Industries We Serve",
  description: "Vasant Petrochem supplies road construction, paint & coatings, rubber & polymers, power & energy, automotive, and pharmaceutical industries across Central India.",
  alternates: { canonical: `${site.url}/industries` },
};

export default function IndustriesPage() {
  return (
    <div className="pt-32">
      <h1 className="sr-only">Industries We Serve — Vasant Petrochem</h1>
      <Industries />
    </div>
  );
}

import type { Metadata } from "next";
import LegalDoc, { Section, Todo } from "@/app/components/LegalDoc";
import { company } from "@/lib/company";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms for using the ${company.tradeName} website.`,
  alternates: { canonical: `${site.url}/terms` },
  // Draft: keep out of search results until it has been reviewed and finalised.
  robots: { index: false, follow: true },
};

const entity = company.legalName ?? company.tradeName;

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Use"
      intro={
        <>
          These terms govern your use of {site.url.replace("https://", "")}, operated by {entity}, trading as{" "}
          {company.tradeName}. By using the site you accept them. They apply to the website only; the supply of goods
          is governed by the written terms of each quotation or order.
        </>
      }
    >
      <Section title="Information on this site">
        <p>
          Product descriptions, specifications and typical values are for general information and show typical
          values, not a guarantee of specification. The terms of your order prevail over anything on this site. Technical data sheets are provided as a convenience
          and may be revised without notice.
        </p>
      </Section>

      <Section title="Enquiries and quotations">
        <p>
          Submitting an enquiry is a request for information, not an order, and does not create a contract. A
          quotation is an offer only on the terms, validity and price basis written in it. A contract is formed only
          when we accept your order in writing. Availability and prices change.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>submit false, misleading or automated enquiries, or use the forms to send email to third parties;</li>
          <li>attempt to probe, disrupt or gain unauthorised access to the site or its systems;</li>
          <li>copy the site at scale, or reuse its content to suggest a connection with us that does not exist.</li>
        </ul>
        <p>
          To report a security issue, see <a className="underline" href="/.well-known/security.txt">security.txt</a>.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The site&apos;s text, layout, logo and other material belong to {entity} or its licensors. You may view and
          print pages for your own business use. Other brand and product names belong to their owners.
        </p>
      </Section>

      <Section title="Third-party services and links">
        <p>
          Links such as WhatsApp open services run by others under their own terms. We are not responsible for them.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          The site is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for loss arising
          from your use of or reliance on the site, or from it being unavailable. Nothing here limits liability that
          cannot be limited by law.{" "}
          <Todo id="VP-HUM-013">legal review: confirm the limitation wording and any cap</Todo>
        </p>
      </Section>

      <Section title="Privacy">
        <p>
          How we handle personal data is described in our <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of India. The courts at <Todo id="VP-HUM-014">city for jurisdiction</Todo>{" "}
          have jurisdiction, subject to any mandatory rule to the contrary.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We may update these terms by posting a new version here. Questions: {company.email} or{" "}
          {company.phone.display}. Last updated: <Todo id="VP-HUM-013">publication date once approved</Todo>
        </p>
      </Section>
    </LegalDoc>
  );
}

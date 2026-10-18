import type { Metadata } from "next";
import LegalDoc, { Section, Todo } from "@/app/components/LegalDoc";
import { company } from "@/lib/company";
import { site } from "@/app/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${company.tradeName} collects and uses personal data through this website.`,
  alternates: { canonical: `${site.url}/privacy` },
  // Draft: keep out of search results until it has been reviewed and finalised.
  robots: { index: false, follow: true },
};

const entity = company.legalName ?? company.tradeName;

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      intro={
        <>
          This policy explains what personal data {entity} (&ldquo;we&rdquo;) collects through{" "}
          {site.url.replace("https://", "")}, why, who else handles it, how long we keep it, and how you can exercise
          your rights under India&apos;s Digital Personal Data Protection Act, 2023. We are a business-to-business
          supplier of industrial oils and fuels; this site is not directed at children.
        </>
      }
    >
      <Section title="Who is responsible">
        <p>
          The data fiduciary is {entity}, trading as {company.tradeName}. Works address: {company.works.street},{" "}
          {company.works.city}, {company.works.region} {company.works.postalCode}, India.
        </p>
        <p>
          Registered office: <Todo id="VP-HUM-001">registered office address</Todo>
        </p>
      </Section>

      <Section title="What we collect, and why">
        <p>
          <strong>1. Enquiry form (&ldquo;Request a free quote&rdquo;).</strong> You give us your name and email
          address (required) and, if you choose, your company, phone or WhatsApp number, the product you are
          interested in, the quantity, and a free-text message. We use this only to answer your enquiry and to send
          you a confirmation. We also record, automatically: the date and time, the page you submitted from, your
          browser&apos;s user-agent text, a reference number we assign (format VP-ENQ-YYYYMM-####), and a keyed hash
          of your IP address (not the address itself) which we use to detect abuse and limit repeated submissions.
        </p>
        <p>
          <strong>2. Technical data sheet request.</strong> To receive a product&apos;s technical data sheet you give
          your email address. We record that email address, the product, the time and your IP address, to deliver the
          document, to follow up on your interest in that product, and to limit abuse.
        </p>
        <p>
          <strong>3. Bot protection.</strong> Where enabled, the forms use Cloudflare Turnstile, which checks signals
          from your browser to tell people from automated scripts. Cloudflare processes that data under its own
          privacy terms.
        </p>
        <p>
          <strong>4. Server and network logs.</strong> Our hosting and network providers (below) log requests to the
          site, typically the IP address, time, page requested and user-agent, for security and reliability.
        </p>
        <p>
          <strong>5. Analytics and cookies.</strong> We do not currently run analytics or advertising trackers and the
          public pages do not set cookies. If that changes we will update this policy and ask for your consent first.
        </p>
        <p>
          <strong>6. When you call, email or message us.</strong> If you phone us, write to {company.email}, or use
          the WhatsApp link, we handle what you tell us (your name, company, requirement) to respond. WhatsApp
          messages are also subject to WhatsApp&apos;s own terms and privacy policy.
        </p>
      </Section>

      <Section title="Legal basis">
        <p>
          You give us this information voluntarily, for the specific purpose of getting a quotation or a document
          from us, and we use it only for that purpose. We do not sell personal data and we do not use it for
          unrelated marketing. <Todo id="VP-HUM-013">legal review: confirm the basis relied on (consent vs. the
          &ldquo;voluntarily provided&rdquo; legitimate use) and whether any marketing contact is intended</Todo>
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>We use these service providers (processors) to run the site. They process data only on our behalf:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Supabase — database that stores enquiries and requests (Mumbai, India region).</li>
          <li>Vercel — website hosting (servers outside India).</li>
          <li>Cloudflare — network security, content delivery and Turnstile bot protection (global network).</li>
          <li>Resend — sends the confirmation and internal notification emails (servers outside India).</li>
        </ul>
        <p>
          Some of these providers process data on servers outside India. We may also disclose data where the law
          requires it.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Enquiries: <Todo id="VP-HUM-013">retention period for enquiry records</Todo>
        </p>
        <p>
          Technical data sheet requests: <Todo id="VP-HUM-013">retention period</Todo>
        </p>
        <p>
          Provider server logs: kept for the period set by each provider.{" "}
          <Todo id="VP-HUM-013">confirm Vercel / Cloudflare log retention for the plans in use</Todo>
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under the Act you may, in respect of your personal data:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>ask for a summary of the data we hold about you and who we have shared it with;</li>
          <li>ask us to correct inaccurate data or complete it;</li>
          <li>ask us to erase it, unless we must keep it by law;</li>
          <li>withdraw consent where we rely on it;</li>
          <li>nominate another person to exercise these rights if you die or become unable to; and</li>
          <li>make a complaint about how we handle your data.</li>
        </ul>
        <p>
          To exercise any of these, or to ask for deletion of an enquiry, email{" "}
          <Todo id="VP-HUM-002">privacy contact address on the company domain</Todo> quoting your enquiry
          reference if you have one. We will respond within <Todo id="VP-HUM-013">response time</Todo>. If you are
          not satisfied you may complain to the Data Protection Board of India.
        </p>
      </Section>

      <Section title="Grievance contact">
        <p>
          Name and designation: <Todo id="VP-HUM-001">named grievance officer</Todo>
        </p>
        <p>
          Email: <Todo id="VP-HUM-002">grievance email address</Todo> &middot; Phone: {company.phone.display} (
          {company.hours.label})
        </p>
      </Section>

      <Section title="Security">
        <p>
          Enquiry data is stored in a database that is not publicly readable, transmitted over HTTPS, and accessible
          only to authorised staff through authenticated accounts. No system is perfectly secure; if a personal data
          breach affects you we will notify you and the Board as the law requires.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We will post changes on this page and update the date. Last updated:{" "}
          <Todo id="VP-HUM-013">publication date once approved</Todo>
        </p>
      </Section>
    </LegalDoc>
  );
}

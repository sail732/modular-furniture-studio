import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { faqs } from "@/config/content";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact and FAQ",
  description: "Answers to common questions and how to reach us.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { email, phone } = siteConfig.contact;
  return (
    <>
      <PageHeader title="Contact and FAQ" />
      <div className="page grid gap-14 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20">
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl">
            Common questions
          </h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span aria-hidden="true" className="text-2xl leading-none text-ink-soft group-open:rotate-45 motion-safe:transition-transform">
                    +
                  </span>
                </summary>
                <p className="max-w-prose pb-5 text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="text-2xl">
            Get in touch
          </h2>
          {email || phone ? (
            <dl className="mt-6 space-y-4">
              {email ? (
                <div>
                  <dt className="text-sm text-ink-soft">Email</dt>
                  <dd className="text-lg">
                    <a href={`mailto:${email}`} className="underline underline-offset-4">
                      {email}
                    </a>
                  </dd>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <dt className="text-sm text-ink-soft">Phone</dt>
                  <dd className="text-lg">{phone}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-ink-soft">
              Contact details have not been set up yet. They will be listed here before ordering opens.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

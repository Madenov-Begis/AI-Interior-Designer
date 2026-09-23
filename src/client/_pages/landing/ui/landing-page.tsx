import { ExamplesSection } from "./examples-section";
import { Hero } from "./hero";
import {
  FaqSection,
  FinalCtaSection,
  StoriesSection,
  WorkflowSection,
} from "./landing-sections";
import { PricingSection } from "./pricing-section";
import { ProcessSection } from "./process-section";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import type { LandingDictionary } from "../model/dictionary";
import { LandingAuthGate } from "./landing-auth-gate";

export function LandingPage({ dictionary }: { dictionary: LandingDictionary }) {
  return (
    <LandingAuthGate locale={dictionary.locale}>
      <a className="skip-link" href="#main-content">
        {dictionary.skipLink}
      </a>
      <main
        id="main-content"
        lang={dictionary.locale}
        className="min-h-screen overflow-x-clip bg-background text-foreground"
        tabIndex={-1}
      >
        <SiteHeader dictionary={dictionary} />
        <Hero dictionary={dictionary.hero} />
        <ExamplesSection dictionary={dictionary.examples} />
        <ProcessSection dictionary={dictionary.process} />
        <StoriesSection dictionary={dictionary.stories} />
        <WorkflowSection dictionary={dictionary.workflow} />
        <PricingSection />
        <FaqSection dictionary={dictionary.faq} />
        <FinalCtaSection dictionary={dictionary.finalCta} />
        <SiteFooter dictionary={dictionary.footer} locale={dictionary.locale} />
      </main>
    </LandingAuthGate>
  );
}

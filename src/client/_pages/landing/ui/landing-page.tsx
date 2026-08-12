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

export function LandingPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen overflow-hidden bg-background text-foreground"
      tabIndex={-1}
    >
      <SiteHeader />
      <Hero />
      <ExamplesSection />
      <ProcessSection />
      <StoriesSection />
      <WorkflowSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <SiteFooter />
    </main>
  );
}

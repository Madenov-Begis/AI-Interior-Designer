import { ExamplesSection } from "./examples-section";
import { Hero } from "./hero";
import {
  FaqSection,
  FinalCtaSection,
  PricingSection,
  StoriesSection,
  WorkflowSection,
} from "./landing-sections";
import { ProcessSection } from "./process-section";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
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

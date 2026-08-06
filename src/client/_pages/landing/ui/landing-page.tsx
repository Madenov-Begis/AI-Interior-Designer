import { ExamplesSection } from "./examples-section";
import { Hero } from "./hero";
import {
  ComparisonSection,
  FaqSection,
  FinalCtaSection,
  InteriorModesSection,
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
      <ProcessSection />
      <InteriorModesSection />
      <WorkflowSection />
      <ExamplesSection />
      <ComparisonSection />
      <PricingSection />
      <StoriesSection />
      <FaqSection />
      <FinalCtaSection />
      <SiteFooter />
    </main>
  );
}

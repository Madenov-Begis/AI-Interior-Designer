import { ExamplesSection } from "@/client/widgets/marketing/examples-section";
import { Hero } from "@/client/widgets/marketing/hero";
import {
  ComparisonSection,
  FaqSection,
  FinalCtaSection,
  InteriorModesSection,
  PricingSection,
  StoriesSection,
  WorkflowSection,
} from "@/client/widgets/marketing/landing-sections";
import { ProcessSection } from "@/client/widgets/marketing/process-section";
import { SiteFooter } from "@/client/widgets/marketing/site-footer";
import { SiteHeader } from "@/client/widgets/marketing/site-header";

export default function HomePage() {
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

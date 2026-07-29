import { ExamplesSection } from "@/components/marketing/examples-section";
import { Hero } from "@/components/marketing/hero";
import {
  ComparisonSection,
  FaqSection,
  FinalCtaSection,
  InteriorModesSection,
  PricingSection,
  StoriesSection,
  WorkflowSection,
} from "@/components/marketing/landing-sections";
import { ProcessSection } from "@/components/marketing/process-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader authenticated={authenticated} />
      <Hero authenticated={authenticated} />
      <ProcessSection />
      <InteriorModesSection authenticated={authenticated} />
      <WorkflowSection authenticated={authenticated} />
      <ExamplesSection />
      <ComparisonSection authenticated={authenticated} />
      <PricingSection authenticated={authenticated} />
      <StoriesSection />
      <FaqSection />
      <FinalCtaSection authenticated={authenticated} />
      <SiteFooter />
    </main>
  );
}

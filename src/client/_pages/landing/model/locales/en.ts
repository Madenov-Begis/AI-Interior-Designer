import type { LandingDictionary } from "../dictionary";

const dictionary = {
  locale: "en",
  localeName: "English",
  seo: {
    title: "AI Interior Design from a Photo — Ruvie",
    description:
      "Upload a room photo and create a realistic AI interior design in minutes while preserving walls, windows, proportions, and camera angle.",
    openGraphTitle: "See your new interior before you renovate",
    openGraphDescription:
      "Create and refine realistic room designs from one photo with Ruvie.",
  },
  skipLink: "Skip to main content",
  header: {
    logoLabel: "Ruvie — home",
    navigationLabel: "Main navigation",
    examples: "Examples",
    process: "How it works",
    pricing: "Credits",
    login: "Sign in",
    languageLabel: "Language",
  },
  hero: {
    eyebrow: "AI interior design from your photo",
    title: ["See your new", "interior", "before renovation"],
    description:
      "Upload a photo of your room. Ruvie preserves the walls, windows, and camera angle, then creates a realistic redesign in minutes.",
    primaryCta: "Upload a photo for free",
    examplesCta: "View examples",
    freeCredits: "10 starter credits — enough for 2 designs · no card required",
    highlights: [
      "Private file storage",
      "6 interior styles",
      "Refine with plain text",
    ],
    resultAlt: "AI interior design created in Ruvie",
    resultLabel: "Design · Japandi",
    sourceAlt: "Original room photo before an AI redesign",
    sourceLabel: "Original room",
    geometryTitle: "Layout preserved",
    geometryCopy:
      "The interior changes while the room architecture stays in place.",
  },
  examples: {
    heading: ["See what your", "interior could become"],
    description:
      "Turn one photo into several realistic directions and compare them before buying furniture or starting a renovation.",
    aiLabel: "AI design",
    items: [
      {
        title: "Living room",
        style: "Japandi",
        alt: "Japandi living room AI interior design",
      },
      {
        title: "Kitchen",
        style: "Modern",
        alt: "Modern kitchen AI interior design",
      },
      {
        title: "Bedroom",
        style: "Minimalist",
        alt: "Minimalist bedroom AI interior design",
      },
      {
        title: "Home office",
        style: "Loft",
        alt: "Loft home office AI interior design",
      },
      {
        title: "Dining room",
        style: "Neoclassical",
        alt: "Neoclassical dining room AI interior design",
      },
    ],
  },
  process: {
    eyebrow: "From photo to idea",
    heading: "Easy to start. Easy to refine.",
    description:
      "Ruvie keeps the workflow focused on your room instead of forcing you through a long setup wizard. Every version stays in one project.",
    imageAlt: "Modern room visualization created with AI",
    steps: [
      {
        title: "Upload a photo",
        copy: "A clear smartphone photo of your room is enough.",
      },
      {
        title: "Describe your idea",
        copy: "Choose a style and explain what should stay or change.",
      },
      {
        title: "Refine the result",
        copy: "Compare designs and continue from the version you like.",
      },
    ],
  },
  stories: {
    eyebrow: "For home and work",
    heading: "Useful when you are…",
    items: [
      {
        title: "Planning a renovation",
        text: "Test styles, colors, and furniture before ordering materials or starting work.",
      },
      {
        title: "Working as a designer",
        text: "Prepare several directions for a first meeting and develop the chosen idea.",
      },
      {
        title: "Preparing a property for sale",
        text: "Show the potential of an empty or unfinished room without physical staging.",
      },
      {
        title: "Refreshing one room",
        text: "Compare ideas and discover which direction really fits your home.",
      },
    ],
  },
  workflow: {
    eyebrow: "One visual workspace",
    heading: "Never lose a promising design",
    description:
      "Your source photo, generated versions, and later refinements stay together on one canvas. Compare ideas and continue from any result.",
    items: [
      "Your photo appears directly on the canvas",
      "Every design stays side by side",
      "Describe refinements in plain language",
      "The full history remains visible",
    ],
    cta: "Upload a photo for free",
    credits: "10 credits",
    sourceAlt: "Original room photo on the Ruvie canvas",
    sourceLabel: "Original photo",
    resultAlt: "Generated interior design on the Ruvie canvas",
    resultLabel: "Design 01",
  },
  pricing: {
    heading: "Credit packages",
    description: "Credits power new designs and refinements in Ruvie",
    loading: "Loading credit packages…",
    error: "Could not load credit packages",
    retry: "Try again",
    popular: "Most popular",
    packageTitle: "{credits} credit package",
    packageDescription: "For AI designs and refinements",
    credits: "credits",
    enoughFor: "Enough for",
    generations: "designs or refinements",
    neverExpire: "Credits do not expire",
    buy: "Buy",
    starterTitle: "10 credits for new users",
    starterCopy: "Enough for 2 designs. No bank card required.",
    freeCta: "Try for free",
  },
  faq: {
    eyebrow: "FAQ",
    heading: "Frequently asked questions",
    description:
      "Everything you need to know before your first AI room redesign.",
    items: [
      {
        question: "Which photos work best?",
        answer:
          "Take a straight, well-lit photo without heavy blur. JPG, PNG, and WEBP files up to 15 MB are supported.",
      },
      {
        question: "Will Ruvie preserve windows and room geometry?",
        answer:
          "Yes. The core instruction asks the model to preserve the camera angle, proportions, and architectural elements.",
      },
      {
        question: "Can I continue from a design I like?",
        answer:
          "Yes. Select a result on the canvas, open refinement, and describe the next change.",
      },
      {
        question: "How much does one generation cost?",
        answer:
          "One generation costs 4 credits. Your current balance and exact cost are always shown before you start.",
      },
      {
        question: "What happens if there is a technical error?",
        answer:
          "Reserved credits are automatically returned, so a failed technical attempt is not charged.",
      },
      {
        question: "Do I need interior design skills?",
        answer:
          "No. Upload a photo, choose a style, and describe your idea in ordinary language.",
      },
      {
        question: "Do I have to pay immediately?",
        answer:
          "No. You receive 10 credits after registration—enough for two generations. No bank card is required to start.",
      },
    ],
  },
  finalCta: {
    eyebrow: "Start with one room",
    heading: "Start with a photo of your room",
    description:
      "Create your first two designs for free and decide whether to continue after seeing the result.",
    cta: "Upload a photo for free",
    imageAlt: "Bright neoclassical interior created with AI",
  },
  footer: {
    logoLabel: "Ruvie — home",
    navigationLabel: "Footer links",
    product: "Product",
    process: "How it works",
    examples: "Examples",
    login: "Sign in",
    documents: "Documents",
    privacy: "Privacy policy",
    offer: "Public offer",
    tagline: "AI interior design in one visual workspace",
  },
} satisfies LandingDictionary;

export default dictionary;

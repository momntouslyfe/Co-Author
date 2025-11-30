export type StorytellingFramework = {
  value: string;
  label: string;
  concept: string;
  example?: string;
};

export const STORYTELLING_FRAMEWORKS: StorytellingFramework[] = [
  {
    value: "The Hero's Journey",
    label: "The Hero's Journey",
    concept: "Hero ventures from ordinary world into supernatural adventure, faces decisive crisis and victory, then returns home transformed with wisdom to share with others.",
    example: "Star Wars, The Lord of the Rings",
  },
  {
    value: "The Mentor's Journey",
    label: "The Mentor's Journey",
    concept: "Position yourself as the trusted guide helping the reader (the hero) overcome challenges and achieve transformation through your expertise and wisdom.",
    example: "Business books, Self-help guides",
  },
  {
    value: "Three-Act Structure",
    label: "Three-Act Structure",
    concept: "Story divided into Setup (introduce world/conflict), Confrontation (rising action/obstacles), and Resolution (climax and conclusion), with each act serving specific narrative purposes.",
    example: "Pride and Prejudice, Romeo and Juliet",
  },
  {
    value: "Fichtean Curve",
    label: "Fichtean Curve",
    concept: "Crisis-driven storytelling starting immediately with action, featuring escalating conflicts building to a peak climax, followed by quick resolution. Minimal exposition, maximum tension.",
    example: "Pulp Fiction, The Wizard of Oz",
  },
  {
    value: "Save the Cat",
    label: "Save the Cat",
    concept: "15-beat framework with precise plot points: Opening Image, Theme, Setup, Catalyst, Debate, Break Into Two, B Story, Fun & Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night, Break Into Three, Finale, Final Image.",
    example: "The Matrix, Finding Nemo",
  },
  {
    value: "Man In Hole",
    label: "Man In Hole",
    concept: "Hero has a good life, gets into a difficult situation or crisis, overcomes the challenge through growth and perseverance, and emerges with a better life than before.",
    example: "Iron Man 1",
  },
  {
    value: "Cinderella/Rags to Riches",
    label: "Cinderella / Rags to Riches",
    concept: "Hero starts deep in misfortune, life steadily improves through effort or luck, tragedy strikes and seems to ruin everything, hero overcomes it and achieves a better life.",
    example: "The Pursuit of Happyness",
  },
  {
    value: "Boy Meets Girl",
    label: "Boy Meets Girl",
    concept: "Hero has a breakthrough or discovery that improves their life dramatically, ends up losing or ruining it through their own actions or circumstances, finds a way to get it back, and achieves a better life.",
    example: "The Notebook",
  },
  {
    value: "Which Way is Up",
    label: "Which Way is Up",
    concept: "Hero experiences a series of ups and downs throughout their journey, facing alternating victories and setbacks, but the overall trajectory is upward toward growth and success.",
    example: "The Alchemist",
  },
  {
    value: "Creation Story",
    label: "Creation Story",
    concept: "Hero begins in turmoil, chaos, or difficult circumstances. Through determination and growth, life steadily improves, ultimately resulting in a triumphant happy ending.",
    example: "Hidden Figures",
  },
  {
    value: "Redemption",
    label: "Redemption",
    concept: "Hero has a constantly improving life full of success, tragedy strikes and takes it all away, hero embarks on a journey to overcome the loss and eventually reclaims their joy and prosperity.",
    example: "Creed",
  },
];

export const getFrameworkConcept = (frameworkValue: string): string | undefined => {
  const framework = STORYTELLING_FRAMEWORKS.find(f => f.value === frameworkValue);
  return framework?.concept;
};

export const getFrameworkExample = (frameworkValue: string): string | undefined => {
  const framework = STORYTELLING_FRAMEWORKS.find(f => f.value === frameworkValue);
  return framework?.example;
};

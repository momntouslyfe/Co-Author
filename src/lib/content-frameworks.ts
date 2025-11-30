export const CONTENT_FRAMEWORKS = [
  { 
    value: 'AIDA (Attention, Interest, Desire, Action)', 
    label: 'AIDA - Attention, Interest, Desire, Action',
    concept: 'Grab attention with a hook, build interest with benefits, create desire through emotional appeal, then drive action with a clear CTA.'
  },
  { 
    value: 'PAS (Problem, Agitation, Solution)', 
    label: 'PAS - Problem, Agitation, Solution',
    concept: 'Identify the problem, agitate it by highlighting the pain and consequences, then present your solution as the relief.'
  },
  { 
    value: 'BAB (Before, After, Bridge)', 
    label: 'BAB - Before, After, Bridge',
    concept: 'Paint the current painful state (Before), show the ideal future (After), then reveal how to get there (Bridge).'
  },
  { 
    value: 'FAB (Features, Advantages, Benefits)', 
    label: 'FAB - Features, Advantages, Benefits',
    concept: 'List what it is (Features), explain why it matters (Advantages), and show the personal impact (Benefits).'
  },
  { 
    value: '4Ps (Promise, Picture, Proof, Push)', 
    label: '4Ps - Promise, Picture, Proof, Push',
    concept: 'Make a bold promise, paint a vivid picture of success, provide proof through testimonials or data, then push toward action.'
  },
  { 
    value: 'PASTOR (Problem, Amplify, Story, Transformation, Offer, Response)', 
    label: 'PASTOR - Problem to Response',
    concept: 'Address the problem, amplify the pain, share a relatable story, show transformation, present the offer, and request a response.'
  },
  { 
    value: 'QUEST (Qualify, Understand, Educate, Stimulate, Transition)', 
    label: 'QUEST - Qualify to Transition',
    concept: 'Qualify the reader, show you understand their situation, educate them on the solution, stimulate desire, then transition to action.'
  },
  { 
    value: 'SLAP (Stop, Look, Act, Purchase)', 
    label: 'SLAP - Stop, Look, Act, Purchase',
    concept: 'Stop the scroll with a hook, make them look closer with intrigue, prompt action with urgency, and close the purchase.'
  },
  { 
    value: 'ACCA (Awareness, Comprehension, Conviction, Action)', 
    label: 'ACCA - Awareness to Action',
    concept: 'Create awareness of the problem, build comprehension of the solution, develop conviction through proof, then drive action.'
  },
  { 
    value: 'PPPP (Picture, Promise, Prove, Push)', 
    label: '4P - Picture, Promise, Prove, Push',
    concept: 'Paint a picture of the outcome, promise specific results, prove it works with evidence, then push for the decision.'
  },
  { 
    value: 'SSS (Star, Story, Solution)', 
    label: 'SSS - Star, Story, Solution',
    concept: 'Introduce the star (hero), tell their compelling story of struggle, then reveal the solution that transformed everything.'
  },
  { 
    value: 'APP (Agree, Promise, Preview)', 
    label: 'APP - Agree, Promise, Preview',
    concept: 'Start with a statement readers agree with, promise to solve their problem, then preview what they will learn or receive.'
  },
  { 
    value: 'Future Pacing', 
    label: 'Future Pacing',
    concept: 'Guide readers to vividly imagine their future success after using your solution. Paint detailed mental pictures of their transformed life, helping them experience the emotions of achievement before it happens.'
  },
];

export function getContentFrameworkConcept(frameworkValue: string): string {
  const framework = CONTENT_FRAMEWORKS.find(fw => fw.value === frameworkValue);
  return framework?.concept || 'A proven copywriting framework for persuasive content.';
}

import { NextRequest } from 'next/server';
import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const ResearchInputSchema = z.object({
  topic: z.string(),
  language: z.string(),
  targetMarket: z.string().optional(),
});

const ResearchPlanSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    keyPoints: z.array(z.string()),
  })).min(8).max(8),
  focusAreas: z.array(z.string()),
});

const ResearchPartSchema = z.object({
  content: z.string().describe('Research content for the specified sections in Markdown format, 1000-1200 words total'),
});

const PainPointsAndAudiencesSchema = z.object({
  painPoints: z.string().describe('Pain point analysis in Markdown format with 8-10 pain points'),
  audiences: z.string().describe('Target audience suggestions in Markdown format with 5-7 audience groups'),
});

const CODE_MIXING_INSTRUCTIONS = `
**CRITICAL LANGUAGE RULE (CODE-MIXING):**
When writing in non-English languages (e.g., Bangla, Hindi), you MUST follow this code-mixing rule:
- ALL English-origin words (technical terms, borrowed words, commonly used English words) MUST be TRANSLITERATED into the target language script
- NEVER write English words in English/Latin script
- NEVER add English translations in parentheses after transliterated words
- Examples for Bangla: Write "টক্সিক সাইকেল" NOT "Toxic Cycle", Write "ভায়োলেশন" NOT "Violation", Write "গ্র্যাজুয়াল প্রসেস" NOT "Gradual process"
- This applies to ALL borrowed English terms including: technical terms, brand names, common loanwords, and any English-origin vocabulary
`;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          sendEvent('error', { message: 'Unauthorized' });
          controller.close();
          return;
        }

        const idToken = authHeader.substring(7);
        const admin = initializeFirebaseAdmin();
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { topic, language, targetMarket } = body;

        if (!topic || !language) {
          sendEvent('error', { message: 'Topic and language are required' });
          controller.close();
          return;
        }

        const totalSteps = 4;
        sendEvent('progress', { step: 0, message: 'Starting research...', total: totalSteps });

        await preflightCheckWordCredits(userId, 2500);

        const { ai, model: routedModel } = await getGenkitInstanceForFunction('research', userId, idToken);

        sendEvent('progress', { step: 1, message: 'Planning research structure...', total: totalSteps });
        
        const planPrompt = ai.definePrompt({
          name: 'researchPlanPrompt',
          input: { schema: ResearchInputSchema },
          output: { schema: ResearchPlanSchema },
          prompt: `You are a research planner. Create a brief research plan for a comprehensive topic library.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

Create a research plan with EXACTLY 8 sections (all mandatory):
1. Historical Context - Key milestones, evolution, and impact
2. Current Landscape - Present state, key players, current debates
3. Core Concepts - Essential principles and fundamental ideas
4. Key Data & Statistics - Important numbers and metrics
5. Expert Perspectives - Insights from thought leaders
6. Trends & Future Outlook - Emerging developments
7. Success Stories & Case Studies - Real examples with outcomes
8. Cross-Domain Connections - Links to other fields

For each section, provide 3-4 key points to cover.
Also list 4-5 main focus areas for the research.

Keep this concise - just the structural plan with exactly 8 sections.`,
        });

        const { output: plan } = await planPrompt({ topic, language, targetMarket }, { model: routedModel });
        
        if (!plan || !plan.sections || plan.sections.length < 8) {
          throw new Error('Failed to generate research plan with 8 sections');
        }
        
        sendEvent('plan', { plan });

        await delay(getRandomDelay(300, 500));

        sendEvent('progress', { step: 2, message: 'Researching sections 1-4...', total: totalSteps });

        const researchPartPrompt = ai.definePrompt({
          name: 'researchPartPrompt',
          input: { schema: z.object({
            topic: z.string(),
            language: z.string(),
            targetMarket: z.string().optional(),
            sections: z.array(z.object({
              title: z.string(),
              keyPoints: z.array(z.string()),
            })),
            partNumber: z.number(),
            includeReferences: z.boolean(),
          })},
          output: { schema: ResearchPartSchema },
          prompt: `You are a world-class research analyst. Generate comprehensive research content for the specified sections.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

**Sections to Write (Part {{{partNumber}}}):**
{{#each sections}}
### {{{title}}}
Key Points:
{{#each keyPoints}}
- {{{this}}}
{{/each}}

{{/each}}

**CRITICAL INSTRUCTIONS:**
1. Generate **1000-1200 words TOTAL** covering all {{sections.length}} sections in this part
2. Each section should be **250-300 words**
3. Start each section with its heading: ## [Section Title]
4. Use Markdown formatting with bullet points, **bold** for key terms
5. Include statistics and data points where available
6. Be accurate - if you don't know specific numbers, use qualifiers like "Studies suggest..."
7. Include > blockquotes for expert quotes when relevant
8. Write entirely in {{{language}}}
9. Separate each section with a blank line
{{#if includeReferences}}
10. End with a "## References & Further Reading" section with 8-12 real, verifiable links formatted as:
    - [Source Name](URL) - Brief description
{{/if}}

Generate ALL {{sections.length}} sections completely. Do not truncate or skip any section.`,
        });

        const sectionsPartOne = plan.sections.slice(0, 4);
        const { output: researchPart1 } = await researchPartPrompt({
          topic,
          language,
          targetMarket,
          sections: sectionsPartOne,
          partNumber: 1,
          includeReferences: false,
        }, { model: routedModel });

        if (!researchPart1?.content) {
          throw new Error('Failed to generate research part 1');
        }

        sendEvent('researchPart', { part: 1, content: researchPart1.content });

        await delay(getRandomDelay(300, 500));

        sendEvent('progress', { step: 3, message: 'Researching sections 5-8...', total: totalSteps });

        const sectionsPartTwo = plan.sections.slice(4, 8);
        const { output: researchPart2 } = await researchPartPrompt({
          topic,
          language,
          targetMarket,
          sections: sectionsPartTwo,
          partNumber: 2,
          includeReferences: true,
        }, { model: routedModel });

        if (!researchPart2?.content) {
          throw new Error('Failed to generate research part 2');
        }

        sendEvent('researchPart', { part: 2, content: researchPart2.content });

        const fullDeepResearch = researchPart1.content + '\n\n' + researchPart2.content;
        sendEvent('deepResearch', { content: fullDeepResearch });

        await delay(getRandomDelay(300, 500));
        
        sendEvent('progress', { step: 4, message: 'Analyzing pain points & audiences...', total: totalSteps });

        const painPointsAndAudiencesPrompt = ai.definePrompt({
          name: 'painPointsAndAudiencesPrompt',
          input: { schema: z.object({
            topic: z.string(),
            language: z.string(),
            targetMarket: z.string().optional(),
            researchSummary: z.string(),
          })},
          output: { schema: PainPointsAndAudiencesSchema },
          prompt: `You are a market analyst. Based on the research below, identify pain points and target audiences.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

Research Summary:
{{{researchSummary}}}

**PAIN POINTS INSTRUCTIONS:**
1. Identify 8-10 distinct pain points, challenges, and frustrations
2. For each pain point, provide a detailed explanation (2-3 sentences)
3. Use Markdown formatting with ## Pain Points heading
4. Each pain point should be a ### subheading with clear title
5. Be specific, actionable, and emotionally resonant
6. Target 500-600 words for pain points

**TARGET AUDIENCES INSTRUCTIONS:**
1. Identify 5-7 distinct audience groups who would benefit from a book on this topic
2. For each group, provide:
   - A clear description (NOT a named persona with a name)
   - 3-4 bullet points of their specific **Goals** related to the topic
   - 3-4 bullet points of their specific **Frustrations** related to the topic
3. Use Markdown formatting with ## Target Audiences heading
4. Each audience group should be a ### subheading with descriptive title
5. Target 500-600 words for audiences

Write entirely in {{{language}}}. Generate BOTH pain points AND audiences completely.`,
        });

        const researchSummary = fullDeepResearch.substring(0, 3000);
        const { output: painPointsAndAudiences } = await painPointsAndAudiencesPrompt(
          { topic, language, targetMarket, researchSummary },
          { model: routedModel }
        );

        if (!painPointsAndAudiences?.painPoints || !painPointsAndAudiences?.audiences) {
          throw new Error('Failed to generate pain points and audiences');
        }

        sendEvent('painPoints', { content: painPointsAndAudiences.painPoints });
        sendEvent('audiences', { content: painPointsAndAudiences.audiences });

        sendEvent('complete', {
          deepTopicResearch: fullDeepResearch,
          painPointAnalysis: painPointsAndAudiences.painPoints,
          targetAudienceSuggestion: painPointsAndAudiences.audiences,
        });

        sendEvent('progress', { step: 4, message: 'Research complete!', total: totalSteps, done: true });

        try {
          const totalContent = fullDeepResearch + '\n' + painPointsAndAudiences.painPoints + '\n' + painPointsAndAudiences.audiences;
          await trackAIUsage(userId, totalContent, 'researchBookTopic', { topic });
        } catch (trackingError) {
          console.error('Failed to track AI usage (non-critical):', trackingError);
        }

      } catch (error: any) {
        console.error('Research stream error:', error);
        sendEvent('error', { 
          message: error.message || 'An error occurred during research. Please try again.',
          retryable: error.message?.includes('503') || 
                     error.message?.includes('overloaded') || 
                     error.message?.includes('timeout') ||
                     error.message?.includes('rate limit') ||
                     error.message?.includes('429')
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

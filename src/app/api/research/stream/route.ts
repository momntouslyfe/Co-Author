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

const DeepResearchSchema = z.object({
  content: z.string().describe('Complete deep research content with all 8 sections in Markdown format, 2000-2500 words total'),
});

const PainPointSchema = z.object({
  content: z.string().describe('Pain point analysis in Markdown format, 500-700 words with 8-10 pain points'),
});

const AudienceSchema = z.object({
  content: z.string().describe('Target audience suggestions in Markdown format, 500-700 words with 5-7 audience groups'),
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

        sendEvent('progress', { step: 2, message: 'Conducting deep research...', total: totalSteps });

        const deepResearchPrompt = ai.definePrompt({
          name: 'deepResearchPrompt',
          input: { schema: z.object({
            topic: z.string(),
            language: z.string(),
            targetMarket: z.string().optional(),
            sections: z.array(z.object({
              title: z.string(),
              keyPoints: z.array(z.string()),
            })),
          })},
          output: { schema: DeepResearchSchema },
          prompt: `You are a world-class research analyst. Generate comprehensive research content covering ALL 8 sections for a topic research document.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

**Sections to Cover (ALL 8 are MANDATORY):**
{{#each sections}}
### Section {{@index}}: {{{title}}}
Key Points:
{{#each keyPoints}}
- {{{this}}}
{{/each}}

{{/each}}

**CRITICAL INSTRUCTIONS:**
1. Generate **2000-2500 words TOTAL** covering all 8 sections
2. Each section should be **250-350 words**
3. Start each section with its heading: ## [Section Title]
4. Use Markdown formatting with bullet points, **bold** for key terms
5. Include statistics and data points where available
6. Be accurate - if you don't know specific numbers, use qualifiers like "Studies suggest..."
7. Include > blockquotes for expert quotes when relevant
8. Write entirely in {{{language}}}
9. Separate each section with a blank line
10. End with a "## References & Further Reading" section with 8-12 real, verifiable links formatted as:
    - [Source Name](URL) - Brief description

Generate ALL 8 section content now, one after another. This is CRITICAL - do not skip any section.`,
        });

        const { output: deepResearch } = await deepResearchPrompt({
          topic,
          language,
          targetMarket,
          sections: plan.sections,
        }, { model: routedModel });

        if (!deepResearch?.content) {
          throw new Error('Failed to generate deep research content');
        }

        sendEvent('deepResearch', { content: deepResearch.content });
        
        await delay(getRandomDelay(300, 500));
        
        sendEvent('progress', { step: 3, message: 'Analyzing pain points...', total: totalSteps });

        const painPointPrompt = ai.definePrompt({
          name: 'painPointPrompt',
          input: { schema: z.object({
            topic: z.string(),
            language: z.string(),
            targetMarket: z.string().optional(),
            researchSummary: z.string(),
          })},
          output: { schema: PainPointSchema },
          prompt: `You are a market analyst. Based on the research below, identify pain points.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

Research Summary:
{{{researchSummary}}}

**INSTRUCTIONS:**
1. Identify 8-10 distinct pain points, challenges, and frustrations
2. For each pain point, provide a detailed explanation (3-4 sentences)
3. Use Markdown formatting with ## Pain Points heading
4. Each pain point should be a ### subheading with clear title
5. Be specific, actionable, and emotionally resonant
6. Write entirely in {{{language}}}
7. Target 500-700 words total

Generate the pain point analysis now.`,
        });

        const researchSummary = deepResearch.content.substring(0, 3000);
        const { output: painPoints } = await painPointPrompt(
          { topic, language, targetMarket, researchSummary },
          { model: routedModel }
        );

        if (!painPoints?.content) {
          throw new Error('Failed to generate pain point analysis');
        }

        sendEvent('painPoints', { content: painPoints.content });
        
        await delay(getRandomDelay(300, 500));
        
        sendEvent('progress', { step: 4, message: 'Identifying target audiences...', total: totalSteps });

        const audiencePrompt = ai.definePrompt({
          name: 'audiencePrompt',
          input: { schema: z.object({
            topic: z.string(),
            language: z.string(),
            targetMarket: z.string().optional(),
            painPointsSummary: z.string(),
          })},
          output: { schema: AudienceSchema },
          prompt: `You are a market analyst. Based on the pain points below, identify target audiences.

Topic: {{{topic}}}
Language: {{{language}}}
{{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

${CODE_MIXING_INSTRUCTIONS}

Pain Points Summary:
{{{painPointsSummary}}}

**INSTRUCTIONS:**
1. Identify 5-7 distinct audience groups who would benefit from a book on this topic
2. For each group, provide:
   - A clear description (NOT a named persona with a name)
   - 3-4 bullet points of their specific **Goals** related to the topic
   - 3-4 bullet points of their specific **Frustrations** related to the topic
3. Use Markdown formatting with ## Target Audiences heading
4. Each audience group should be a ### subheading with descriptive title
5. Write entirely in {{{language}}}
6. Target 500-700 words total

Generate the target audience suggestions now.`,
        });

        const { output: audiences } = await audiencePrompt(
          { topic, language, targetMarket, painPointsSummary: painPoints.content },
          { model: routedModel }
        );

        if (!audiences?.content) {
          throw new Error('Failed to generate audience suggestions');
        }

        sendEvent('audiences', { content: audiences.content });

        sendEvent('complete', {
          deepTopicResearch: deepResearch.content,
          painPointAnalysis: painPoints.content,
          targetAudienceSuggestion: audiences.content,
        });

        sendEvent('progress', { step: 4, message: 'Research complete!', total: totalSteps, done: true });

        try {
          const totalContent = deepResearch.content + '\n' + painPoints.content + '\n' + audiences.content;
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

'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process using multi-step generation for completeness.
 * - ResearchBookTopicInput - The input type for the researchBookTopic function.
 * - ResearchBookTopicOutput - The return type for the researchBooktopic function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { retryWithBackoff } from '@/lib/retry-utils';

const ResearchBookTopicInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  topic: z.string().describe('The topic to research.'),
  language: z.string().describe('The language for the research results (e.g., "English", "Bangla").'),
  targetMarket: z.string().optional().describe('The specific target market for the research (e.g., "USA", "Global Tech Industry").'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type ResearchBookTopicInput = z.infer<typeof ResearchBookTopicInputSchema>;

const ResearchBookTopicOutputSchema = z.object({
  deepTopicResearch: z.string().describe('Comprehensive research on the topic, including history, key concepts, trends, and a list of reference links. Formatted in Markdown.'),
  painPointAnalysis: z.string().describe('Analysis of the pain points, challenges, and problems readers face, presented in well-structured Markdown.'),
  targetAudienceSuggestion: z.string().describe('Suggestions for the ideal target audience, presented in well-structured Markdown.'),
});
export type ResearchBookTopicOutput = z.infer<typeof ResearchBookTopicOutputSchema>;

const DeepResearchOutputSchema = z.object({
  deepTopicResearch: z.string().describe('Comprehensive research on the topic in Markdown format.'),
});

const PainPointOutputSchema = z.object({
  painPointAnalysis: z.string().describe('Pain point analysis in Markdown format.'),
});

const AudienceOutputSchema = z.object({
  targetAudienceSuggestion: z.string().describe('Target audience suggestions in Markdown format.'),
});

const RESEARCH_RETRY_CONFIG = {
  maxRetries: 4,
  initialDelayMs: 3000,
  maxDelayMs: 90000,
  backoffMultiplier: 2.5,
};

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  await preflightCheckWordCredits(input.userId, 2000);
  
  const { ai, model: routedModel } = await getGenkitInstanceForFunction('research', input.userId, input.idToken);
  const selectedModel = input.model || routedModel;
  
  // Step 1: Generate Deep Topic Research (main research content)
  const deepResearchContext = `Deep Research: "${input.topic}"`;
  const deepResearchResult = await retryWithBackoff(
    async () => {
      const deepResearchPrompt = ai.definePrompt({
        name: 'deepTopicResearchPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: DeepResearchOutputSchema},
        prompt: `You are a world-class research analyst. Your task is to produce a comprehensive topic research document.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

---

## CRITICAL - COMPLETE OUTPUT REQUIRED:
- You MUST generate a COMPLETE, FULL research document
- NEVER stop mid-section or mid-thought
- NEVER generate partial content - this is considered a FAILURE
- Each section must be thoroughly developed with multiple paragraphs
- Minimum 2000-2500 words for the research output

## RESEARCH INSTRUCTIONS:

### 1. Go Deep and Be Data-Driven (When Available):
Your research should be exceptionally thorough and evidence-based. Include:
- **Statistics & Data:** Specific numbers, percentages, growth rates, market sizes
- **Research Findings:** Studies, surveys, and research results
- **Case Studies:** Real-world examples of success/failure with outcomes
- **Expert Insights:** Perspectives from recognized authorities
- **Trends & Projections:** Current trends and future forecasts
- **Comparative Data:** Comparisons between approaches, methods, or timeframes

**IMPORTANT - Accuracy Over Fabrication:** If you don't have specific statistics, provide conceptual information instead of inventing data. Use qualifiers like "Studies suggest...", "Research indicates..." rather than fabricating numbers.

### 2. Structure Your Research:
Organize information under these clear sections:
- **Historical Context:** Key milestones with dates and impact
- **Current Landscape:** Present state with current statistics
- **Core Concepts:** Essential principles backed by research
- **Key Data & Statistics:** A dedicated section with important numbers
- **Expert Perspectives:** Insights from thought leaders
- **Trends & Future Outlook:** Emerging developments
- **Success Stories & Case Studies:** Real examples with results

### 3. Formatting (NON-NEGOTIABLE):
- Use clear headings (##) and subheadings (###)
- Use bullet points for lists
- Use **bold** for key terms and statistics
- Use > blockquotes for expert quotes
- Use tables for comparative data when appropriate

### 4. References & Source Links (REQUIRED):
At the end, include a "References & Source Links" heading with:
- 5-10 relevant, real URLs to authoritative sources
- Format: [Source Name](URL) - Brief description
- Only include REAL, VERIFIABLE URLs
- Never fabricate URLs

Provide the complete response in **{{{language}}}**. Generate the COMPLETE research now.`,
      });
      
      const {output} = await deepResearchPrompt(input, { model: selectedModel });
      
      if (!output || !output.deepTopicResearch || output.deepTopicResearch.length < 800) {
        throw new Error('AI failed to generate complete deep research. Output was too short.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    deepResearchContext
  );

  // Step 2: Generate Pain Point Analysis
  const painPointContext = `Pain Points: "${input.topic}"`;
  const painPointResult = await retryWithBackoff(
    async () => {
      const painPointPrompt = ai.definePrompt({
        name: 'painPointAnalysisPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: PainPointOutputSchema},
        prompt: `You are a market research expert. Analyze pain points for the following topic.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

---

## PAIN POINT ANALYSIS

Identify **6-8 key pain points** that people face regarding this topic. For each pain point:

1. **Pain Point Title** - A clear, descriptive title
2. **Description** - 3-4 sentences explaining:
   - What the problem is
   - Why it matters
   - How it affects people
   - Common manifestations

3. **Impact Level** - Rate as High/Medium/Low with brief explanation

Format using Markdown with clear headings for each pain point. Be specific and actionable.

Provide the complete analysis in **{{{language}}}**.`,
      });
      
      const {output} = await painPointPrompt(input, { model: selectedModel });
      
      if (!output || !output.painPointAnalysis || output.painPointAnalysis.length < 200) {
        throw new Error('AI failed to generate pain point analysis.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    painPointContext
  );

  // Step 3: Generate Target Audience Suggestions
  const audienceContext = `Audience: "${input.topic}"`;
  const audienceResult = await retryWithBackoff(
    async () => {
      const audiencePrompt = ai.definePrompt({
        name: 'targetAudiencePrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: AudienceOutputSchema},
        prompt: `You are a market research expert. Identify target audiences for the following topic.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

---

## TARGET AUDIENCE ANALYSIS

Identify **5-6 distinct audience groups** who would benefit from content about this topic. For each audience:

### [Audience Name]
**Demographics:**
- Age range, profession, experience level

**Profile:**
- 2-3 sentences describing who they are

**Goals (3-4 points):**
- What they want to achieve
- Their aspirations related to this topic

**Frustrations (3-4 points):**
- Current challenges they face
- What's holding them back

**Why This Topic Matters to Them:**
- 1-2 sentences on relevance

Format using Markdown with clear sections for each audience group. Be specific and detailed.

Provide the complete analysis in **{{{language}}}**.`,
      });
      
      const {output} = await audiencePrompt(input, { model: selectedModel });
      
      if (!output || !output.targetAudienceSuggestion || output.targetAudienceSuggestion.length < 200) {
        throw new Error('AI failed to generate audience suggestions.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    audienceContext
  );

  // Combine results
  const result: ResearchBookTopicOutput = {
    deepTopicResearch: deepResearchResult.deepTopicResearch,
    painPointAnalysis: painPointResult.painPointAnalysis,
    targetAudienceSuggestion: audienceResult.targetAudienceSuggestion,
  };
  
  await trackAIUsage(
    input.userId,
    result.deepTopicResearch + '\n' + result.painPointAnalysis + '\n' + result.targetAudienceSuggestion,
    'researchBookTopic',
    { topic: input.topic }
  );
  
  return result;
}

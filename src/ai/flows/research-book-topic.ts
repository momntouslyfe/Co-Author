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
  // Using high maxOutputTokens to prevent truncation
  const deepResearchContext = `Deep Research: "${input.topic}"`;
  const deepResearchResult = await retryWithBackoff(
    async () => {
      const deepResearchPrompt = ai.definePrompt({
        name: 'deepTopicResearchPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: DeepResearchOutputSchema},
        config: {
          maxOutputTokens: 8000,
          temperature: 0.7,
        },
        prompt: `You are a world-class research analyst. Produce a comprehensive topic research document.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

---

## CRITICAL REQUIREMENTS:
- Generate a COMPLETE research document (2000-2500 words minimum)
- NEVER stop mid-section - complete every section fully
- Each section must have 3-4 substantial paragraphs

## REQUIRED SECTIONS (Complete ALL):

### 1. Historical Context (300-400 words)
Key milestones, evolution, and important dates in this field.

### 2. Current Landscape (300-400 words)
Present state, market size, current trends, and recent developments.

### 3. Core Concepts & Principles (300-400 words)
Fundamental ideas, key theories, and essential knowledge.

### 4. Key Data & Statistics (200-300 words)
Important numbers, percentages, research findings. Use qualifiers if uncertain.

### 5. Expert Perspectives (200-300 words)
Insights from thought leaders and recognized authorities.

### 6. Trends & Future Outlook (300-400 words)
Emerging developments, predictions, and future directions.

### 7. Success Stories & Case Studies (200-300 words)
Real examples with outcomes and lessons learned.

### 8. References & Source Links
5-10 real, authoritative URLs formatted as: [Source Name](URL) - Brief description

## FORMATTING:
- Use ## for main headings, ### for subheadings
- Use bullet points for lists
- Use **bold** for key terms
- Use > blockquotes for quotes

Write in **{{{language}}}**. Generate ALL sections completely.`,
      });
      
      const {output} = await deepResearchPrompt(input, { model: selectedModel });
      
      if (!output || !output.deepTopicResearch || output.deepTopicResearch.length < 1500) {
        throw new Error('AI failed to generate complete deep research. Output was too short.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    deepResearchContext
  );

  // Step 2: Generate Pain Point Analysis (concise)
  const painPointContext = `Pain Points: "${input.topic}"`;
  const painPointResult = await retryWithBackoff(
    async () => {
      const painPointPrompt = ai.definePrompt({
        name: 'painPointAnalysisPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: PainPointOutputSchema},
        config: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
        prompt: `Identify key pain points for this topic. Be CONCISE (300-400 words max).

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

List exactly **4 pain points** in this format:

### 1. [Pain Point Title]
**Problem:** 1-2 sentences describing the issue.
**Impact:** High/Medium/Low - one sentence explaining why.

### 2. [Pain Point Title]
...

Keep each pain point brief (50-75 words). No lengthy explanations.

Write in **{{{language}}}**.`,
      });
      
      const {output} = await painPointPrompt(input, { model: selectedModel });
      
      if (!output || !output.painPointAnalysis || output.painPointAnalysis.length < 150) {
        throw new Error('AI failed to generate pain point analysis.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    painPointContext
  );

  // Step 3: Generate Target Audience Suggestions (concise)
  const audienceContext = `Audience: "${input.topic}"`;
  const audienceResult = await retryWithBackoff(
    async () => {
      const audiencePrompt = ai.definePrompt({
        name: 'targetAudiencePrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: AudienceOutputSchema},
        config: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
        prompt: `Identify target audiences for this topic. Be CONCISE (300-400 words max).

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

List exactly **4 audience groups** in this format:

### 1. [Audience Name]
**Who:** Age, profession, experience (1 line)
**Goals:** 2 bullet points
**Frustrations:** 2 bullet points

### 2. [Audience Name]
...

Keep each audience brief (60-80 words). No lengthy descriptions.

Write in **{{{language}}}**.`,
      });
      
      const {output} = await audiencePrompt(input, { model: selectedModel });
      
      if (!output || !output.targetAudienceSuggestion || output.targetAudienceSuggestion.length < 150) {
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

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
        prompt: `You are a world-class research analyst. Your task is to produce a comprehensive topic research document.

**Research Topic:** {{{topic}}}
**Output Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

## INSTRUCTIONS:
Generate a complete research document with 1800-2200 words total. Write all content in {{{language}}}.

You MUST include ALL of these sections with the specified word counts:

## Historical Context (200-250 words)
Write about key milestones, evolution, and important dates in this field. Include how the topic has developed over time.

## Current Landscape (250-300 words)
Describe the present state, market conditions, current trends, and recent developments. Include relevant statistics where possible.

## Core Concepts & Principles (350-400 words)
Explain fundamental ideas, key theories, essential knowledge, and important principles. This section should be comprehensive and educational.

## Key Data & Statistics (300-350 words)
Present important numbers, percentages, research findings, and quantitative insights. Use qualifiers like "studies suggest" or "research indicates" if exact data is uncertain.

## Expert Perspectives (150-200 words)
Share insights from thought leaders and recognized authorities in the field.

## Trends & Future Outlook (250-300 words)
Discuss emerging developments, predictions, and future directions for this topic.

## Success Stories & Case Studies (150-200 words)
Provide real examples with outcomes and lessons learned.

## References & Source Links
List 5-10 real, authoritative URLs. Format each as: [Source Name](URL) - Brief description. Only include URLs you are confident exist.

## FORMATTING RULES:
- Use ## for section headings
- Use ### for subsections
- Use bullet points for lists
- Use **bold** for key terms and statistics
- Use > blockquotes for expert quotes

Generate the complete research document now in {{{language}}}.`,
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

  // Step 2: Generate Pain Point Analysis
  const painPointContext = `Pain Points: "${input.topic}"`;
  const painPointResult = await retryWithBackoff(
    async () => {
      const painPointPrompt = ai.definePrompt({
        name: 'painPointAnalysisPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: PainPointOutputSchema},
        config: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
        prompt: `You are a market research expert. Analyze pain points for the following topic.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

## YOUR TASK:
Generate a pain point analysis document (400-500 words total) in {{{language}}}.

Identify exactly 5 key pain points that people face regarding this topic. For each pain point, provide:

### Pain Point 1: [Title]
**The Problem:** Describe what the issue is in 2-3 sentences.
**Why It Matters:** Explain the impact in 1-2 sentences.
**Common Signs:** List 2-3 indicators that someone is experiencing this.

### Pain Point 2: [Title]
(Follow the same format)

### Pain Point 3: [Title]
(Follow the same format)

### Pain Point 4: [Title]
(Follow the same format)

### Pain Point 5: [Title]
(Follow the same format)

Use Markdown formatting with headers, bold text, and bullet points. Write the complete analysis in {{{language}}}.`,
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
        config: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
        prompt: `You are a market research expert. Identify target audiences for the following topic.

**Topic:** {{{topic}}}
**Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

## YOUR TASK:
Generate a target audience analysis document (400-500 words total) in {{{language}}}.

Identify exactly 5 distinct audience groups who would benefit from content about this topic. For each audience:

### Audience 1: [Audience Name]
**Demographics:** Age range, profession, experience level (1-2 sentences)
**Goals:** 
- Goal 1
- Goal 2
- Goal 3
**Frustrations:**
- Frustration 1
- Frustration 2
- Frustration 3
**Why This Topic Matters:** 1-2 sentences on relevance

### Audience 2: [Audience Name]
(Follow the same format)

### Audience 3: [Audience Name]
(Follow the same format)

### Audience 4: [Audience Name]
(Follow the same format)

### Audience 5: [Audience Name]
(Follow the same format)

Use Markdown formatting with headers and bullet points. Write the complete analysis in {{{language}}}.`,
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

'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process.
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

const RESEARCH_RETRY_CONFIG = {
  maxRetries: 4,
  initialDelayMs: 3000,
  maxDelayMs: 90000,
  backoffMultiplier: 2.5,
};

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  await preflightCheckWordCredits(input.userId, 2000);
  
  const context = `Research Topic: "${input.topic}"`;
  
  const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('research', input.userId, input.idToken);
      
      const prompt = ai.definePrompt({
        name: 'researchBookTopicPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: ResearchBookTopicOutputSchema},
        prompt: `You are a world-class research analyst. Your task is to produce a "Comprehensive Topic Library" and a "Topic Market Analysis" that is exceptionally deep, comprehensive, and well-sourced.

  **Topic:** {{{topic}}}
  **Language:** {{{language}}}
  {{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

  ---

  ### Part 1: Comprehensive Topic Library

  **CRITICAL - COMPLETE OUTPUT REQUIRED:**
  - You MUST generate a COMPLETE, FULL research document
  - NEVER stop mid-section or mid-thought
  - NEVER generate partial content - this is considered a FAILURE
  - Each section must be thoroughly developed with multiple paragraphs
  - Minimum 1500-2000 words for the entire research output

  **CRITICAL INSTRUCTIONS:**
  1.  **Go Deep and Be Data-Driven (When Available):** Your research should be exceptionally thorough and evidence-based. For each major section, include as much of the following as you have reliable knowledge about:
      - **Statistics & Data:** Specific numbers, percentages, growth rates, market sizes (include approximate timeframes when citing data)
      - **Research Findings:** Studies, surveys, and research results (note: if you don't have specific study names or dates, provide general insights)
      - **Case Studies:** Real-world examples of success/failure with outcomes (can be well-known examples even if you don't have exact metrics)
      - **Expert Insights:** Perspectives from recognized authorities or common expert consensus
      - **Trends & Projections:** Current trends with supporting observations and future forecasts
      - **Comparative Data:** Comparisons between approaches, methods, or timeframes
      
      **IMPORTANT - Accuracy Over Fabrication:** If you don't have specific statistics or cannot recall exact numbers, provide conceptual information instead of inventing data. Use qualifiers like "Studies suggest...", "Research indicates...", "According to industry analysis..." rather than citing non-existent specific studies with fabricated numbers.
      
  2.  **Structure Your Research:** Organize information under clear sections:
      - **Historical Context:** Key milestones with dates and impact metrics
      - **Current Landscape:** Present state with current statistics (within last 2-3 years)
      - **Core Concepts:** Essential principles backed by research
      - **Key Data & Statistics:** A dedicated section with the most important numbers
      - **Expert Perspectives:** Insights from thought leaders and researchers
      - **Trends & Future Outlook:** Emerging developments with supporting evidence
      - **Success Stories & Case Studies:** Real examples with measurable results
      
  3.  **Formatting (NON-NEGOTIABLE):** Present all information in a highly structured, readable format using Markdown:
      - Use clear headings (##) and subheadings (###)
      - Use bullet points for lists
      - Use **bold** for key terms and statistics
      - Use > blockquotes for expert quotes
      - Use tables for comparative data when appropriate
      
  4.  **References & Source Links (REQUIRED):** At the end of this section, you MUST include a "References & Source Links" heading with:
      - **Authoritative Source Links:** Include 5-10 relevant, real URLs to authoritative sources like:
        - Official organization websites (WHO, government sites, academic institutions)
        - Reputable publications (Harvard Business Review, Forbes, industry journals)
        - Research databases (PubMed, Google Scholar links when applicable)
        - Well-known expert blogs or official company resources
      - **Format each link as:** [Source Name](URL) - Brief description of what this source covers
      - **IMPORTANT:** Only include REAL, VERIFIABLE URLs that you are confident exist. If you cannot recall a specific URL, provide the organization name and suggest the reader search for their official site.
      - **Never fabricate URLs** - only include links you are confident are real and accessible

  ---

  ### Part 2: Topic Market Analysis (KEEP CONCISE)

  **INSTRUCTIONS:**
  1.  **Pain Point Analysis:** Identify 4-5 key pain points related to this topic. Keep each pain point description brief (2-3 sentences each). Format as a simple bulleted list.
  2.  **Target Audience Suggestions:** Identify **4-5 distinct audience groups**. For each group, provide a brief description (1-2 sentences) with a short bulleted list of their main Goals and Frustrations (2-3 bullets each).

  **NOTE:** Part 2 should be concise to allow more space for the comprehensive research in Part 1.

  ---

  **PRIORITY ORDER:**
  1. **HIGHEST PRIORITY:** \`deepTopicResearch\` - This MUST be complete with all sections, data, and source links (minimum 1500 words)
  2. **SECONDARY:** \`painPointAnalysis\` - Keep concise (300-400 words max)
  3. **SECONDARY:** \`targetAudienceSuggestion\` - Keep concise (300-400 words max)

  Focus your output capacity on making the deep research comprehensive. The market analysis sections should be brief summaries.

  You must provide the entire response in the specified **{{{language}}}**, organized into the three requested output fields. Proceed with generating the COMPLETE research now.`,
      });
      
      const {output} = await prompt(input, { model: input.model || routedModel });
      
      if (!output) {
        throw new Error('AI failed to generate research data.');
      }
      
      if (!output.deepTopicResearch || output.deepTopicResearch.length < 500) {
        throw new Error('AI failed to generate complete research. Output was too short.');
      }
      
      if (!output.painPointAnalysis || output.painPointAnalysis.length < 100) {
        throw new Error('AI failed to generate pain point analysis.');
      }
      
      if (!output.targetAudienceSuggestion || output.targetAudienceSuggestion.length < 100) {
        throw new Error('AI failed to generate audience suggestions.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    context
  );
  
  await trackAIUsage(
    input.userId,
    result.deepTopicResearch + '\n' + result.painPointAnalysis + '\n' + result.targetAudienceSuggestion,
    'researchBookTopic',
    { topic: input.topic }
  );
  
  return result;
}

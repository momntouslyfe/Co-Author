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

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  await preflightCheckWordCredits(input.userId, 2000);
  
  const { ai, model: routedModel } = await getGenkitInstanceForFunction('research', input.userId, input.idToken);
  
  try {
    const prompt = ai.definePrompt({
      name: 'researchBookTopicPrompt',
      input: {schema: ResearchBookTopicInputSchema},
      output: {schema: ResearchBookTopicOutputSchema},
      prompt: `You are a world-class research analyst with expertise in deep, multi-dimensional topic analysis. Your task is to produce a "Comprehensive Topic Library" and a "Topic Market Analysis" that is exceptionally deep, comprehensive, and well-sourced.

  **Topic:** {{{topic}}}
  **Language:** {{{language}}}
  {{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

  ---

  ## DEEP THINKING PHASE (Do This First)

  Before writing any content, mentally analyze the topic from multiple angles:
  1. **Historical perspective:** How did this topic evolve? What key events shaped it?
  2. **Current state:** What is the present reality? Who are the key players?
  3. **Future trajectory:** Where is this heading? What trends are emerging?
  4. **Multi-domain connections:** How does this topic connect to psychology, economics, technology, culture, health, relationships, or other fields?
  5. **Contrarian views:** What are alternative perspectives or criticisms?
  6. **Practical implications:** How does this affect real people's lives?

  Use this mental framework to ensure your research covers ALL important dimensions, not just surface-level information.

  ---

  ### Part 1: Comprehensive Topic Library

  **CRITICAL INSTRUCTIONS:**
  
  1.  **COMPLETE OUTPUT (NON-NEGOTIABLE):**
      - You MUST produce a COMPLETE, FULL research document with at least **2000-2500 words**
      - NEVER stop mid-section or produce partial output - this is considered a FAILURE
      - ALL sections listed below are MANDATORY - do not skip any
      - Each section must have substantial content with multiple paragraphs
      
  2.  **Go Deep and Be Data-Driven (When Available):** Your research should be exceptionally thorough and evidence-based. For each major section, include as much of the following as you have reliable knowledge about:
      - **Statistics & Data:** Specific numbers, percentages, growth rates, market sizes (include approximate timeframes when citing data)
      - **Research Findings:** Studies, surveys, and research results (note: if you don't have specific study names or dates, provide general insights)
      - **Case Studies:** Real-world examples of success/failure with outcomes (can be well-known examples even if you don't have exact metrics)
      - **Expert Insights:** Perspectives from recognized authorities or common expert consensus
      - **Trends & Projections:** Current trends with supporting observations and future forecasts
      - **Comparative Data:** Comparisons between approaches, methods, or timeframes
      
      **IMPORTANT - Accuracy Over Fabrication:** If you don't have specific statistics or cannot recall exact numbers, provide conceptual information instead of inventing data. Use qualifiers like "Studies suggest...", "Research indicates...", "According to industry analysis..." rather than citing non-existent specific studies with fabricated numbers.
      
  3.  **Structure Your Research (ALL SECTIONS MANDATORY):** Organize information under these clear sections - you MUST include ALL of them:
      - **Historical Context:** Key milestones with dates and impact metrics (WHY this history matters for understanding the topic today)
      - **Current Landscape:** Present state with current statistics (within last 2-3 years) - include key players, dominant approaches, and current debates
      - **Core Concepts:** Essential principles backed by research - explain not just WHAT but WHY these concepts matter
      - **Key Data & Statistics:** A dedicated section with the most important numbers - present data that readers can reference and cite
      - **Expert Perspectives:** Insights from thought leaders and researchers - include diverse viewpoints including contrarian perspectives
      - **Trends & Future Outlook:** Emerging developments with supporting evidence - what changes are coming and why
      - **Success Stories & Case Studies:** Real examples with measurable results - include both successes AND failures for balanced perspective
      - **Cross-Domain Connections:** How this topic connects to other fields (psychology, economics, technology, culture, etc.)
      
  4.  **Formatting (NON-NEGOTIABLE):** Present all information in a highly structured, readable format using Markdown:
      - Use clear headings (##) and subheadings (###)
      - Use bullet points for lists
      - Use **bold** for key terms and statistics
      - Use > blockquotes for expert quotes
      - Use tables for comparative data when appropriate
      
  5.  **References & Source Links (MANDATORY):** At the end of this section, include a "References & Further Reading" heading with **8-12 reference links**:
      - Include links to authoritative websites, research institutions, and publications related to this topic
      - Format as: [Source Name](URL) - Brief description of what readers will find
      - Include a mix of: official organization websites, educational resources, research databases, industry publications, and reputable news sources
      - These should be REAL, verifiable URLs that readers can actually visit for more information
      - Examples: Wikipedia articles, official organization websites (.org, .gov), university resources, well-known publication sites
      - If you're uncertain about a specific URL, provide the organization/source name and suggest readers search for it

  ---

  ### Part 2: Topic Market Analysis

  **CRITICAL INSTRUCTIONS:**
  1.  **Pain Point Analysis:** Based on your research, identify and analyze the most significant pain points, challenges, and frustrations people in the target market have regarding this topic. Format this as a well-structured Markdown document. Include at least **8-10 distinct pain points** with detailed explanations.
  
  2.  **Target Audience Suggestions:** Based on the pain points, identify **5 to 7 distinct audience groups** who would benefit from a book on this topic. For each group, do not create a persona with a name. Instead, provide a clear description of the audience group, followed by a bulleted list of their specific **Goals** and **Frustrations** related to the topic. Format this as a well-structured Markdown document with clear headings for each audience group.

  ---

  **FINAL COMPLETION CHECK (NON-NEGOTIABLE):**
  Before submitting your response, verify:
  - [ ] Deep Topic Research has ALL 8 mandatory sections with substantial content
  - [ ] Research is at least 2000-2500 words
  - [ ] References section has 8-12 source links
  - [ ] Pain Point Analysis has 8-10 distinct pain points
  - [ ] Target Audience has 5-7 distinct audience groups with Goals and Frustrations
  - [ ] All content is in {{{language}}}
  
  **Partial or incomplete output is a FAILURE. You MUST complete the entire research.**

  You must provide the entire response in the specified **{{{language}}}**, organized into the three requested output fields: \`deepTopicResearch\`, \`painPointAnalysis\`, and \`targetAudienceSuggestion\`. Proceed with generating the COMPLETE research now.`,
    });
    
    const {output} = await prompt(input, { model: input.model || routedModel });
    
    if (!output) {
      throw new Error('The AI did not return any research data. Please try again.');
    }
    
    await trackAIUsage(
      input.userId,
      output.deepTopicResearch + '\n' + output.painPointAnalysis + '\n' + output.targetAudienceSuggestion,
      'researchBookTopic',
      { topic: input.topic }
    );
    
    return output;
  } catch (error: any) {
    console.error('Error in researchBookTopic:', error);
    
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error(
        'The AI service is currently overloaded. Please wait a moment and try again.'
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error(
        'Your API key appears to be invalid or expired. Please check your API key in Settings.'
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error(
        'You have exceeded your API quota. Please check your usage limits or try again later.'
      );
    }
    
    throw new Error(error.message || 'An unexpected error occurred while researching the topic. Please try again.');
  }
}

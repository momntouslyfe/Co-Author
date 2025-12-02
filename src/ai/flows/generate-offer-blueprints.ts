'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling, type AIResult } from '@/lib/ai-error-handler';
import { OFFER_CATEGORY_STRUCTURE, OFFER_CATEGORY_LABELS, OFFER_CATEGORY_DESCRIPTIONS } from '@/lib/definitions';
import type { OfferCategory } from '@/lib/definitions';

const GenerateOfferBlueprintsInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  offerTitle: z.string().describe('The title of the offer/bonus material.'),
  offerDescription: z.string().describe('Description of the offer idea.'),
  offerCategory: z.string().describe('The category of the offer (e.g., workbook, quick-start-guide).'),
  bookTitle: z.string().describe('The title of the source book project.'),
  bookOutline: z.string().describe('The master blueprint/outline of the book.'),
  language: z.string().describe('The language for the offer content.'),
  researchProfile: z.string().optional().describe('Optional research profile for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  authorProfile: z.string().optional().describe('Optional author profile for context.'),
  storytellingFramework: z.string().optional().describe('Optional storytelling framework (e.g., Hero\'s Journey, AIDA).'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type GenerateOfferBlueprintsInput = z.infer<typeof GenerateOfferBlueprintsInputSchema>;

const GenerateOfferBlueprintsOutputSchema = z.object({
  blueprint1_title: z.string().describe('Title for blueprint 1'),
  blueprint1_summary: z.string().describe('2-3 sentence summary for blueprint 1'),
  blueprint1_parts: z.string().describe('JSON string of parts array: [{"title":"Part Title","modules":["Module 1","Module 2"]}]'),
  blueprint1_wordCount: z.number().describe('Estimated word count for blueprint 1'),
  blueprint2_title: z.string().describe('Title for blueprint 2'),
  blueprint2_summary: z.string().describe('2-3 sentence summary for blueprint 2'),
  blueprint2_parts: z.string().describe('JSON string of parts array: [{"title":"Part Title","modules":["Module 1","Module 2"]}]'),
  blueprint2_wordCount: z.number().describe('Estimated word count for blueprint 2'),
  blueprint3_title: z.string().describe('Title for blueprint 3'),
  blueprint3_summary: z.string().describe('2-3 sentence summary for blueprint 3'),
  blueprint3_parts: z.string().describe('JSON string of parts array: [{"title":"Part Title","modules":["Module 1","Module 2"]}]'),
  blueprint3_wordCount: z.number().describe('Estimated word count for blueprint 3'),
});

export type GenerateOfferBlueprintsRawOutput = z.infer<typeof GenerateOfferBlueprintsOutputSchema>;

export interface GenerateOfferBlueprintsOutput {
  blueprints: Array<{
    id?: string;
    title: string;
    summary: string;
    parts: Array<{ title: string; modules: string[] }>;
    estimatedWordCount: number;
  }>;
}

const CATEGORY_BLUEPRINT_PROMPTS: Record<Exclude<OfferCategory, 'all'>, string> = {
  'complementary-skill-guide': `Generate blueprints for a COMPLEMENTARY SKILL GUIDE.
Structure: 3 Parts, 3 Modules per Part (~600 words each)
- Part 1: Foundation - Core concepts and essential knowledge
- Part 2: Application - Practical implementation and step-by-step guidance
- Part 3: Mastery - Advanced techniques and real-world examples`,

  'workbook': `Generate blueprints for a WORKBOOK / ACTIONBOOK.
Structure: 3 Parts, 4 Modules per Part (~500 words each)
- Part 1: Self-Assessment - Understanding current state and goal setting
- Part 2: Action Exercises - Practical exercises to apply concepts
- Part 3: Progress Tracking - Templates for tracking and reflection`,

  '30-day-challenge': `Generate blueprints for a 30 DAY CHALLENGE.
Structure: 3 Parts, 4 Modules per Part (~500 words each)
- Part 1: Preparation (Days 1-7) - Setup, rules, and first week actions
- Part 2: Building Momentum (Days 8-21) - Core challenge activities
- Part 3: Cementing Habits (Days 22-30) - Final push and habit formation`,

  'quick-start-guide': `Generate blueprints for a QUICK START GUIDE.
Structure: 2 Parts, 4 Modules per Part (~500 words each)
- Part 1: The Essentials - Must-know info and required setup
- Part 2: The Fast Track - Step-by-step actions for quick results`,

  'cheat-sheet': `Generate blueprints for a CHEAT SHEET.
Structure: 2 Parts, 3 Modules per Part (~500 words each)
- Part 1: Core Reference - Key terms, formulas, and do's/don'ts
- Part 2: Quick Lookup - Common scenarios and at-a-glance summaries`,

  'small-ebook': `Generate blueprints for a SMALL EBOOK.
Structure: 3 Parts, 4 Modules per Part (~600 words each)
- Part 1: Introduction - Context, value proposition, and reader expectations
- Part 2: Core Content - Main concepts and insights
- Part 3: Application - Case studies, action steps, and resources`,

  'template': `Generate blueprints for a TEMPLATE collection.
Structure: 2 Parts, 4 Modules per Part (~500 words each)
- Part 1: Template Guide - How to use, customization tips, best practices
- Part 2: The Templates - Individual templates with instructions`,

  'frameworks': `Generate blueprints for a FRAMEWORKS guide.
Structure: 3 Parts, 3 Modules per Part (~600 words each)
- Part 1: Understanding Frameworks - What they are and when to use each
- Part 2: The Frameworks - Detailed framework explanations with examples
- Part 3: Implementation - Choosing and combining frameworks`,

  'resource-list': `Generate blueprints for a RESOURCE LIST.
Structure: 2 Parts, 4 Modules per Part (~500 words each)
- Part 1: Curated Resources - Tools, reading, online resources, communities
- Part 2: How to Use - Getting started guide and evaluation criteria`,

  'advanced-chapter': `Generate blueprints for an ADVANCED CHAPTER.
Structure: 3 Parts, 3 Modules per Part (~600 words each)
- Part 1: Going Deeper - Advanced concept overview and prerequisites
- Part 2: Advanced Content - Deep dives and expert strategies
- Part 3: Expert Application - Complex cases and mastery checklist`,

  'self-assessment-quiz': `Generate blueprints for a SELF ASSESSMENT QUIZ.
Structure: 3 Parts, 4 Modules per Part (~500 words each)
- Part 1: The Assessment - Instructions and quiz sections
- Part 2: Understanding Results - Score interpretation and profiles
- Part 3: Action Plan - Personalized recommendations`,

  'troubleshooting-guide': `Generate blueprints for a TROUBLESHOOTING GUIDE.
Structure: 3 Parts, 4 Modules per Part (~500 words each)
- Part 1: Diagnosis - Symptoms, root causes, problem categories
- Part 2: Solutions - Problem-specific solutions and when to seek help
- Part 3: Prevention - Best practices and maintenance`,
};

export async function generateOfferBlueprints(
  input: GenerateOfferBlueprintsInput
): Promise<AIResult<GenerateOfferBlueprintsOutput>> {
  return withAIErrorHandling(async () => {
    await preflightCheckWordCredits(input.userId, 1500);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('blueprint', input.userId, input.idToken);

    const category = input.offerCategory as Exclude<OfferCategory, 'all'>;
    const categoryPrompt = CATEGORY_BLUEPRINT_PROMPTS[category];
    const categoryLabel = OFFER_CATEGORY_LABELS[category];
    const categoryDescription = OFFER_CATEGORY_DESCRIPTIONS[category];
    const structure = OFFER_CATEGORY_STRUCTURE[category];

    if (!categoryPrompt || !structure) {
      throw new Error(`Invalid offer category: ${input.offerCategory}`);
    }

    try {
    const prompt = ai.definePrompt({
      name: 'generateOfferBlueprintsPrompt',
      input: { schema: GenerateOfferBlueprintsInputSchema },
      output: { schema: GenerateOfferBlueprintsOutputSchema },
      prompt: `You are an expert content strategist specializing in creating bonus materials and value-added content for book authors. Your task is to create THREE (3) distinct, well-structured blueprints for a ${categoryLabel}.

**OFFER CONTEXT:**
- Offer Title: {{{offerTitle}}}
- Offer Description: {{{offerDescription}}}
- Category: ${categoryLabel}
- Category Purpose: ${categoryDescription}
- Language: {{{language}}}

**SOURCE BOOK CONTEXT:**
- Book Title: {{{bookTitle}}}
- Book Blueprint/Outline:
{{{bookOutline}}}

{{#if researchProfile}}
**RESEARCH PROFILE (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**STYLE PROFILE (Writing Style Guidance):**
{{{styleProfile}}}
{{/if}}

{{#if authorProfile}}
**AUTHOR PROFILE:**
{{{authorProfile}}}
{{/if}}

{{#if storytellingFramework}}
**STORYTELLING FRAMEWORK:**
Structure the content using the {{{storytellingFramework}}} framework to create engaging, narrative-driven material.
{{/if}}

**CATEGORY-SPECIFIC STRUCTURE:**
${categoryPrompt}

**CRITICAL REQUIREMENTS:**

1. **LANGUAGE:** Write ALL content in {{{language}}}.

2. **STRUCTURE:** Each blueprint MUST have exactly ${structure.parts} Parts, with ${structure.modulesPerPart} Modules per Part.

3. **THREE DISTINCT BLUEPRINTS:** Create three blueprints with genuinely different angles:
   - Blueprint 1: A comprehensive, methodical approach
   - Blueprint 2: A practical, action-oriented approach
   - Blueprint 3: A creative, engaging approach

4. **CONTENT ALIGNMENT:** Each blueprint must directly relate to:
   - The offer title and description
   - The source book's topic and content
   - The target audience's needs and pain points

5. **MODULE TITLES:** Each module title should be clear, benefit-focused, and indicate what the reader will learn or do.

6. **WORD COUNT:** Each module is designed for ~${structure.wordsPerModule} words. Calculate estimatedWordCount as: ${structure.parts} parts × ${structure.modulesPerPart} modules × ${structure.wordsPerModule} words = ${structure.parts * structure.modulesPerPart * structure.wordsPerModule} words (approximately).

**OUTPUT FORMAT:**
For each of the 3 blueprints, provide:
- blueprint{N}_title: A unique, compelling title
- blueprint{N}_summary: A 2-3 sentence summary explaining the blueprint's angle  
- blueprint{N}_parts: A JSON string array of parts, formatted as: [{"title":"Part 1 Title","modules":["Module 1","Module 2","Module 3"]},{"title":"Part 2 Title","modules":["Module 1","Module 2","Module 3"]}]
- blueprint{N}_wordCount: Estimated total word count (approximately ${structure.parts * structure.modulesPerPart * structure.wordsPerModule})

Generate the three blueprints now. IMPORTANT: The parts field must be a valid JSON string.`,
    });

    const { output } = await prompt(
      { ...input },
      { model: input.model || routedModel }
    );

    if (!output) {
      throw new Error('Failed to generate offer blueprints. Please try again.');
    }

    const parsePartsJson = (partsStr: string): Array<{ title: string; modules: string[] }> => {
      if (!partsStr) return [];
      
      try {
        let cleanedStr = partsStr.trim();
        
        if (cleanedStr.startsWith('```json')) {
          cleanedStr = cleanedStr.slice(7);
        } else if (cleanedStr.startsWith('```')) {
          cleanedStr = cleanedStr.slice(3);
        }
        if (cleanedStr.endsWith('```')) {
          cleanedStr = cleanedStr.slice(0, -3);
        }
        cleanedStr = cleanedStr.trim();
        
        cleanedStr = cleanedStr.replace(/,\s*([\]}])/g, '$1');
        cleanedStr = cleanedStr.replace(/'/g, '"');
        
        const parsed = JSON.parse(cleanedStr);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            title: String(p.title || 'Untitled Part'),
            modules: Array.isArray(p.modules) ? p.modules.map(String) : []
          }));
        }
        return [];
      } catch (e) {
        console.error('Failed to parse parts JSON, attempting fallback:', partsStr, e);
        
        try {
          const titleMatches = partsStr.match(/"title"\s*:\s*"([^"]+)"/g);
          const modulesMatches = partsStr.match(/"modules"\s*:\s*\[([^\]]+)\]/g);
          
          if (titleMatches && titleMatches.length > 0) {
            const parts: Array<{ title: string; modules: string[] }> = [];
            for (let i = 0; i < titleMatches.length; i++) {
              const titleMatch = titleMatches[i].match(/"title"\s*:\s*"([^"]+)"/);
              const title = titleMatch ? titleMatch[1] : `Part ${i + 1}`;
              
              let modules: string[] = [];
              if (modulesMatches && modulesMatches[i]) {
                const moduleContent = modulesMatches[i].match(/\[([^\]]+)\]/);
                if (moduleContent) {
                  modules = moduleContent[1]
                    .split(',')
                    .map(m => m.trim().replace(/^["']|["']$/g, ''))
                    .filter(m => m.length > 0);
                }
              }
              
              if (modules.length > 0) {
                parts.push({ title, modules });
              }
            }
            if (parts.length > 0) return parts;
          }
        } catch (fallbackError) {
          console.error('Fallback parsing also failed:', fallbackError);
        }
        
        return [{ title: 'Part 1', modules: ['Module 1', 'Module 2', 'Module 3'] }];
      }
    };

    const blueprintsWithIds = [
      {
        id: 'blueprint-1',
        title: output.blueprint1_title,
        summary: output.blueprint1_summary,
        parts: parsePartsJson(output.blueprint1_parts),
        estimatedWordCount: output.blueprint1_wordCount,
      },
      {
        id: 'blueprint-2',
        title: output.blueprint2_title,
        summary: output.blueprint2_summary,
        parts: parsePartsJson(output.blueprint2_parts),
        estimatedWordCount: output.blueprint2_wordCount,
      },
      {
        id: 'blueprint-3',
        title: output.blueprint3_title,
        summary: output.blueprint3_summary,
        parts: parsePartsJson(output.blueprint3_parts),
        estimatedWordCount: output.blueprint3_wordCount,
      },
    ].filter(bp => bp.title && bp.parts.length > 0);

    if (blueprintsWithIds.length === 0) {
      throw new Error('Failed to generate valid offer blueprints. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      blueprintsWithIds.map(bp => 
        `${bp.title}\n${bp.summary}\n${bp.parts.map(p => 
          `${p.title}: ${p.modules.join(', ')}`
        ).join('\n')}`
      ).join('\n\n'),
      'generateOfferBlueprints',
      { offerTitle: input.offerTitle, category: input.offerCategory }
    );

    return { blueprints: blueprintsWithIds };
  } catch (error: any) {
    console.error('Error in generateOfferBlueprints:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error(
        'The AI service is currently overloaded. Please wait a moment and try again.'
      );
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new Error(
        'Your API key appears to be invalid or expired. Please check your API key in Settings.'
      );
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error(
        'You have exceeded your API quota. Please check your usage limits or try again later.'
      );
    }

    throw new Error(error.message || 'An unexpected error occurred while generating blueprints.');
    }
  }, 'offer blueprint generation');
}

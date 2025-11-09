
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content of a book chapter.
 *
 * This flow now uses an iterative, code-driven approach. It orchestrates multiple, smaller
 * AI calls—one for each sub-topic—to ensure a complete and well-structured chapter is
 * generated reliably every time.
 *
 * @exported generateChapterContent - A function that generates the chapter content.
 * @exported GenerateChapterContentInput - The input type for the function.
 * @exported GenerateChapterContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChapterContentInputSchema = z.object({
  bookTitle: z.string().describe('The main title of the book.'),
  bookTopic: z.string().describe('The core topic or idea of the book.'),
  bookLanguage: z.string().describe('The language the chapter should be written in.'),
  fullOutline: z.string().describe('The entire book outline to provide context for the current chapter.'),
  chapterTitle: z.string().describe('The title of the chapter to be written.'),
  subTopics: z.array(z.string()).describe('A list of key points or sub-topics to be covered in the chapter.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string().describe('The fully generated content of the book chapter, following the specific layout and formatting rules.'),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;

// Define a new, focused prompt for writing a single section
const writeSectionPrompt = ai.definePrompt(
  {
    name: 'writeChapterSectionPrompt',
    input: {
      schema: z.object({
        bookLanguage: z.string(),
        chapterTitle: z.string(),
        subTopic: z.string(),
        fullOutline: z.string(),
        researchProfile: z.string().optional(),
        styleProfile: z.string().optional(),
      }),
    },
    output: {
      schema: z.object({
        sectionContent: z.string(),
      }),
    },
    prompt: `You are an expert ghostwriter. Your current task is to write a comprehensive section for a single sub-topic within a book chapter.

**CONTEXT:**
- Language: {{{bookLanguage}}}
- Chapter: {{{chapterTitle}}}
- Full Book Outline: {{{fullOutline}}}

**YOUR TASK: Write content for this sub-topic:**
"{{{subTopic}}}"

**CRITICAL INSTRUCTIONS:**
1.  **Word Count:** Write AT LEAST 400-600 words for this section.
2.  **Human-Like Writing:**
    *   **Varied Paragraphs:** Use short paragraphs (3-5 sentences) but VARY their length to create a natural rhythm. Mix short, punchy paragraphs with slightly longer ones.
    *   **Clarity:** Ensure there's a double newline between every paragraph.
    *   **No Filler:** Write with impact and clarity.
3.  **Stay Focused:** All content must be directly related to the sub-topic "{{{subTopic}}}".
{{#if styleProfile}}
4.  **Adhere to Style:** You MUST adopt the following writing style:
    ---
    {{{styleProfile}}}
    ---
{{/if}}
{{#if researchProfile}}
5.  **Use Research:** Tailor the content to the audience's pain points and interests based on this research:
    ---
    {{{researchProfile}}}
    ---
{{/if}}

Return ONLY the written content for this section. Do not add titles or headings.`,
  }
);


const writeIntroPrompt = ai.definePrompt({
    name: 'writeChapterIntroPrompt',
    input: {
        schema: z.object({
            bookLanguage: z.string(),
            chapterTitle: z.string(),
            fullOutline: z.string(),
        })
    },
    output: {
        schema: z.object({
            intro: z.string(),
        })
    },
    prompt: `You are a ghostwriter. Write a short, engaging introduction (2-3 sentences) in {{{bookLanguage}}} for a book chapter titled "{{{chapterTitle}}}".

Book Outline for Context:
{{{fullOutline}}}

Return a JSON object with a single key: "intro".`
});


const writeActionStepPrompt = ai.definePrompt({
    name: 'writeChapterActionStepPrompt',
    input: {
        schema: z.object({
            bookLanguage: z.string(),
            chapterContent: z.string(),
        })
    },
    output: {
        schema: z.object({
            actionStep: z.string(),
        })
    },
    prompt: `You are a writing coach. Based on the following chapter content, write a single, practical, and engaging action step (2-3 sentences) for the reader in {{{bookLanguage}}}. The action step should encourage them to apply what they've learned.

Chapter Content:
{{{chapterContent}}}

Return a JSON object with a single key: "actionStep".`
});


const writeTeaserPrompt = ai.definePrompt({
    name: 'writeChapterTeaserPrompt',
    input: {
        schema: z.object({
            bookLanguage: z.string(),
            fullOutline: z.string(),
            currentChapterTitle: z.string(),
        })
    },
    output: {
        schema: z.object({
            teaser: z.string(),
        })
    },
    prompt: `You are a copywriter. Based on the provided book outline, write a compelling 1-2 sentence teaser for the chapter that comes *after* "{{{currentChapterTitle}}}". The language should be {{{bookLanguage}}}.

Book Outline:
{{{fullOutline}}}

Return a JSON object with a single key: "teaser".`
});


export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  return generateChapterContentFlow(input);
}


const generateChapterContentFlow = ai.defineFlow(
  {
    name: 'generateChapterContentFlow',
    inputSchema: GenerateChapterContentInputSchema,
    outputSchema: GenerateChapterContentOutputSchema,
  },
  async (input) => {
    // 1. Generate the Intro first
    const { output: introData } = await writeIntroPrompt({
        bookLanguage: input.bookLanguage,
        chapterTitle: input.chapterTitle,
        fullOutline: input.fullOutline,
    });
    if (!introData) {
        throw new Error("Failed to generate chapter intro.");
    }
    const { intro } = introData;

    // 2. Iterate over sub-topics and generate content for each
    const sectionContents = await Promise.all(
      input.subTopics.map(async (subTopic) => {
        const { output } = await writeSectionPrompt({
          bookLanguage: input.bookLanguage,
          chapterTitle: input.chapterTitle,
          subTopic: subTopic,
          fullOutline: input.fullOutline,
          researchProfile: input.researchProfile,
          styleProfile: input.styleProfile,
        });

        if (!output || !output.sectionContent) {
          console.warn(`Warning: No content generated for sub-topic: "${subTopic}"`);
          return `$$${subTopic}$$\n\n[Content generation for this section failed. Please try again.]`;
        }
        
        return `$$${subTopic}$$\n\n${output.sectionContent}`;
      })
    );
    
    // Combine the intro and main content to create the body
    const chapterBody = [intro, ...sectionContents].join('\n\n');

    // 3. Generate the Action Step based on the written content
    const { output: actionStepData } = await writeActionStepPrompt({
        bookLanguage: input.bookLanguage,
        chapterContent: chapterBody,
    });
     if (!actionStepData) {
        throw new Error("Failed to generate action step.");
    }
    const { actionStep } = actionStepData;

    // 4. Generate the Teaser for the next chapter
    const { output: teaserData } = await writeTeaserPrompt({
        bookLanguage: input.bookLanguage,
        fullOutline: input.fullOutline,
        currentChapterTitle: input.chapterTitle,
    });
    if (!teaserData) {
        throw new Error("Failed to generate teaser.");
    }
    const { teaser } = teaserData;

    // 5. Assemble the full chapter content
    const assembledContent = [
      `$$${input.chapterTitle}$$`,
      chapterBody,
      `Your Action Step:\n${actionStep}`,
      `Coming Up Next:\n${teaser}`,
    ].join('\n\n');

    return {
      chapterContent: assembledContent,
    };
  }
);

    
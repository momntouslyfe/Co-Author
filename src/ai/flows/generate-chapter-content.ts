
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content of a book chapter.
 *
 * This flow now uses a robust, iterative approach. Instead of a single large prompt,
 * it breaks the task down:
 * 1.  It generates the introduction.
 * 2.  It loops through each sub-topic, calling a section builder which itself loops to generate paragraphs, ensuring robust content generation.
 * 3.  It generates the final action step and teaser sections.
 * 4.  It assembles all the pieces into a single, complete chapter.
 * This method is highly reliable and prevents incomplete outputs.
 *
 * @exported generateChapterContent - A function that generates the chapter content.
 * @exported GenerateChapterContentInput - The input type for the function.
 * @exported GenerateChapterContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema remains the same, providing all necessary context.
const GenerateChapterContentInputSchema = z.object({
  bookTitle: z.string().describe('The main title of the book.'),
  bookTopic: z.string().describe('The core topic or idea of the book.'),
  bookLanguage: z.string().describe('The language the chapter should be written in.'),
  fullOutline: z.string().describe('The entire book outline to provide context for the current chapter.'),
  chapterTitle: z.string().describe('The title of the chapter to be written.'),
  subTopics: z.array(z.string()).describe('A list of key points or sub-topics to be covered in the chapter.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string().describe('The fully generated content of the book chapter, following the specific layout and formatting rules.'),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;


const generateParagraphsPrompt = ai.definePrompt({
    name: 'generateParagraphsPrompt',
    input: { schema: z.object({
        bookTitle: z.string(),
        fullOutline: z.string(),
        chapterTitle: z.string(),
        bookLanguage: z.string(),
        styleProfile: z.string().optional(),
        researchProfile: z.string().optional(),
        storytellingFramework: z.string().optional(),
        subTopic: z.string(),
        existingContent: z.string().optional(),
    }) },
    output: { schema: z.object({ paragraphs: z.string() }) },
    prompt: `You are an expert ghostwriter. Your task is to write one or two new, insightful paragraphs in {{{bookLanguage}}} for a specific sub-topic within a book chapter.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Current Sub-Topic: {{{subTopic}}}
- Full Book Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if styleProfile}}
- **Writing Style Profile (CRITICAL):** You MUST strictly adhere to this writing style.
  ---
  {{{styleProfile}}}
  ---
{{/if}}
{{#if researchProfile}}
- **Audience Research Profile (CRITICAL):**
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**YOUR TASK:**
Based on the sub-topic "{{{subTopic}}}", write one or two new paragraphs that logically continue from the "Existing Content for this Section". If the existing content is empty, start the section.

**CRITICAL INSTRUCTIONS:**
1.  **FOCUSED CONTENT:** All content must be directly related to the sub-topic provided.
2.  **HUMAN-LIKE PARAGRAPHING:** Use short, readable paragraphs (3-5 sentences), but VARY their length for good rhythm. Ensure a double newline (a blank line) exists between paragraphs.
3.  **RETURN ONLY THE NEW PARAGRAPHS:** Your output must ONLY be the text for the new paragraph(s). Do not repeat the existing content. Do not add titles or headings.

**Existing Content for this Section:**
{{{existingContent}}}

Proceed to write the new paragraph(s) now.
`,
});


// A simpler prompt for generating introductions, action steps, and teasers.
const generateSimpleSectionPrompt = ai.definePrompt({
    name: 'generateSimpleSectionPrompt',
    input: { schema: z.object({
        bookTitle: z.string(),
        fullOutline: z.string(),
        chapterTitle: z.string(),
        bookLanguage: z.string(),
        styleProfile: z.string().optional(),
        isIntroduction: z.boolean().optional(),
        isActionStep: z.boolean().optional(),
        isTeaser: z.boolean().optional(),
    }) },
    output: { schema: z.object({ sectionContent: z.string() }) },
    prompt: `You are an expert ghostwriter. Your task is to write a specific, short part of a book chapter in {{{bookLanguage}}}.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Book Outline: {{{fullOutline}}}
{{#if styleProfile}}
- **Writing Style Profile:** Adhere to this style.
  ---
  {{{styleProfile}}}
  ---
{{/if}}

**YOUR TASK:**
{{#if isIntroduction}}
Write a short, engaging introduction (2-3 sentences) for the chapter "{{{chapterTitle}}}".
{{/if}}
{{#if isActionStep}}
Write a single, practical action step (2-3 sentences) for the reader based on the content of the chapter "{{{chapterTitle}}}".
{{/if}}
{{#if isTeaser}}
Based on the "Full Book Outline", identify the chapter immediately following "{{{chapterTitle}}}" and write a compelling 1-2 sentence teaser that creates anticipation for that specific next chapter's content.
{{/if}}

**CRITICAL INSTRUCTIONS:**
- Keep it concise as instructed.
- Return ONLY the text content. Do not add titles or formatting like \`$$...$$\`.
`,
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
    const { 
        bookTitle, bookTopic, bookLanguage, fullOutline, chapterTitle, 
        subTopics, storytellingFramework, researchProfile, styleProfile 
    } = input;

    let fullChapterContent = '';

    // 1. Generate Chapter Title and Introduction
    fullChapterContent += `$$${chapterTitle}$$\n\n`;
    const introResult = await generateSimpleSectionPrompt({
        bookTitle, fullOutline, chapterTitle, bookLanguage, styleProfile,
        isIntroduction: true
    });
    if (introResult.output) {
        fullChapterContent += `${introResult.output.sectionContent}\n\n`;
    }

    // A helper function to build up a section iteratively.
    const generateSectionContent = async (subTopic: string): Promise<string> => {
        let sectionContent = '';
        // Loop 2-3 times to build up a substantial section from smaller paragraph chunks.
        for (let i = 0; i < 3; i++) {
            const result = await generateParagraphsPrompt({
                bookTitle, fullOutline, chapterTitle, bookLanguage, styleProfile,
                researchProfile, storytellingFramework, subTopic,
                existingContent: sectionContent,
            });
            if (result.output?.paragraphs) {
                sectionContent += `${result.output.paragraphs.trim()}\n\n`;
            }
        }
        return sectionContent.trim();
    };

    // 2. Loop through each sub-topic and generate its section content
    for (const subTopic of subTopics) {
        fullChapterContent += `$$${subTopic}$$\n\n`;
        
        const sectionResult = await generateSectionContent(subTopic);
        fullChapterContent += `${sectionResult}\n\n`;
    }

    // 3. Generate the Action Step
    fullChapterContent += `$$Your Action Step$$\n\n`;
    const actionStepResult = await generateSimpleSectionPrompt({
        bookTitle, fullOutline, chapterTitle, bookLanguage, styleProfile,
        isActionStep: true
    });
    if (actionStepResult.output) {
        fullChapterContent += `${actionStepResult.output.sectionContent}\n\n`;
    }

    // 4. Generate the "Coming Up Next" Teaser
    fullChapterContent += `$$Coming Up Next$$\n\n`;
    const teaserResult = await generateSimpleSectionPrompt({
        bookTitle, fullOutline, chapterTitle, bookLanguage, styleProfile,
        isTeaser: true
    });
    if (teaserResult.output) {
        fullChapterContent += `${teaserResult.output.sectionContent}\n\n`;
    }
    
    // 5. Return the fully assembled chapter
    return {
      chapterContent: fullChapterContent.trim(),
    };
  }
);
    

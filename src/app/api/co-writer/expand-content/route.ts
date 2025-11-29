import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const ExpandMarketingContentInputSchema = z.object({
  content: z.string().describe('The content to expand.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count after expansion.'),
  bookTitle: z.string().optional().describe('The title of the book for context.'),
  bookOutline: z.string().optional().describe('The book blueprint for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  customInstructions: z.string().optional().describe('Custom instructions for the expansion.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

const ExpandMarketingContentOutputSchema = z.object({
  content: z.string().describe('The expanded marketing content.'),
  wordCount: z.number().describe('The word count of the expanded content.'),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const admin = getFirebaseAdmin();
    const auth = getAuth(admin);
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const {
      content,
      language = 'English',
      targetWordCount,
      bookTitle,
      bookOutline,
      styleProfile,
      customInstructions,
      model,
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const currentWords = content.split(/\s+/).length;
    const additionalWords = Math.max((targetWordCount || currentWords + 200) - currentWords, 200);
    await preflightCheckWordCredits(userId, additionalWords);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('expand', userId, idToken);

    const prompt = ai.definePrompt({
      name: 'expandMarketingContent',
      input: { schema: ExpandMarketingContentInputSchema },
      output: { schema: ExpandMarketingContentOutputSchema },
      prompt: `You are an expert content writer and marketing specialist. Your task is to expand marketing content with additional valuable information while maintaining quality and coherence.

{{#if bookTitle}}
**Book Context:** {{{bookTitle}}}
{{/if}}

**Language:** {{{language}}}

{{#if bookOutline}}
**Book Blueprint (for additional context):**
{{{bookOutline}}}
{{/if}}

{{#if styleProfile}}
**Style Profile (Writing Style to Match):**
{{{styleProfile}}}
{{/if}}

{{#if customInstructions}}
**CUSTOM INSTRUCTIONS (IMPORTANT - Follow these closely):**
{{{customInstructions}}}
{{/if}}

---

**CONTENT TO EXPAND:**
{{{content}}}

---

**TARGET WORD COUNT:** {{{targetWordCount}}} words

**YOUR TASK:**
Expand the above content to approximately {{{targetWordCount}}} words by adding valuable, relevant information.

**REQUIREMENTS:**
1. Reach approximately {{{targetWordCount}}} words (within 10% margin).
2. Maintain the existing content's structure and flow.
3. Add new valuable points, examples, or explanations.
4. Keep the marketing purpose and persuasive elements.
5. Write in {{{language}}}.
6. If a style profile is provided, match that writing style.
7. If custom instructions are provided, follow them closely.

**EXPANSION STRATEGIES:**
- Add more detailed examples or case studies
- Include additional benefits or value propositions
- Elaborate on key points with supporting details
- Add relevant statistics or data points (if appropriate)
- Include more storytelling elements
- Expand on the "why" behind key statements
- Add transitional content for better flow

**IMPORTANT:**
- Do NOT pad with filler or repeat existing content
- Every addition should provide genuine value
- Maintain the same quality level throughout
- Keep the marketing effectiveness intact or improve it

**CRITICAL STRUCTURE REQUIREMENTS:**
You MUST format the output with proper structure:
1. Use multiple paragraphs - NEVER return a single long paragraph or wall of text.
2. Each paragraph should be 2-5 sentences maximum (varied lengths create rhythm).
3. Separate all paragraphs with blank lines (double newlines).
4. Use markdown headings (## or ###) to organize major sections.
5. Use bullet points or numbered lists where appropriate for clarity and scannability.
6. Vary paragraph lengths intentionally - mix short impactful paragraphs (1-2 sentences) with medium ones (3-4 sentences).
7. Break up long explanations into digestible chunks.
8. Use subheadings (###) to introduce new topics or shifts in focus.

**OUTPUT FORMAT:**
Return the final content using markdown formatting:
- Blank lines between every paragraph
- Headings for sections (## for main sections, ### for subsections)
- Lists where they improve readability
- Short, punchy paragraphs for impact
- Never collapse into a single dense block of text

Provide the complete expanded content.`,
    });

    const inputData = {
      content,
      language,
      targetWordCount: targetWordCount || currentWords + 200,
      bookTitle,
      bookOutline,
      styleProfile,
      customInstructions,
      model,
    };

    const { output } = await prompt(inputData, { model: model || routedModel });

    if (!output || !output.content) {
      throw new Error('Failed to expand content. Please try again.');
    }

    await trackAIUsage(
      userId,
      output.content,
      'expandMarketingContent',
      { bookTitle: bookTitle || 'Unknown' }
    );

    return NextResponse.json(output);
  } catch (error: any) {
    console.error('Error expanding marketing content:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      return NextResponse.json(
        { error: 'The AI service is currently overloaded. Please wait a moment and try again.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Your API key appears to be invalid or expired. Please check your API key in Settings.' },
        { status: 401 }
      );
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'You have exceeded your API quota. Please check your usage limits or try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('Insufficient') || error.message?.includes('credits')) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while expanding content. Please try again.' },
      { status: 500 }
    );
  }
}

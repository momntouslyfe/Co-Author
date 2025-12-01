import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const ExtendMarketingContentInputSchema = z.object({
  paragraph: z.string().describe('The paragraph to use as context for extension.'),
  language: z.string().describe('The language for the content.'),
  bookTitle: z.string().optional().describe('The title of the book for context.'),
  bookOutline: z.string().optional().describe('The book blueprint for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  instruction: z.string().optional().describe('Custom instructions for the extension.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

const ExtendMarketingContentOutputSchema = z.object({
  extendedContent: z.string().describe('New paragraphs to add after the original paragraph.'),
  wordCount: z.number().describe('The word count of the extended content.'),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const admin = getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const {
      paragraph,
      language = 'English',
      bookTitle,
      bookOutline,
      styleProfile,
      instruction,
      model,
    } = body;

    if (!paragraph) {
      return NextResponse.json(
        { error: 'Missing required field: paragraph' },
        { status: 400 }
      );
    }

    await preflightCheckWordCredits(userId, 300);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('expand', userId, idToken);

    const prompt = ai.definePrompt({
      name: 'extendMarketingContent',
      input: { schema: ExtendMarketingContentInputSchema },
      output: { schema: ExtendMarketingContentOutputSchema },
      prompt: `You are an expert content writer and marketing specialist. Your task is to generate NEW paragraphs that naturally follow the given paragraph.

{{#if bookTitle}}
**Book Context:** {{{bookTitle}}}
{{/if}}

**Language:** {{{language}}}

{{#if bookOutline}}
**Book Blueprint (for additional context):**
{{{bookOutline}}}
{{/if}}

{{#if styleProfile}}
**Style Profile (Writing Style to Match - CRITICAL):**
{{{styleProfile}}}

**CODE-MIXING INTEGRITY (MANDATORY):**
If the style profile demonstrates code-mixing (mixing words/phrases from multiple languages):
1. Use mixed-language words NATURALLY without any explanation
2. NEVER add parenthetical translations like "প্রমোশন (promotion)" - just write "প্রমোশন"
3. NEVER add brackets, glosses, or English explanations after non-English words
4. Blend languages seamlessly as a native speaker would
5. Match the exact frequency and pattern of language mixing from the profile

WRONG: "আপনার বিজনেস (business) এর জন্য মার্কেটিং (marketing) স্ট্রাটেজি (strategy)"
CORRECT: "আপনার বিজনেস এর জন্য মার্কেটিং স্ট্রাটেজি"
{{/if}}

---

**STARTING PARAGRAPH (Use as context):**
{{{paragraph}}}

---

{{#if instruction}}
**USER'S INSTRUCTION:**
{{{instruction}}}
{{else}}
**DEFAULT TASK:** Generate new content that naturally follows and expands upon the ideas in the starting paragraph.
{{/if}}

**YOUR TASK:**
Generate one to three NEW paragraphs that naturally continue from the starting paragraph.

**CRITICAL REQUIREMENTS:**
1. Generate NEW content that FOLLOWS the starting paragraph - do NOT repeat or rephrase the original.
2. The new paragraphs should flow naturally as a continuation.
3. Use short, readable paragraphs (3-5 sentences) with varied length for good rhythm.
4. Ensure a double newline (blank line) exists between every paragraph.
5. Write in {{{language}}}.
6. If a style profile is provided, match that writing style EXACTLY - including any code-mixing patterns (mixing of languages), vocabulary choices, sentence structures, and tone.
7. If an instruction is provided, follow it to guide what you write next.
8. CRITICAL: If the style profile shows code-mixing (e.g., English with Bengali/Hindi words), you MUST incorporate the same language mixing pattern throughout your extended content.

**CONTENT STRATEGIES:**
- Add supporting examples or case studies
- Provide additional insights or explanations
- Include relevant stories or anecdotes
- Expand on the "why" or "how" of key points
- Add actionable advice or tips

**IMPORTANT:**
- Return ONLY the NEW paragraphs - do NOT include the original starting paragraph
- Every addition should provide genuine value
- Keep the same quality and marketing effectiveness

**OUTPUT FORMAT:**
Return 1-3 well-structured paragraphs:
- Each paragraph should be 2-5 sentences (vary lengths for rhythm)
- Separate paragraphs with blank lines (double newlines)
- Mix short impactful paragraphs with slightly longer ones
- Use markdown headings (### Subheading) if introducing a new topic
- Use bullet points where appropriate for clarity
- Never return a single wall of text

Provide only the new paragraphs.`,
    });

    const inputData = {
      paragraph,
      language,
      bookTitle,
      bookOutline,
      styleProfile,
      instruction,
      model,
    };

    const { output } = await prompt(inputData, { model: model || routedModel });

    if (!output || !output.extendedContent) {
      throw new Error('Failed to extend content. Please try again.');
    }

    await trackAIUsage(
      userId,
      output.extendedContent,
      'extendMarketingContent',
      { bookTitle: bookTitle || 'Unknown' }
    );

    return NextResponse.json(output);
  } catch (error: any) {
    console.error('Error extending marketing content:', error);

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
      { error: error.message || 'An unexpected error occurred while extending content. Please try again.' },
      { status: 500 }
    );
  }
}

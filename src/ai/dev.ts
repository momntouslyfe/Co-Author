import { config } from 'dotenv';
config({ path: '.env' });

import '@/ai/flows/generate-book-blueprint.ts';
import '@/ai/flows/research-book-topic.ts';
import '@/ai/flows/expand-book-content.ts';
import '@/ai/flows/set-admin.ts';
import '@/ai/flows/analyze-writing-style.ts';
import '@/ai/flows/generate-book-titles.ts';
import '@/ai/flows/generate-chapter-content.ts';
import '@/ai/flows/rewrite-chapter.ts';
import '@/ai/flows/rewrite-section.ts';
import '@/ai/flows/write-chapter-section.ts';

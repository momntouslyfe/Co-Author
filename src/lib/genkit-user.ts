'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getUserApiKey } from './user-api-keys';

export async function getUserGenkitInstance(userId: string) {
  const userKeyData = await getUserApiKey(userId);
  
  if (!userKeyData) {
    throw new Error('API key not configured. Please add your Google AI API key in Settings.');
  }

  const googleAIPlugin = googleAI({
    apiKey: userKeyData.apiKey,
  });

  const userAi = genkit({
    plugins: [googleAIPlugin],
    model: userKeyData.model,
  });

  return { ai: userAi, model: userKeyData.model };
}

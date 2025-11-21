import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getAdminSettings, getAdminAPIKey, getAIRouting } from './admin-settings';
import { getUserGenkitInstance } from './genkit-user';
import type { AIFunction, AIProvider } from './definitions';

interface GenkitInstanceResult {
  ai: any;
  model: string;
}

if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY ERROR: genkit-admin.ts is being imported on the client-side. ' +
    'This module contains server-only code and must never be bundled for the browser. ' +
    'Only use this module in server-side code (API routes, Server Components, Server Actions).'
  );
}

async function createGenkitInstance(provider: AIProvider, apiKey: string, model?: string): Promise<GenkitInstanceResult> {
  let plugin;
  let defaultModel = model;

  switch (provider) {
    case 'gemini':
      const { googleAI } = await import('@genkit-ai/google-genai');
      plugin = googleAI({ apiKey });
      defaultModel = model || 'googleai/gemini-2.5-flash';
      break;
    
    case 'openai':
      throw new Error('OpenAI integration not yet implemented. Please configure OpenAI plugin.');
    
    case 'claude':
      throw new Error('Claude integration not yet implemented. Please configure Anthropic plugin.');
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const ai = genkit({
    plugins: [plugin],
    model: defaultModel,
  });

  return { ai, model: defaultModel || '' };
}

export async function getGenkitInstanceForFunction(
  aiFunction: AIFunction,
  userId: string,
  idToken: string
): Promise<GenkitInstanceResult> {
  const settings = await getAdminSettings();

  if (!settings) {
    return getUserGenkitInstance(userId, idToken);
  }

  if (settings.useAdminKeys) {
    const routing = await getAIRouting(aiFunction);
    
    if (!routing) {
      const adminKey = await getAdminAPIKey('gemini');
      
      if (!adminKey) {
        if (settings.allowUserKeys) {
          return getUserGenkitInstance(userId, idToken);
        }
        throw new Error('No API key configured. Please contact the administrator to configure API keys.');
      }
      
      return createGenkitInstance('gemini', adminKey);
    }

    const adminKey = await getAdminAPIKey(routing.provider);
    
    if (!adminKey) {
      if (settings.allowUserKeys) {
        return getUserGenkitInstance(userId, idToken);
      }
      throw new Error(
        `No ${routing.provider} API key configured. Please contact the administrator to configure the API key for ${routing.provider}.`
      );
    }

    return createGenkitInstance(routing.provider, adminKey, routing.model);
  }

  if (settings.allowUserKeys) {
    return getUserGenkitInstance(userId, idToken);
  }

  throw new Error('API keys are not configured. Please contact the administrator.');
}

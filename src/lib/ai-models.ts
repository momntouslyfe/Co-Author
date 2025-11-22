/**
 * Comprehensive list of AI models for different providers
 * Last updated: November 2025
 * Source: https://platform.openai.com/docs/pricing
 */

export type ModelOption = {
  value: string;
  label: string;
  category?: string;
};

/**
 * Google Gemini Models
 * Source: https://ai.google.dev/gemini-api/docs/models
 * Last updated: November 2025
 */
export const GEMINI_MODELS: ModelOption[] = [
  // Gemini 3 Series (Latest - Preview)
  { value: 'googleai/gemini-3-pro', label: 'Gemini 3 Pro (Preview)', category: 'Gemini 3' },
  
  // Gemini 2.5 Series (Latest - Stable)
  { value: 'googleai/gemini-2.5-pro', label: 'Gemini 2.5 Pro', category: 'Gemini 2.5' },
  { value: 'googleai/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)', category: 'Gemini 2.5' },
  { value: 'googleai/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', category: 'Gemini 2.5' },
  
  // Gemini 2.0 Series
  { value: 'googleai/gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: 'Gemini 2.0' },
  { value: 'googleai/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', category: 'Gemini 2.0' },
  
  // Gemini 1.5 Series
  { value: 'googleai/gemini-1.5-pro', label: 'Gemini 1.5 Pro', category: 'Gemini 1.5' },
  { value: 'googleai/gemini-1.5-flash', label: 'Gemini 1.5 Flash', category: 'Gemini 1.5' },
  
  // Custom entry option
  { value: 'custom', label: '(Enter custom model manually)', category: 'Custom' },
];

/**
 * OpenAI Models - General-purpose text generation models for book writing
 * Source: https://platform.openai.com/docs/pricing
 * Last updated: November 2025
 * 
 * Note: Reasoning models (o-series) are slower and more expensive but excel at
 * complex planning and analysis. Use custom entry for any unlisted models.
 */
export const OPENAI_MODELS: ModelOption[] = [
  // GPT-5 Series (Latest - Verified from platform.openai.com/docs)
  { value: 'openai/gpt-5.1', label: 'GPT-5.1 (Recommended)', category: 'GPT-5' },
  { value: 'openai/gpt-5', label: 'GPT-5', category: 'GPT-5' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', category: 'GPT-5' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', category: 'GPT-5' },
  
  // GPT-4o Series
  { value: 'openai/gpt-4o', label: 'GPT-4o', category: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', category: 'GPT-4o' },
  { value: 'openai/chatgpt-4o-latest', label: 'ChatGPT-4o Latest', category: 'GPT-4o' },
  
  // O-Series Reasoning Models
  { value: 'openai/o1', label: 'O1', category: 'Reasoning' },
  { value: 'openai/o1-mini', label: 'O1 Mini', category: 'Reasoning' },
  { value: 'openai/o1-preview', label: 'O1 Preview', category: 'Reasoning' },
  
  // Custom entry option
  { value: 'custom', label: '(Enter custom model manually)', category: 'Custom' },
];

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: 'gemini' | 'openai' | 'claude'): ModelOption[] {
  switch (provider) {
    case 'gemini':
      return GEMINI_MODELS;
    case 'openai':
      return OPENAI_MODELS;
    case 'claude':
      return [];
    default:
      return [];
  }
}

/**
 * Get recommended models for each provider
 */
export const RECOMMENDED_MODELS = {
  gemini: 'googleai/gemini-2.5-flash',
  openai: 'openai/gpt-5.1',
  claude: '',
};

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'gemini' | 'openai' | 'claude'): string {
  return RECOMMENDED_MODELS[provider] || '';
}

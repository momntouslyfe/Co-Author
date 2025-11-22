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
 */
export const GEMINI_MODELS: ModelOption[] = [
  { value: 'googleai/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)', category: 'Latest' },
  { value: 'googleai/gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: 'Latest' },
  { value: 'googleai/gemini-1.5-pro', label: 'Gemini 1.5 Pro', category: 'Pro' },
  { value: 'googleai/gemini-1.5-flash', label: 'Gemini 1.5 Flash', category: 'Fast' },
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
  // GPT-5 Series (Frontier)
  { value: 'openai/gpt-5.1', label: 'GPT-5.1 (Frontier)', category: 'GPT-5' },
  { value: 'openai/gpt-5', label: 'GPT-5', category: 'GPT-5' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', category: 'GPT-5' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', category: 'GPT-5' },
  
  // GPT-4.1 Series
  { value: 'openai/gpt-4.1', label: 'GPT-4.1', category: 'GPT-4.1' },
  { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini', category: 'GPT-4.1' },
  { value: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano', category: 'GPT-4.1' },
  
  // GPT-4o Series
  { value: 'openai/gpt-4o', label: 'GPT-4o', category: 'GPT-4o' },
  { value: 'openai/gpt-4o-2024-05-13', label: 'GPT-4o (May 2024)', category: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', category: 'GPT-4o' },
  
  // O-Series Reasoning Models (slower, more expensive, better at complex tasks)
  { value: 'openai/o4-mini', label: 'O4 Mini', category: 'Reasoning' },
  { value: 'openai/o4-mini-deep-research', label: 'O4 Mini Deep Research', category: 'Reasoning' },
  { value: 'openai/o3-pro', label: 'O3 Pro', category: 'Reasoning' },
  { value: 'openai/o3', label: 'O3', category: 'Reasoning' },
  { value: 'openai/o3-deep-research', label: 'O3 Deep Research', category: 'Reasoning' },
  { value: 'openai/o3-mini', label: 'O3 Mini', category: 'Reasoning' },
  { value: 'openai/o1', label: 'O1', category: 'Reasoning' },
  { value: 'openai/o1-mini', label: 'O1 Mini', category: 'Reasoning' },
  { value: 'openai/o1-pro', label: 'O1 Pro', category: 'Reasoning' },
  
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
  openai: 'openai/gpt-4o',
  claude: '',
};

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: 'gemini' | 'openai' | 'claude'): string {
  return RECOMMENDED_MODELS[provider] || '';
}

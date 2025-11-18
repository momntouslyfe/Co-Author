/**
 * DEPRECATED: This file is no longer used.
 * 
 * All AI functionality now requires users to provide their own API keys.
 * Use getUserGenkitInstance() from @/lib/genkit-user instead.
 * 
 * DO NOT import from this file or use the global genkit instance.
 * Any imports from this file will fail.
 */

throw new Error(
  'DEPRECATED: The global genkit instance is disabled. ' +
  'All AI operations must use user-provided API keys via getUserGenkitInstance(userId).'
);

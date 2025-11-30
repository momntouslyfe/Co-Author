/**
 * @fileOverview Utility functions to sanitize style profiles for AI consumption.
 * 
 * This module provides functions to clean up style profile text before sending
 * to AI models, particularly to remove parenthetical translations that the AI
 * tends to copy incorrectly.
 */

/**
 * Removes parenthetical English translations from Bengali/mixed-language text.
 * 
 * Examples of what gets removed:
 * - "ম্যানিপুলেশনের (manipulation)" → "ম্যানিপুলেশনের"
 * - "প্রফেশনাল স্পেস (professional space)" → "প্রফেশনাল স্পেস"
 * - "ডিজিটাল লাইফ (Digital Life)" → "ডিজিটাল লাইফ"
 * 
 * @param text - The style profile text that may contain parenthetical translations
 * @returns Cleaned text without parenthetical translations
 */
export function removeParentheticalTranslations(text: string): string {
  if (!text) return text;
  
  // Pattern matches: space + opening paren + English word(s) + closing paren
  // This targets translations like "(manipulation)", "(professional space)", "(Digital Life)"
  // The pattern looks for parentheses containing primarily ASCII/Latin characters
  const translationPattern = /\s*\(([A-Za-z][A-Za-z\s\-']*[A-Za-z]|[A-Za-z])\)/g;
  
  return text.replace(translationPattern, '');
}

/**
 * Sanitizes a style profile for safe AI consumption.
 * This removes patterns that the AI tends to incorrectly replicate,
 * such as parenthetical translations in code-mixed text.
 * 
 * @param styleProfile - The raw style profile text
 * @returns Sanitized style profile ready for AI prompts
 */
export function sanitizeStyleProfileForAI(styleProfile: string | undefined): string | undefined {
  if (!styleProfile) return styleProfile;
  
  // Remove parenthetical translations
  let sanitized = removeParentheticalTranslations(styleProfile);
  
  return sanitized;
}


import {genkit, configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env' });

// Initialize the Google AI plugin with the API key from the environment variable.
const googleAIPlugin = googleAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const ai = genkit({
  plugins: [googleAIPlugin],
  model: 'googleai/gemini-2.5-flash',
});

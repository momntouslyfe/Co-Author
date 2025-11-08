'use server';

/**
 * @fileOverview A Genkit flow for assigning admin privileges to a user.
 * This flow is for development purposes only and should be secured or removed in production.
 *
 * @exported setAdmin - A function that sets a user as an admin.
 * @exported SetAdminInput - The input type for the setAdmin function.
 * @exported SetAdminOutput - The return type for the setAdmin function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

const SetAdminInputSchema = z.object({
  email: z.string().email().describe('The email address of the user to make an admin.'),
});
export type SetAdminInput = z.infer<typeof SetAdminInputSchema>;

const SetAdminOutputSchema = z.object({
  message: z.string().describe('The result of the operation.'),
});
export type SetAdminOutput = z.infer<typeof SetAdminOutputSchema>;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  
  // This relies on GOOGLE_APPLICATION_CREDENTIALS env var being set
  // in the development environment, which Genkit/Firebase CLI handles.
  return admin.initializeApp();
}

export async function setAdmin(input: SetAdminInput): Promise<SetAdminOutput> {
  // IMPORTANT: This is a security-sensitive operation.
  // In a production environment, you would add authentication checks here
  // to ensure that only authorized users can call this flow.
  if (process.env.NODE_ENV !== 'development') {
    return { message: 'This operation is only allowed in development.' };
  }
  
  return setAdminFlow(input);
}

const setAdminFlow = ai.defineFlow(
  {
    name: 'setAdminFlow',
    inputSchema: SetAdminInputSchema,
    outputSchema: SetAdminOutputSchema,
  },
  async ({ email }) => {
    try {
      initializeFirebaseAdmin();
      const auth = admin.auth();
      const user = await auth.getUserByEmail(email);

      if (user.customClaims?.['isAdmin']) {
        return { message: `${email} is already an admin.` };
      }

      await auth.setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
      
      return { message: `Successfully made ${email} an admin.` };
    } catch (error: any) {
      console.error('Error setting admin claim:', error);
      if (error.code === 'auth/user-not-found') {
        return { message: `User with email ${email} not found.` };
      }
      return { message: `An error occurred: ${error.message}` };
    }
  }
);

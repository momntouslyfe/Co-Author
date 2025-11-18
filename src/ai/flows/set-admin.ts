'use server';

/**
 * @fileOverview A Genkit flow for assigning admin privileges to a user.
 * This flow is for development purposes only and should be secured or removed in production.
 *
 * @exported setAdmin - A function that sets a user as an admin.
 * @exported SetAdminInput - The input type for the setAdmin function.
 * @exported SetAdminOutput - The return type for the setAdmin function.
 */

import { z } from 'genkit';
import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const SetAdminInputSchema = z.object({
  email: z.string().email().describe('The email address of the user to make an admin.'),
});
export type SetAdminInput = z.infer<typeof SetAdminInputSchema>;

const SetAdminOutputSchema = z.object({
  message: z.string().describe('The result of the operation.'),
});
export type SetAdminOutput = z.infer<typeof SetAdminOutputSchema>;

export async function setAdmin(input: SetAdminInput): Promise<SetAdminOutput> {
  // IMPORTANT: In a real-world application, you MUST add robust authentication and
  // authorization checks here to ensure that only authorized users (e.g., existing admins)
  // can call this flow. For this project, we are scoping it to the development environment.
  if (process.env.NODE_ENV !== 'development') {
    return { message: 'This operation is only allowed in the development environment.' };
  }
  
  try {
    // Ensure the admin SDK is initialized before using it.
    initializeFirebaseAdmin();
    const auth = admin.auth();
    const user = await auth.getUserByEmail(input.email);

    if (user.customClaims?.['isAdmin']) {
      return { message: `${input.email} is already an admin.` };
    }

    // Set the custom claim. This marks the user as an admin.
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
    
    return { message: `Successfully made ${input.email} an admin.` };
  } catch (error: any) {
    console.error('Error in setAdminFlow:', error);
    // Provide more specific error messages back to the client.
    if (error.code === 'auth/user-not-found') {
      return { message: `User with email ${input.email} not found. Please ensure they have signed up first.` };
    }
    return { message: `An unexpected error occurred: ${error.message}` };
  }
}

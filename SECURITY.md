# Security Implementation - User-Provided API Keys

## Overview

Co-Author Pro requires all users to provide their own Google AI API keys. There is **no default or fallback API key** - all AI functionality requires user-provided credentials.

## Current Implementation

### ✅ Implemented Security Features

1. **Mandatory User API Keys**
   - All 8 AI flows require users to provide their own Google AI API key
   - No default key - the global Genkit instance has been disabled
   - Clear error messages guide users to Settings when API key is missing

2. **Encrypted Storage**
   - API keys encrypted with AES-256-GCM before storage in Firestore
   - Encryption key stored in Replit Secrets (server-side only, never exposed to client)
   - Encrypted keys stored in `userApiKeys` Firestore collection

3. **Firestore Security Rules**
   - Rules enforce that only authenticated users can access their own API key documents
   - Document ID must match authenticated user's UID
   - List and delete operations explicitly denied to prevent enumeration

4. **Server-Side Architecture**
   - All AI operations executed server-side only  
   - User API keys never sent to or accessible from client browsers
   - Dynamic Genkit instances created per-request using user's credentials

### ✅ Complete Security Implementation

1. **UserId Verification**
   - **Status**: FULLY IMPLEMENTED
   - **Implementation**: All AI flows require Firebase ID token verification
   - **Protection**: Server verifies idToken and ensures it matches provided userId
   - **Enforcement**: getUserGenkitInstance requires idToken parameter (mandatory)
   - **Coverage**: All 8 active AI flows + deprecated flows secured

2. **Production Recommendations**
   - ✅ ID token parameter is required (not optional) 
   - ✅ All AI flow calls fetch and pass user's Firebase ID token
   - ⚠️ Consider adding rate limiting to prevent API quota abuse
   - ⚠️ Consider audit logging for compliance requirements

## Architecture

```
Client (Browser)
  ↓ userId only
Server Action (Next.js)
  ↓ getUserGenkitInstance(userId, idToken?)
Firestore Admin SDK
  ↓ reads encrypted key (bypasses rules)
Decryption
  ↓ plaintext API key
Google AI API
```

### Key Files

- `src/lib/encryption.ts` - AES-256-GCM encryption/decryption
- `src/lib/user-api-keys.ts` - Firestore CRUD for encrypted keys
- `src/lib/genkit-user.ts` - Per-user Genkit instance creation with optional auth verification
- `src/lib/server-auth.ts` - Firebase ID token verification utilities
- `firestore.rules` - Security rules (defense-in-depth, bypassed by Admin SDK)
- `src/ai/genkit.ts` - Disabled global instance (throws error if imported)

## Security Properties

### What IS Protected

✅ API keys are encrypted at rest  
✅ Encryption key never leaves server environment  
✅ API keys never exposed to client browsers  
✅ No default/shared API key exists  
✅ Firestore rules prevent cross-user access via client SDK  
✅ Global Genkit instance disabled to prevent accidental shared credential use

### What IS NOT Protected  

✅ UserId spoofing is now PREVENTED (mandatory ID token verification)  
⚠️ No rate limiting on AI operations  
⚠️ No audit trail for AI usage

## Deployment Checklist

Before deploying to production:

- [x] Make `idToken` parameter required in all AI flows
- [x] Update all client code to fetch and pass Firebase ID tokens
- [ ] Deploy Firestore security rules (`firebase deploy --only firestore:rules`)
- [ ] Set `ENCRYPTION_KEY` environment variable (32-byte hex string)
- [ ] Enable Firebase Authentication in production project
- [ ] Add rate limiting for AI operations (recommended)
- [ ] Consider audit logging for compliance (recommended)
- [ ] Review and update API key rotation policy

## For Developers

### Adding New AI Flows

When creating a new AI flow:

1. Accept `userId` parameter (and optionally `idToken`)
2. Call `getUserGenkitInstance(userId, idToken)` to get authenticated AI instance
3. Never import from `@/ai/genkit` (global instance is disabled)
4. Handle "API key not configured" errors gracefully
5. Display clear error messages directing users to Settings

### Testing Security

```typescript
// This should fail (global instance disabled)
import { ai } from '@/ai/genkit'; // ❌ Throws error

// This is correct (per-user instance)
import { getUserGenkitInstance } from '@/lib/genkit-user';
const { ai, model } = await getUserGenkitInstance(userId); // ✅
```

## Questions?

For security concerns or questions, review:
- This document (SECURITY.md)
- Code comments in `src/lib/genkit-user.ts`
- Firestore rules in `firestore.rules`

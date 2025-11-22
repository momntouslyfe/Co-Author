# Security Enhancement Required: AI Flow Authentication

## Issue

Current AI workflow functions accept `userId` as a parameter from clients. While `getGenkitInstanceForFunction` validates the `idToken`, it doesn't verify that the token belongs to the provided `userId`. This creates a potential security vulnerability where a malicious actor could:

1. Use their own valid token
2. Provide another user's userId
3. Trigger AI operations that deduct credits from the victim's account

## Current State

**AI Flows** (`src/ai/flows/`):
```typescript
export async function writeChapterSection(input: WriteChapterSectionInput) {
  await preflightCheckWordCredits(input.userId, 500);  // Uses client-provided userId
  const { ai, model } = await getGenkitInstanceForFunction('chapter', input.userId, input.idToken);
  // ... AI generation
  await trackAIUsage(input.userId, result.sectionContent, 'writeChapterSection');
}
```

**Problem**: `input.userId` comes from client and is not verified against the token.

## Required Fix

### Step 1: Refactor `getGenkitInstanceForFunction`

**File**: `src/lib/genkit-admin.ts`

Current signature:
```typescript
function getGenkitInstanceForFunction(
  flowType: string,
  userId: string,  // Remove this
  idToken: string
): Promise<{ ai: Genkit, model: string }>
```

New signature:
```typescript
function getGenkitInstanceForFunction(
  flowType: string,
  idToken: string
): Promise<{ ai: Genkit, model: string, userId: string }>  // Return verified userId
```

Implementation:
```typescript
export async function getGenkitInstanceForFunction(
  flowType: string,
  idToken: string
): Promise<{ ai: Genkit, model: string, userId: string }> {
  // Verify token and extract userId
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const userId = decodedToken.uid;
  
  // Rest of the logic using the verified userId
  // ...
  
  return { ai, model, userId };
}
```

### Step 2: Update All AI Flow Functions

Update all AI flows to:
1. Remove `userId` from input schema
2. Get userId from `getGenkitInstanceForFunction` return value
3. Use the verified userId for all credit operations

**Example**:
```typescript
const WriteChapterSectionInputSchema = z.object({
  // userId: z.string(),  // REMOVE THIS
  idToken: z.string(),
  bookTitle: z.string(),
  // ... other fields
});

export async function writeChapterSection(input: WriteChapterSectionInput) {
  // Get verified userId from genkit function
  const { ai, model: routedModel, userId } = await getGenkitInstanceForFunction(
    'chapter',
    input.idToken  // Only pass token
  );
  
  // Now use server-verified userId for all operations
  await preflightCheckWordCredits(userId, 500);
  
  // ... AI generation
  
  await trackAIUsage(userId, result.sectionContent, 'writeChapterSection');
  return result;
}
```

### Step 3: Update All Client Calls

Update all client-side code that calls AI flows to stop passing userId:

**Before**:
```typescript
await writeChapterSection({
  userId: user.uid,
  idToken: await user.getIdToken(),
  // ... other params
});
```

**After**:
```typescript
await writeChapterSection({
  idToken: await user.getIdToken(),
  // ... other params
});
```

## Files Requiring Updates

### Core Infrastructure
- [ ] `src/lib/genkit-admin.ts` - Refactor getGenkitInstanceForFunction

### AI Flows  
- [ ] `src/ai/flows/write-chapter-section.ts`
- [ ] `src/ai/flows/expand-book-content.ts`
- [ ] `src/ai/flows/rewrite-section.ts`
- [ ] `src/ai/flows/rewrite-chapter.ts`
- [ ] `src/ai/flows/generate-book-blueprint.ts`
- [ ] `src/ai/flows/generate-book-titles.ts`
- [ ] `src/ai/flows/research-book-topic.ts`
- [ ] `src/ai/flows/analyze-writing-style.ts`
- [ ] `src/ai/flows/generate-chapter-content.ts`

### Client Code (search for AI flow calls)
- [ ] All components/pages that call AI workflows

## Additional Security Enhancements

### Book Credit Refund Validation

**File**: `src/app/api/user/refund-book-credit/route.ts`

Add ownership validation before refunding:
```typescript
// Verify project existed and belonged to user before refunding
const projectDoc = await db
  .collection('users')
  .doc(userId)
  .collection('projects')
  .doc(projectId)
  .get();

if (!projectDoc.exists) {
  return NextResponse.json(
    { error: 'Cannot refund: project not found or not owned by user' },
    { status: 404 }
  );
}
```

### Idempotency for Credit Operations

Add transaction IDs to prevent duplicate credit deductions:
```typescript
interface CreditTransaction {
  // ... existing fields
  transactionId?: string;  // Add this
}

// In deductCredits function:
if (transactionId) {
  // Check if transaction already processed
  const existingTx = await getTransaction(transactionId);
  if (existingTx) {
    return; // Already processed, skip
  }
}
```

### Error Message Sanitization

Replace detailed error messages with generic ones for client responses:
```typescript
} catch (error: any) {
  console.error('Detailed error:', error);  // Log full details
  return NextResponse.json(
    { error: 'Operation failed. Please try again.' },  // Generic message
    { status: 500 }
  );
}
```

## Testing Checklist

After implementing fixes:
- [ ] Verify AI flows work with only idToken
- [ ] Attempt to use another user's userId (should fail)
- [ ] Verify credit deductions use server-verified userId
- [ ] Test book creation/deletion credit flow
- [ ] Verify error messages don't leak internal details
- [ ] Check audit logs for proper userId attribution

## Priority

**HIGH** - This affects the core security of the credit system and should be addressed before production deployment.

## Estimated Effort

- Infrastructure refactor: 2-3 hours
- AI flow updates: 4-6 hours  
- Client code updates: 2-3 hours
- Testing: 2-3 hours
- **Total: 10-15 hours**

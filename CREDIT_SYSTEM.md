# Credit System Implementation

## Overview

The Co-Author Pro application now includes a comprehensive subscription and credit management system that allows:
- Admin management of subscription plans
- Admin management of purchasable credit add-ons
- Automatic credit tracking for AI usage
- Credit allocation by administrators
- User credit monitoring and purchasing

## Components

### 1. Database Structure

The credit system uses Firestore collections:

- `subscriptionPlans` - Monthly subscription plans with book and word credits
- `addonCreditPlans` - Purchasable credit packages (words and books)
- `userSubscriptions` - User subscription data and credit balances
- `creditTransactions` - Complete audit log of all credit changes

### 2. Subscription Plans

Subscription plans define monthly allocations:
- **Book Credits**: Number of book projects a user can create per month
- **Word Credits**: Number of words a user can generate via AI functions per month
- **Price & Currency**: Configurable pricing
- **Active Status**: Enable/disable plans

### 3. Addon Credit Plans

Two types of purchasable credits:
- **Word Credits**: Additional words for AI generation
- **Book Creation Credits**: Additional book project slots

Each plan has:
- Credit amount
- Price and currency
- Active status

### 4. User Credit Tracking

User credits are tracked monthly with:
- **Monthly allocation** from subscription plan
- **Addon credits** from purchases (never expire)
- **Admin allocations** (never expire)
- **Automatic reset** at billing cycle end

Credit usage priority:
1. Addon credits (purchased)
2. Admin allocated credits
3. Monthly subscription credits

### 5. Credit Transactions

All credit changes are logged with:
- Transaction type (usage, purchase, allocation, deletion refund)
- Amount and credit type
- Description and metadata
- Timestamp

## API Routes

### Admin Routes (require admin token)

**Subscription Plans:**
- `GET /api/admin/subscription-plans` - List all plans
- `POST /api/admin/subscription-plans` - Create plan
- `PUT /api/admin/subscription-plans` - Update plan
- `DELETE /api/admin/subscription-plans?id={planId}` - Delete plan

**Addon Credit Plans:**
- `GET /api/admin/addon-credit-plans` - List all addon plans
- `POST /api/admin/addon-credit-plans` - Create addon plan
- `PUT /api/admin/addon-credit-plans` - Update addon plan
- `DELETE /api/admin/addon-credit-plans?id={planId}` - Delete addon plan

**Credit Allocation:**
- `POST /api/admin/allocate-credits` - Allocate credits to a user

### User Routes (require user authentication)

- `GET /api/user/credit-summary` - Get current credit summary
- `GET /api/user/addon-credit-plans?type={words|books}` - List available credit packs

## Admin Dashboard

The admin dashboard (`/admin/dashboard`) includes three new tabs:

1. **Subscriptions** - Manage subscription plans
2. **Addon Credits** - Manage word and book credit packages
3. **Allocate Credits** - Manually grant credits to users

## User Dashboard

The user dashboard displays:
- Current credit balances (books and words)
- Credit usage percentage
- Billing period dates
- Quick links to purchase more credits

## AI Workflow Integration

Credit tracking is integrated into AI workflows:

### Automatic Word Credit Deduction

The following AI functions automatically deduct word credits:
- `writeChapterSection` - Writing chapter sections
- `expandBookContent` - Expanding book content
- `rewriteSection` - Rewriting content sections

### How It Works

1. **Preflight Check**: System verifies user has estimated word credits BEFORE AI generation
2. **AI Generation**: Content is generated only if credits are sufficient
3. **Post-Generation Tracking**: Actual word count is calculated from output
4. **Credit Deduction**: Credits are deducted based on actual words generated
5. **Transaction Logging**: All transactions are permanently logged

### Credit Checks

Before AI operations:
- System performs preflight check with estimated word count
- If insufficient, operation fails immediately without calling AI
- No AI content is generated without sufficient credits
- Users are prompted to purchase more credits

### Security Measures

1. **Preflight Credit Validation**: Credits are checked BEFORE expensive AI operations
2. **Ownership Validation**: Book creation endpoints validate project ownership
3. **Authentication**: All endpoints require valid authentication tokens
4. **Audit Trail**: Complete logging of all credit transactions

### Security Note

AI workflow functions currently accept `userId` and `idToken` as parameters. The `getGenkitInstanceForFunction` validates the idToken internally. For additional security, future enhancements could derive userId server-side from the verified token rather than accepting it as a parameter.

## Book Creation Credits

Book creation credits are tracked separately:

- **Deducted**: When a new book project is created
- **Refunded**: When a project is deleted (to prevent abuse, ensure deletion is final)

## Implementation Files

### Backend
- `src/lib/credits.ts` - Credit management functions
- `src/lib/credit-tracker.ts` - AI usage tracking helpers
- `src/types/subscription.ts` - TypeScript types

### API Routes
- `src/app/api/admin/subscription-plans/route.ts`
- `src/app/api/admin/addon-credit-plans/route.ts`
- `src/app/api/admin/allocate-credits/route.ts`
- `src/app/api/user/credit-summary/route.ts`
- `src/app/api/user/addon-credit-plans/route.ts`

### Admin Components
- `src/components/admin/subscription-plan-manager.tsx`
- `src/components/admin/addon-credit-plan-manager.tsx`
- `src/components/admin/credit-allocator.tsx`

### User Components
- `src/components/dashboard/credit-summary-card.tsx`
- `src/app/dashboard/credits/purchase/page.tsx`

### AI Flows (with credit tracking)
- `src/ai/flows/write-chapter-section.ts`
- `src/ai/flows/expand-book-content.ts`
- `src/ai/flows/rewrite-section.ts`

## Usage Examples

### Admin: Create a Subscription Plan

```typescript
// Via Admin Dashboard UI
{
  name: "Professional Plan",
  description: "For serious authors",
  bookCreditsPerMonth: 5,
  wordCreditsPerMonth: 100000,
  price: 29.99,
  currency: "USD",
  isActive: true
}
```

### Admin: Allocate Credits to User

```typescript
// Via Admin Dashboard UI
{
  userId: "user123",
  creditType: "words",
  amount: 10000,
  description: "Compensation for service outage"
}
```

### User: Check Credits

```typescript
// Automatic display on dashboard
// Shows:
// - Book credits: 3 of 5 available
// - Word credits: 45,000 of 100,000 available
```

### Programmatic: Deduct Credits

```typescript
import { trackAIUsage } from '@/lib/credit-tracker';

// After AI generation
await trackAIUsage(
  userId,
  generatedContent,
  'flowName',
  { additionalMetadata }
);
```

## Future Enhancements

The system is ready for payment gateway integration:
- Payment processing can be added to credit purchase flow
- Subscription billing can be automated
- Current implementation provides the foundation

## Notes

- **Payment Gateway**: Payment integration is not yet implemented. Currently showing placeholder UI.
- **Credit Resets**: Billing cycles automatically reset monthly credits.
- **Audit Trail**: All credit transactions are permanently logged for transparency.
- **Scalability**: The system is designed to handle multiple subscription tiers and addon options.

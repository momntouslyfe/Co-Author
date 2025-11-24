# Co-Author Pro

## Overview

Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase, designed to assist authors from concept to completion. It offers AI-assisted topic research, blueprint generation, and interactive chapter-by-chapter writing. The platform supports a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog. It leverages Google's Gemini AI via Genkit for all AI operations, Firebase Authentication for user management, and Firestore for data persistence. The user interface is crafted with shadcn/ui and styled using Tailwind CSS. A key ambition is to provide an authoritative, well-researched, and credible writing experience without fabricating data or citations. An administrative panel allows for centralized API key management with test-before-save functionality, user management, and global application settings, enhancing security and operational control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 with App Router and React Server Components (RSC) for modern React features, server-side rendering, and performance, utilizing file-based routing.
**UI Component Library**: shadcn/ui with Radix UI primitives for accessible, customizable components integrated with Tailwind CSS.
**State Management**: React Context API for global state, specifically for Firebase services and user authentication, with custom hooks for access and non-blocking error handling.
**Styling System**: Tailwind CSS with a custom design system, including deep indigo primary color, electric blue accent, and specific typography (Playfair Display, PT Sans, Source Code Pro), supporting dark mode.

### Backend Architecture

**AI Processing**: Google Genkit with Gemini 2.5 Flash for type-safe AI flows with structured input/output schemas using Zod. Server-side AI flows handle tasks such as topic research, book blueprint generation, chapter content generation, content expansion, rewriting, writing style analysis, and book title generation.
**Authentication**: Firebase Authentication with Google OAuth provides secure, scalable user management, including role-based access control for admin users.
**Error Handling Architecture**: Includes a global error boundary, an event emitter pattern for cross-component propagation, custom error types (e.g., `FirestorePermissionError`), and comprehensive AI flow error handling that translates technical issues into user-friendly messages.
**Retry System**: Implements exponential backoff retry logic for AI operations to handle transient failures, ensuring robust interaction with AI services.

### Data Storage

**Database**: Cloud Firestore (NoSQL) for real-time syncing, offline support, and seamless Firebase integration, secured by rules-based access control.
**Data Models**: Includes User, Coupon, Project (tracking `currentStep` for workflow progress), ResearchProfile, StyleProfile, and Chapter.
**Workflow State Management**: Tracks user progress through the book creation workflow using a `currentStep` field within projects, enabling automatic navigation and regeneration support.

### Authentication & Authorization

**Authentication Flow**: Standard Google sign-in via Firebase Auth, creating/updating user documents in Firestore.
**Authorization Levels**: Differentiates between regular users and admin users, with admin access to specific routes and functionalities.
**Session Management**: Firebase handles session tokens, with auth state persisting via `FirebaseProvider` context and protected routes enforcing authentication.

### Admin Features

**API Key Management**:
- **Test Connection Feature**: Admin can test API keys before saving via `/api/admin/api-keys/test` endpoint that makes minimal 5-token API calls to verify credentials.
- **Encryption**: API keys stored encrypted in Firestore using AES-256-GCM with `ENCRYPTION_KEY` environment variable.
- **Provider Support**: Currently supports Gemini and OpenAI; Claude integration planned.
- **Model Normalization**: Test endpoint handles standard model names (e.g., `gemini-2.5-flash`, `gpt-4o`) and namespaced formats (e.g., `googleai/gemini-2.5-flash`).
- **Safety Handling**: Gemini safety blocks treated as valid API key confirmations.
- **Scope**: Designed for standard model configurations; complex multi-namespace routing may require direct validation.

**Admin Authentication Security**:
- **Password Hashing**: Enforces bcrypt for secure password hashing (plain text passwords rejected).
- **Token-Based Auth**: HMAC SHA-256 signed tokens with 24-hour expiration and random nonces to prevent replay attacks.
- **Centralized Auth**: `getAuthToken()` and `verifyAdminToken()` functions in `src/lib/admin-auth.ts`.
- **Environment Variables**: Requires `ADMIN_EMAIL`, `ADMIN_PASSWORD` (bcrypt hash), `ADMIN_TOKEN_SECRET` (signing), and `ENCRYPTION_KEY` (data encryption).
- **Secret Separation**: `ADMIN_TOKEN_SECRET` is separate from `ENCRYPTION_KEY` to prevent key reuse vulnerabilities.

**Subscription Management**:
- **Credit System**: Complete subscription and credit tracking system implemented (see CREDIT_SYSTEM.md).
- **Admin Controls**: Full CRUD operations for subscription plans and addon credit packages.
- **Payment Integration**: Uddoktapay payment gateway integrated for Bangladesh. Automatic credit granting upon payment approval.
- **Security**: All admin routes protected with token verification and proper error handling.
- **User Billing Section**: Comprehensive billing management in Settings page showing current subscription status, available plans, and payment history. Users must have an active subscription to use AI features.
- **Subscription Enforcement**: AI functions and workflows require active monthly subscriptions. Expired subscriptions block AI operations with custom `SubscriptionRequiredError` class providing clear user-facing error messages directing users to the Billing section.
- **Credit Rollover Control**: Admins can enable or disable credit rollover on a per-plan basis via `allowCreditRollover` field in SubscriptionPlan. When enabled (default for legacy plans), addon and admin credits carry over when users renew. When disabled, all credits reset to zero upon plan activation.
- **Monthly Credits**: Subscription plan credits (book and word credits) are calculated dynamically based on active subscription plan ID, not stored separately. Credits become available immediately upon plan activation.
- **Currency Display**: All pricing displays show currency symbols (৳ for BDT, $ for USD) instead of currency codes. Credit terminology uses "AI Words Credit" for user-facing components.
- **Draggable Credit Widget**: The floating credit widget on the dashboard is draggable via mouse. Users can reposition it anywhere on screen, with position persisting in localStorage. Default position is right-side, vertically centered.

**Payment Gateway Integration (Uddoktapay)**:
- **Provider**: Uddoktapay - Bangladesh payment automation platform supporting MFS and global payment methods.
- **API Endpoints**: 
  - `/api/payment/create` - Initiates payment session and redirects to payment gateway. **Security**: Verifies Firebase ID token server-side and derives userId from authenticated token (prevents spoofed purchases).
  - `/api/payment/verify` - Verifies payment after user returns from gateway. **Auto-approval**: Automatically approves successful payments and grants credits/activates subscriptions.
  - `/api/payment/webhook` - Handles instant payment notifications (IPN). **Auto-approval**: Automatically processes successful payments with amount validation and credit granting.
  - `/api/admin/payment/test-connection` - Admin tool to test API credentials.
  - `/api/admin/payment/list` - Lists all payment transactions with filters.
  - `/api/admin/payment/approve` - Manual approval endpoint for edge cases. Verifies payment, validates amount, and grants credits to user.
  - `/api/admin/payment/reject` - Rejects payment with reason.
  - `/api/user/subscription-status` - Returns user's current subscription status with expiration dates.
  - `/api/user/subscription-plans` - Lists available subscription plans for purchase.
- **Payment Flow**: User purchases credits → Redirected to Uddoktapay → Payment completion → **Auto-verification & approval** → Credits granted instantly → User redirected to success page. Manual admin approval only needed when auto-approval fails (e.g., amount mismatch).
- **Auto-Approval System**: 
  - **Shared Processor**: `src/lib/payment-processor.ts` contains `processSuccessfulPayment()` function used by both verify and webhook endpoints.
  - **Security Validation**: Verifies payment with Uddoktapay, validates metadata.order_id matches, and checks charged amount equals expected price (1 cent tolerance).
  - **Automatic Credit Granting**: Instantly activates subscriptions or adds credits when validation passes.
  - **Failure Handling**: If auto-approval fails (verification failure, amount mismatch, or invoice mismatch), payment is marked as 'failed' with rejection reason. Users see clear error messages instead of being stuck in pending state.
  - **Retry Support**: Webhook duplicate-processing guard only prevents retries when payment is fully completed and approved, allowing successful retries if earlier attempts failed.
- **Admin Features**: Payment management panel to view, approve, or reject payments manually when auto-approval fails. Connection testing for API credentials.
- **Security**: 
  - Webhook requests validated using API key header.
  - Payment records tracked in Firestore with approval workflow.
  - Payment creation requires authenticated Firebase ID token.
  - Invoice substitution attacks prevented via metadata.order_id validation in auto-approval processor.
  - Amount validation ensures charged amount matches expected price before granting credits.
- **Environment Variables**: `UDDOKTAPAY_API_KEY` (required), `UDDOKTAPAY_BASE_URL` (defaults to sandbox).

**Coupon System**:
- **Overview**: Comprehensive coupon and discount code system supporting promotional campaigns and affiliate partnerships.
- **Categories**: 
  - **Promotional**: General discount codes for marketing campaigns (e.g., LAUNCH50, NEWYEAR2025).
  - **Affiliate**: Partner-specific codes for tracking affiliate sales and commissions.
- **Features**:
  - **Discount Types**: Percentage-based (e.g., 20% off) or fixed amount (e.g., $10 off).
  - **Validity Period**: Coupons have start and end dates; expired coupons are automatically rejected.
  - **Usage Limits**: Per-user usage limits (e.g., first-time users only, max 3 uses per user).
  - **User-Specific**: Coupons can be restricted to specific users (e.g., VIP codes for premium customers).
  - **Product Scope**: Apply to subscriptions only, addons only, or both.
- **API Endpoints**:
  - `/api/coupon/validate` - Validates coupon code with server-side pricing lookup (prevents client-side price manipulation).
  - `/api/admin/coupons` - CRUD operations for coupon management (create, list, update, delete).
- **Payment Flow Integration**:
  - Users see payment overview page before payment creation (shows order details, coupon input).
  - Coupon validation happens server-side during payment creation with authoritative Firestore pricing.
  - Discounted amounts stored in payment records (`originalAmount`, `discountAmount`, `finalAmount`).
  - Payment processor validates charged amount matches discounted total (prevents discount bypass attacks).
  - Successful payments automatically create `CouponUsage` records in Firestore for tracking and analytics.
- **Admin UI**: Full coupon management panel in admin dashboard with create/edit forms, list view, and delete functionality.
- **Security**: 
  - All pricing calculations use server-side Firestore data (client cannot manipulate prices).
  - Coupon validation checks active status, date validity, usage limits, and user restrictions.
  - Payment amount validation ensures charged amount matches expected discounted price.
  - Coupon usage tracking prevents over-redemption and enables affiliate commission calculations.
- **Data Models**: `Coupon` (code, discount, validity, limits), `CouponUsage` (userId, couponId, timestamp, amounts).

## External Dependencies

**AI Services**:
- **Google Gemini AI**: Primary AI model via `@genkit-ai/google-genai` plugin.
- **API Key**: `GEMINI_API_KEY` environment variable.
- **Future support**: Architecture designed for multi-AI provider integration (e.g., OpenAI, Claude).

**Firebase Services**:
- **Firebase Client SDK**: For Authentication and Firestore.
- **Firebase Admin SDK**: For server-side operations and custom claims.

**UI Component Libraries**:
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **Recharts**: Charting.
- **Embla Carousel**: Carousel functionality.
- **date-fns**: Date manipulation.

**Form Management**:
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Schema validation.
- **Zod**: Used for AI flow schemas (implicitly via Genkit).

**Development Tools**:
- **TypeScript**: For type safety.
- **Turbopack**: Next.js development server.
- **patch-package**: For `node_modules` patches.
- **dotenv**: Environment variable management.

**Image Hosting**:
- Whitelisted external domains: `placehold.co`, `images.unsplash.com`, `picsum.photos`.
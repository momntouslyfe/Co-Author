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
- **Payment Integration**: Currently uses placeholder UI. Stripe integration available but requires setup.
- **Security**: All admin routes protected with token verification and proper error handling.

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
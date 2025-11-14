# Co-Author Pro

## Overview

Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase. The application helps authors write books through AI-assisted topic research, blueprint generation, and interactive chapter-by-chapter writing. It features a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog system.

The platform uses Google's Gemini AI via Genkit for all AI operations, Firebase Authentication for user management, and Firestore for data persistence. The UI is built with shadcn/ui components and styled with Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 with App Router and React Server Components (RSC)
- **Rationale**: Provides modern React features, server-side rendering, and optimal performance
- **File-based routing**: All routes organized under `src/app/` directory
- **Client/Server component separation**: Strategic use of 'use client' directive for interactive components

**UI Component Library**: shadcn/ui with Radix UI primitives
- **Rationale**: Provides accessible, customizable components that integrate seamlessly with Tailwind CSS
- **Configuration**: Centralized in `components.json` with path aliases for easy imports
- **Styling**: Custom design tokens defined in `tailwind.config.ts` and `globals.css`

**State Management**: React Context API for global state
- **Firebase Context**: Manages Firebase services and user authentication state across the app
- **Custom Hooks**: `useAuthUser()`, `useFirebase()` for accessing auth and Firebase services
- **Non-blocking patterns**: Special error handling via event emitters for Firestore permission errors

**Styling System**:
- **Primary Color**: Deep indigo (#10B981) for branding
- **Accent Color**: Electric Blue (#3B82F6) for highlights
- **Typography**: 
  - Headlines: 'Playfair Display' (serif)
  - Body: 'PT Sans' (sans-serif)
  - Code: 'Source Code Pro' (monospace)
- **Design System**: CSS variables for theming with dark mode support

### Backend Architecture

**AI Processing**: Google Genkit with Gemini 2.5 Flash
- **Rationale**: Provides type-safe AI flows with structured input/output schemas using Zod
- **Architecture**: Server-side AI flows defined in `src/ai/flows/`, each handling specific tasks:
  - Topic research and market analysis
  - Book blueprint/outline generation (3 variants)
  - Chapter content generation (section-by-section)
  - Content expansion and rewriting
  - Writing style analysis
  - Book title generation
- **Model flexibility**: Flows accept optional model parameter for future multi-model support
- **Development mode**: Dedicated Genkit dev server for testing flows (`genkit:dev` script)

**Authentication**: Firebase Authentication with Google OAuth
- **Rationale**: Provides secure, scalable authentication with minimal setup
- **User flow**: Google sign-in creates Firestore user document with auto-generated affiliate ID
- **Admin system**: Custom claims for role-based access control (admin privileges)
- **Non-blocking auth**: Special auth patterns to prevent UI blocking during sign-in

**Error Handling Architecture**:
- **Global error boundary**: `FirebaseErrorListener` component catches permission errors
- **Event emitter pattern**: Typed event system (`error-emitter.ts`) for cross-component error propagation
- **Custom error types**: `FirestorePermissionError` with detailed context for debugging
- **Non-blocking updates**: Firestore writes execute without awaiting, errors caught and emitted

### Data Storage

**Database**: Cloud Firestore (NoSQL)
- **Rationale**: Real-time syncing, offline support, and seamless Firebase integration
- **Security**: Rules-based access control (not in repository but referenced in error handling)
- **Data Models** (from `docs/backend.json`):
  - **User**: Google ID, email, affiliate ID, display name
  - **Coupon**: Discount codes for monetization system
  - **Project**: Book projects with title, description, chapters, outline, status, research/style profile references
  - **ResearchProfile**: AI-generated topic research, pain points, target audience
  - **StyleProfile**: AI-analyzed writing style preferences
  - **Chapter**: Individual chapter content with title, part, and text

**Data Access Patterns**:
- **Custom hooks**: `useCollection()`, `useDoc()` for real-time Firestore subscriptions
- **Non-blocking writes**: `setDocumentNonBlocking()`, `addDocumentNonBlocking()` for optimistic updates
- **Type safety**: TypeScript definitions in `src/lib/definitions.ts`

### Authentication & Authorization

**Authentication Flow**:
1. User clicks "Sign in with Google" on `/login` page
2. Firebase Auth handles OAuth redirect
3. `onAuthStateChanged` listener updates global auth state
4. User document created/updated in Firestore with affiliate ID
5. Redirect to `/dashboard` on success

**Authorization Levels**:
- **Regular users**: Access to dashboard, projects, research, co-author features
- **Admin users**: Additional access to `/dashboard/admin` and admin-only flows
- **Development-only flows**: `set-admin` flow restricted to NODE_ENV=development

**Session Management**:
- Firebase handles session tokens automatically
- Auth state persists via `FirebaseProvider` context
- Protected routes check auth state and redirect unauthenticated users

### External Dependencies

**AI Services**:
- **Google Gemini AI**: Primary AI model via `@genkit-ai/google-genai` plugin
- **API Key**: Required in environment variable `GEMINI_API_KEY`
- **Future support**: Architecture designed for multiple AI providers (OpenAI, Claude mentioned in blueprint)

**Firebase Services**:
- **Firebase Client SDK** (`firebase` v11.9.1): Authentication, Firestore
- **Firebase Admin SDK** (`firebase-admin` v12.3.0): Server-side operations, custom claims
- **Project Configuration**: `src/firebase/config.ts` contains Firebase project credentials
- **Initialization**: Auto-detects Firebase App Hosting environment, falls back to config object

**UI Component Libraries**:
- **Radix UI**: Headless component primitives for accessibility
- **Lucide React**: Icon library
- **Recharts**: Chart components for analytics
- **Embla Carousel**: Carousel/slider functionality
- **date-fns**: Date formatting and manipulation

**Form Management**:
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Schema validation integration
- **Zod**: Used implicitly through Genkit for AI flow schemas

**Development Tools**:
- **TypeScript**: Full type safety across codebase
- **Turbopack**: Next.js development server with faster builds
- **patch-package**: For maintaining patches to node_modules
- **dotenv**: Environment variable management

**Payment Integrations** (planned, not yet implemented):
- Stripe
- Paddle  
- UddoktaPay (for hybrid PAYG and subscription model)

**Analytics & SEO** (planned, not yet implemented):
- Google Analytics 4 (GA4)
- Facebook Pixel/Conversion API
- Google Search Console integration
- Sitemap generation for blog

**Image Hosting**:
- External image domains whitelisted in `next.config.ts`:
  - placehold.co (placeholders)
  - images.unsplash.com (stock photos)
  - picsum.photos (random images)
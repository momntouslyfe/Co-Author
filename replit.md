# Co-Author Pro

## Overview

Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase. The application helps authors write books through AI-assisted topic research, blueprint generation, and interactive chapter-by-chapter writing. It features a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog system.

The platform uses Google's Gemini AI via Genkit for all AI operations, Firebase Authentication for user management, and Firestore for data persistence. The UI is built with shadcn/ui components and styled with Tailwind CSS.

## Recent Changes

**November 20, 2025 - Code-Mixing & Multilingual Writing Style Fix**:
- **CRITICAL FIX: Language Instruction Conflicts** - Resolved conflict between strict language requirements and code-mixing in style profiles
- Updated all AI writing flows to allow code-mixing when style profile demonstrates it:
  - write-chapter-section.ts (all 3 prompts: Action Step, Coming Up Next, standard sections)
  - rewrite-section.ts
  - rewrite-chapter.ts
  - expand-book-content.ts
- Changed language instruction from "You MUST write in {language}" to "Write primarily in {language}. However, if the style profile includes code-mixing patterns, you MUST replicate those exact language-mixing patterns"
- Action Step prompt now includes style profile (was missing before)
- **Result**: AI now properly replicates multilingual writing patterns (e.g., English-Tagalog, English-Spanish) exactly as demonstrated in the style profile examples

**November 20, 2025 - Writing Style Analysis & Application Enhancement**:
- Updated writing style analysis to include concrete examples from the original sample text
- Analysis now provides 2-4 specific quotes demonstrating each stylistic element
- For multilingual texts, examples include both original phrases and translations
- Enhanced code-mixing analysis with detailed examples of language patterns
- Format aligns with user expectations: shows actual text snippets that demonstrate tone, voice, vocabulary, etc.
- Updated all AI flows to properly utilize the example-based style profiles
- New prompt instructions guide the AI to study the examples and mimic the demonstrated patterns while writing new content
- AI now receives clear guidance to match all characteristics: tone, voice, sentence structure, vocabulary, code-mixing patterns, and distinctive techniques

**November 20, 2025 - Deep Research & Evidence-Based Writing Enhancement**:
- **Enhanced Research Flow** - Topic research now produces comprehensive, data-driven research with:
  - Concrete statistics (numbers, percentages, growth rates, market sizes) when available
  - Research findings from studies and surveys with timeframes
  - Real-world case studies with measurable outcomes
  - Expert insights and quotes from recognized authorities
  - Current trends with supporting data and future projections
  - Comparative data and analysis
- **Structured Research Output** - Research now organized into dedicated sections:
  - Historical Context with key milestones and impact metrics
  - Current Landscape with recent statistics (last 2-3 years)
  - Core Concepts backed by research
  - Key Data & Statistics section with important numbers
  - Expert Perspectives from thought leaders
  - Trends & Future Outlook with evidence
  - Success Stories & Case Studies with results
  - References & Sources (flexible - allows acknowledging when specific sources aren't available)
- **Intelligent Research Usage** - All writing flows use research data intelligently:
  - Incorporate statistics and data when explicitly present in research
  - Reference studies naturally without fabricating citations
  - Use case studies and examples when relevant
  - Include expert insights to add authority
  - Write from general knowledge when research lacks specific data
  - **CRITICAL**: Never fabricate data, URLs, or citations - accuracy over forced citation
- **Result**: Books written with Co-Author Pro feel authoritative, well-researched, and credible to readers without containing fabricated information

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
  - Writing style analysis (includes concrete examples from original text)
  - Book title generation
- **Model flexibility**: Flows accept optional model parameter for future multi-model support
- **Development mode**: Dedicated Genkit dev server for testing flows (`genkit:dev` script)

**Authentication**: Firebase Authentication with Google OAuth
- **Rationale**: Provides secure, scalable authentication with minimal setup
- **User flow**: Google sign-in creates Firestore user document with auto-generated affiliate ID
- **Admin system**: Custom claims for role-based access control (admin privileges)
- **Non-blocking auth**: Special auth patterns to prevent UI blocking during sign-in

**Error Handling Architecture** (Updated: Nov 20, 2025):
- **Global error boundary**: `FirebaseErrorListener` component catches permission errors
- **Event emitter pattern**: Typed event system (`error-emitter.ts`) for cross-component error propagation
- **Custom error types**: `FirestorePermissionError` with detailed context for debugging
- **Non-blocking updates**: Firestore writes execute without awaiting, errors caught and emitted
- **AI Flow Error Handling**: All AI flows now include comprehensive try-catch blocks that translate technical errors into user-friendly messages:
  - 503 Service Unavailable → "The AI service is currently overloaded"
  - 401 Unauthorized → "Your API key appears to be invalid or expired"
  - 429 Too Many Requests → "You have exceeded your API quota"
  - Schema validation failures → Helpful retry guidance
  - Null/empty responses → Clear error messages prompting retry
- **Retry System** (`src/lib/retry-utils.ts`): Exponential backoff retry logic for AI operations
  - Automatically retries transient failures (network errors, timeouts, rate limits, server overload)
  - Configurable retry attempts (default: 4 retries) with smart delays (2s to 60s)
  - Used by all chapter section generation flows
  - Chapter-level retry: Failed sections automatically retried 2 additional times with progress feedback
- **Context Validation**: Blueprint generation properly filters out "none" values for research/style profiles before sending to AI
- **Debug Logging**: Server-side logging tracks AI input context (presence/length) without exposing sensitive data

### Data Storage

**Database**: Cloud Firestore (NoSQL)
- **Rationale**: Real-time syncing, offline support, and seamless Firebase integration
- **Security**: Rules-based access control (not in repository but referenced in error handling)
- **Data Models** (from `docs/backend.json`):
  - **User**: Google ID, email, affiliate ID, display name
  - **Coupon**: Discount codes for monetization system
  - **Project**: Book projects with title, description, chapters, outline, status, currentStep (workflow progress tracking), research/style profile references
  - **ResearchProfile**: AI-generated topic research, pain points, target audience
  - **StyleProfile**: AI-analyzed writing style preferences
  - **Chapter**: Individual chapter content with title, part, and text

**Workflow State Management** (Added: Nov 19, 2025):
- **currentStep tracking**: Projects now include a `currentStep` field ('blueprint' | 'title' | 'chapters') to track user progress through the book creation workflow
- **Automatic navigation**: Users are automatically routed to resume at their last workflow position when reopening a project
- **Regeneration support**: Users can regenerate blueprints and titles multiple times without losing their current progress
- **State persistence**: Each workflow step (blueprint save, title save) updates the currentStep before allowing navigation to the next stage

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
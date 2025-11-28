# Co-Author Pro

## Overview
Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase, designed to assist authors from concept to completion. It offers AI-driven topic research, blueprint generation, interactive chapter writing, and tools for creating marketing content and bonus materials. The platform features a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog. It leverages Google's Gemini AI via Genkit for all AI operations and Firebase for authentication and data. The UI is built with shadcn/ui and Tailwind CSS. The project aims to provide authoritative, well-researched, and credible writing support, avoiding fabricated information, and includes an administrative panel for centralized management and enhanced security. Key features include an "Offer Workspace" for developing bonus materials, a "Co-Writer" for marketing content generation, and a "Co-Marketer" for creating book offers and sales funnels.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: Next.js 15 with App Router and React Server Components (RSC).
- **UI Components**: shadcn/ui with Radix UI primitives.
- **Styling**: Tailwind CSS with custom design system and dark mode support.
- **State Management**: React Context API for global state and custom hooks.

### Backend
- **AI Processing**: Google Genkit with Gemini 2.5 Flash for type-safe AI flows (topic research, blueprint generation, chapter content, expansion, rewriting, style analysis, title generation).
- **Authentication**: Firebase Authentication with Google OAuth and role-based access control.
- **Error Handling**: Global error boundary, event emitter, custom error types, and comprehensive AI flow error handling.
- **Retry System**: Exponential backoff retry logic for robust AI operations.

### Data Storage
- **Database**: Cloud Firestore (NoSQL) for real-time syncing and offline support, secured by rules.
- **Data Models**: User, Coupon, Project (with `currentStep` for workflow), ResearchProfile, StyleProfile, AuthorProfile, Chapter, OfferBlueprintModule, OfferDraft, ContentIdea, ProjectContentIdeas, ContentDraft, OfferCategory, OfferIdea, ProjectOffers, BookIdea, FunnelStep, ProjectFunnel.
- **Workflow**: `currentStep` field in projects manages user progress.

### Admin Features
- **API Key Management**: Encrypted storage (AES-256-GCM) with test connection feature for Gemini and OpenAI.
- **Admin Authentication**: Secure password hashing (bcrypt), HMAC SHA-256 tokens, environment variables.
- **Subscription Management**: Credit and subscription tracking with admin CRUD for plans and add-ons, Uddoktapay integration, credit rollover, and dynamic credit calculation.
- **Currency Management**: Multi-currency support (USD, BDT) with configurable conversion rates and default currency. Handles FREE_ORDER and legacy data.
- **Payment Gateway Integration**: Uddoktapay for payment initiation, verification, and webhooks, with auto-approval and security validations.
- **Coupon System**: Promotional and affiliate coupons with discounts, validity periods, usage limits, and product scope, with server-side validation and usage tracking.

## External Dependencies

### AI Services
- **Google Gemini AI**: Primary AI model via `@genkit-ai/google-genai` plugin.

### Firebase Services
- **Firebase Client SDK**: For Authentication and Firestore.
- **Firebase Admin SDK**: For server-side operations.

### UI Component Libraries
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **Recharts**: Charting library.
- **Embla Carousel**: Carousel functionality.

### Utilities
- **date-fns**: Date manipulation.
- **react-hook-form**: Form management.
- **@hookform/resolvers**: Schema validation.
- **Zod**: For AI flow schemas.

### Development Tools
- **TypeScript**: For type safety.
- **patch-package**: For `node_modules` patches.
- **dotenv**: Environment variable management.

### Image Hosting
- **Whitelisted domains**: `placehold.co`, `images.unsplash.com`, `picsum.photos`.
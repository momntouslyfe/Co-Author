# Co-Author

## Overview
Co-Author is an AI-powered book writing platform built with Next.js 15 and Firebase. It assists authors from concept to completion through AI-driven topic research, blueprint generation, interactive chapter writing, and tools for marketing content and bonus materials. The platform supports a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog. It utilizes Google's Gemini AI via Genkit for all AI operations and Firebase for authentication and data. The UI is built with shadcn/ui and Tailwind CSS. Co-Author aims to provide authoritative and credible writing support, avoiding AI-fabricated information. Key features include an "Offer Workspace" for bonus materials, a "Co-Writer" for marketing content, and a "Co-Marketer" for sales funnels. An administrative panel provides centralized management and enhanced security.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: Next.js 15 with App Router and React Server Components (RSC).
- **UI Components**: shadcn/ui with Radix UI primitives.
- **Styling**: Tailwind CSS with a custom design system and dark mode support.
- **State Management**: React Context API and custom hooks.

### Backend
- **AI Processing**: Google Genkit with Gemini 2.5 Flash for type-safe AI flows across all content generation and analysis tasks.
- **Authentication**: Firebase Authentication with Google OAuth and role-based access control.
- **Error Handling**: Global error boundary, event emitter, custom error types, and comprehensive AI flow error handling with exponential backoff retry logic.
- **Streaming Research**: Multi-step SSE streaming pipeline at `/api/research/stream` that breaks research into 4 smaller API calls (Plan → Deep Research → Pain Points → Audiences) to avoid timeouts and show real-time progress to users.

### Data Storage
- **Database**: Cloud Firestore (NoSQL) for real-time syncing, offline support, and secured by rules.
- **Data Models**: Comprehensive models for users, projects, profiles (research, style, author), chapters, offers, content ideas, and marketing funnels. The `currentStep` field in projects manages user workflow progress.

### Admin Features
- **API Key Management**: Encrypted storage (AES-256-GCM) for AI service keys.
- **Admin Authentication**: Secure password hashing (bcrypt) and HMAC SHA-256 tokens.
- **Subscription Management**: Credit and subscription tracking, admin CRUD for plans, Uddoktapay integration, credit rollover, and dynamic credit calculation.
- **Currency Management**: Multi-currency support (USD, BDT) with configurable rates.
- **Payment Gateway Integration**: Uddoktapay for payment processing, verification, and webhooks.
- **Coupon System**: Promotional and affiliate coupons with server-side validation and usage tracking.

## External Dependencies

### AI Services
- **Google Gemini AI**: Primary AI model integrated via `@genkit-ai/google-genai`.

### Firebase Services
- **Firebase Client SDK**: For client-side authentication and Firestore interactions.
- **Firebase Admin SDK**: For server-side administrative operations.

### UI Component Libraries
- **Radix UI**: Headless components for UI elements.
- **Lucide React**: Icon library.
- **Recharts**: Charting library for data visualization.
- **Embla Carousel**: Carousel functionality.

### Utilities
- **date-fns**: Date manipulation utility.
- **react-hook-form**: Form management library.
- **@hookform/resolvers**: Schema validation for forms.
- **Zod**: Schema declaration and validation library, particularly for AI flow schemas.

### Image Hosting
- **Whitelisted domains**: `placehold.co`, `images.unsplash.com`, `picsum.photos`.
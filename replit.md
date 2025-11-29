# Co-Author Pro

## Overview
Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase, designed to assist authors from concept to completion. It offers AI-driven topic research, blueprint generation, interactive chapter writing, and tools for creating marketing content and bonus materials. The platform features a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog. It leverages Google's Gemini AI via Genkit for all AI operations and Firebase for authentication and data. The UI is built with shadcn/ui and Tailwind CSS. The project aims to provide authoritative, well-researched, and credible writing support, avoiding fabricated information, and includes an administrative panel for centralized management and enhanced security. Key features include an "Offer Workspace" for developing bonus materials, a "Co-Writer" for marketing content generation, and a "Co-Marketer" for creating book offers and sales funnels.

## Recent Changes
- **Co-Writer AI Word Count Compliance**:
  - Added WORD COUNT COMPLIANCE section as HIGHEST PRIORITY in write prompts
  - Tightened tolerance from ±10% to ±5% for more accurate word counts
  - Added concrete examples (500 words = 475-525, 700 words = 665-735, 1000 words = 950-1050)
  - AI instructed to plan content sections before writing to hit target
  - Instructions to add detail if running short, trim if running long
- **Co-Writer AI Code-Mixing and Style Profile Adherence**:
  - All AI writing operations (write, rewrite, expand, extend) now properly follow code-mixing patterns from style profiles
  - Added explicit CODE-MIXING INTEGRITY section to all prompts with examples
  - AI must use code-mixed words NATURALLY without parenthetical translations (e.g., "প্রমোশন" not "প্রমোশন (promotion)")
  - Added WRONG/CORRECT examples to guide proper code-mixing behavior
  - Style profiles marked as CRITICAL with emphasis on matching vocabulary, sentence structures, and tone
  - Added STRUCTURE COMPLIANCE section requiring minimum 4 paragraphs even for short content (500-700 words)
  - Short content no longer collapses into single paragraph - proper structure enforced at all word counts
- **Co-Writer AI Output Structure Improvements**:
  - Updated rewrite and expand prompts with strict structure requirements to prevent single-paragraph output
  - AI now produces properly formatted content with multiple paragraphs, varied lengths, and markdown formatting
  - Added explicit paragraph structure rules: 2-5 sentences per paragraph, blank lines between paragraphs
  - AI uses markdown headings (## and ###) to organize major sections
  - AI uses bullet points and numbered lists where appropriate for clarity
  - Short punchy paragraphs mixed with medium ones for better rhythm and readability
- **Co-Writer Writing Page Improvements**:
  - Added per-paragraph "Extend With AI" buttons that generate NEW content below the paragraph (matching chapter page behavior)
  - Created `/api/co-writer/extend-content` API route for extending paragraphs with new content
  - Created `/api/co-writer/expand-content` API route for expanding entire content
  - Main "Expand" button expands the whole content, while per-paragraph buttons extend with new content below
  - Beautiful content layout with proper markdown rendering:
    - `##` headings render as `<h4>` styled headings
    - `###` headings render as `<h5>` styled headings
    - Bullet lists (`-` or `*`) render as styled `<ul>` lists
    - Numbered lists render as styled `<ol>` lists
    - Regular paragraphs render with proper spacing and typography
  - Word count displayed beside Copy button
  - "View Content" button on saved content ideas page for ideas with existing drafts
- **Part Writing Page Enhancements**:
  - Fixed 404 errors when selecting parts by properly parsing `part-X` format URLs
  - Added `generating` state to PageState for proper state transitions during AI generation
  - Added FloatingCreditWidget to the writing view for credit monitoring
  - Fixed conflicting star exports warning in firebase/index.ts
  - Fixed API field name mismatches for rewrite-section and expand-section calls
  - Added client-side validation to prevent empty content submissions
  - Updated AI prompts with strict section-specific rules (Introduction, Action Steps, Coming Up Next)
- **Rich Text Copy Function**: Matching chapter page pattern with:
  - HTML and plain text clipboard support using ClipboardItem API
  - `##` markdown headings converted to `<h3>` tags
  - `###` markdown headings converted to `<h4>` tags
  - Bullet and numbered lists converted to `<ul>/<ol>` HTML
  - Fallback to plain text when rich text clipboard not supported
- **Subheading Display**: `##` and `###` markdown headings in section content now render as styled subheadings (`<h4>` and `<h5>` elements)
- **AI Context Improvements**: Added storytellingFramework support to:
  - write-offer-section AI flow and API route
  - rewrite-offer-section AI flow and API route
  - All profile selections (style, research, storytelling framework) now properly passed to AI
- **Offer Workspace Restructuring**: Complete restructuring of offer workspace to match co-author workflow:
  - Created dynamic routing structure `/offer-workspace/[projectId]/[offerId]/...`
  - Built OfferWorkflowNavigation component mirroring book workflow navigation
  - Created offer draft page with blueprint generation/editing and master blueprint saving
  - Created offer title generator page (using `/api/offers/generate-titles` API)
  - Created sections list page with grouped sections by parts
  - Section writing page uses offer-specific API routes (`/api/offers/write-section`, `/api/offers/rewrite-section`, `/api/offers/expand-section`) with proper context (styleProfile, researchProfile, blueprintSummary, book context)
- **Offer Credit API Routes**: Added `/api/user/check-offer-credit` and `/api/user/track-offer-creation` API routes for offer credit management
- **Offer API Routes Updated**: Added styleProfile, researchProfile, and storytellingFramework support to write-section and rewrite-section API routes
- **FloatingCreditWidget in Layout**: Moved FloatingCreditWidget to offer-workspace layout for consistent display across all pages
- **Offer Blueprint Schema Fix**: Flattened the Genkit output schema to avoid Gemini's nesting depth limit (max 2 levels). Blueprint parts are now returned as JSON strings and parsed client-side with robust fallback handling.
- **Offer Credits Display**: Added offer credits (with Gift icon) to FloatingCreditWidget and CreditSummaryCard, with progress bars showing usage.
- **Admin Credit Allocation**: CreditAllocator now supports allocating offer credits in addition to word and book credits.

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
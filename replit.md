# Co-Author Pro

## Overview

Co-Author Pro is an AI-powered book writing platform built with Next.js 15 and Firebase. Its purpose is to assist authors from concept to completion through AI-assisted topic research, blueprint generation, and interactive chapter writing. The platform features a hybrid monetization model (PAYG and subscriptions), an affiliate system, and an integrated blog. It leverages Google's Gemini AI via Genkit for all AI operations, Firebase Authentication for user management, and Firestore for data persistence. The UI is built with shadcn/ui and Tailwind CSS. The project aims to provide authoritative, well-researched, and credible writing support, avoiding fabricated information. An administrative panel offers centralized API key management with test-before-save functionality, user management, and global application settings for enhanced security and operational control.

## Recent Changes

### November 26, 2025 - Template-Driven Visual Publish Editor
- **Complete Publish Editor Rebuild**: Replaced TipTap-based text editor with visual template-driven composer
- **Template System**: Four professional templates (Modern, Classic, Minimal, Professional) with predefined typography and styling
- **Visual Preview**: Live preview that mirrors the chapter generation page layout, showing content exactly as it will appear in PDF
- **ChapterPreview Component**: New component that displays chapters with section headers, paragraphs, and proper typography
- **FullBookPreview Component**: Complete book preview including cover, title page, TOC, all chapters, and author bio
- **Template Selector**: Vertical list layout with mini-previews and checkmark indicator for selected template
- **Simplified Controls**: Removed complex TipTap toolbar, replaced with template selection and essential options
- **Single/All Pages View**: Toggle between viewing one chapter at a time or all pages in scrollable view
- **TemplateStyles PDF Integration**: Full mapping of template values to PDF document styles:
  - Page margins (marginTop, marginBottom, marginLeft, marginRight)
  - Spacing (paragraphSpacing, sectionSpacing)
  - Typography (bodyLineHeight, chapterTitleAlign)
  - Colors (pageBackground, accentColor applied to section header borders)
  - Author page, TOC, and title page all use template values
- **Content Parsing Fix**: Updated `parseChapterContent` to correctly handle markdown headers (`## ` and `# `) instead of `$$section$$` markers, preserving all content including prose before first heading
- **PDF Multi-Page Flow**: Long chapters now properly flow across multiple pages in exported PDFs
- **Lazy PDF Generation**: PDF is only generated when user clicks Export button (not during live preview)
  - Uses `pdf().toBlob()` API with dynamic imports for on-demand generation
  - Fonts are registered just-in-time before export with retry support on failures
- **Paginated Visual Preview**: Real PDF-like pages with proper 8.5x11 sizing
  - Content automatically paginated across multiple pages
  - Shows estimated page count per chapter
  - Template styling applied to preview (fonts, colors, spacing)
- **Save/Load Typography Styles**: Custom typography overrides persist to Firestore via `project.publishStyles`
  - Added `PublishStyles` type and `publishStyles` field to Project data model
  - Save button shows "Save Changes" when unsaved, "All Changes Saved" when synced
  - `lastTemplateId` guard prevents saved styles from being overwritten on page reload
  - Only resets to template defaults when user explicitly switches templates
- **Interactive Table of Contents**:
  - Chapter titles are clickable buttons that scroll to the chapter in preview
  - Sub-topics displayed under each chapter with accent-colored bullets
  - Page numbers shown for each chapter using cumulative page count
  - Smooth scroll navigation via element IDs
- **Files Added**: `src/lib/publish/templates.ts`, `src/components/publish/chapter-preview.tsx`, `src/components/publish/template-selector.tsx`, `src/components/publish/paginated-chapter-preview.tsx`, `src/components/publish/lazy-pdf-export.tsx`
- **Files Modified**: `src/app/dashboard/publish/[projectId]/editor/page.tsx`, `src/components/publish/pdf-download-link-inner.tsx`, `src/components/publish/pdf-document.tsx`, `src/lib/publish/fonts.ts`, `src/lib/definitions.ts`

### November 26, 2025 - Google Fonts & Multi-Language Support
- **Google Fonts Integration**: Added 15 Google Fonts with TTF URLs for PDF export
  - **Latin Fonts**: Roboto, Open Sans, Lato, Merriweather, Playfair Display, Noto Sans, Noto Serif, Poppins
  - **Multi-Language Fonts**: Noto Sans Arabic (العربية), Noto Sans Bengali (বাংলা), Noto Sans Devanagari (हिंदी), Noto Sans JP (日本語), Noto Sans KR (한국어), Noto Sans SC (简体中文), Noto Sans Thai (ไทย)
- **Font Registration**: Async font registration with proper loading state before PDF rendering
- **Files Modified**: `src/lib/publish/fonts.ts`

### November 26, 2025 - Author Profile & Book Cover Feature
- **Author Profile Management**: Full CRUD operations for managing multiple author profiles with pen name, bio, credentials, photo, website, and email
- **Author Profile Integration**: Optional author profile selection during project creation and in the publish workflow chapter selection
- **Book Cover Upload**: Upload custom book covers in the PDF editor with image preview and persistence to Firestore
- **Enhanced PDF Export**: 
  - Book cover displayed as full-page first page when uploaded
  - "About the Author" page appended at end of PDF when author profile selected
  - Author photo, bio, credentials, and contact info rendered in styled format
- **Files Added/Modified**: `src/app/dashboard/author-profile/page.tsx`, editor page updates, PDF document enhancements
- **Data Model**: Added `AuthorProfile` type with penName, fullName, bio, credentials, photoUrl, website, email fields

### November 26, 2025 - Publish Module Implementation
- **New Publish Module**: Complete module for exporting book projects as publication-ready PDFs
- **Three-Stage Workflow**: Project list → Chapter selection → PDF editor
- **Rich Text Editor**: TipTap-based editor with full formatting controls (bold, italic, headings, lists, alignment)
- **Styling Panel**: Customizable fonts, colors, and sizes for chapter titles, subtopics, body text, headers, and footers
- **PDF Generation**: @react-pdf/renderer with inline formatting preservation (bold/italic), headers/footers, page numbers
- **Dynamic TOC**: Auto-generated Table of Contents with internal linking based on book outline
- **Content Transformation**: Markdown to HTML conversion with excluded headings (Introduction, Action Steps, Coming Up Next)
- **Files Added**: `src/app/dashboard/publish/*`, `src/components/publish/*`, `src/lib/publish/*`

### November 24, 2025 - Payment and Coupon System Fixes
- **Payment Amount Mismatch Fix**: Resolved "Expected 10, got 1200" error caused by comparing amounts in different currency units (USD vs BDT). Payment validation now properly handles currency conversion with multi-layered fallback logic to determine expected BDT amount.
- **Coupon Validation Fix**: Improved coupon validation with robust timestamp handling supporting all Firestore date formats (Timestamp objects, JSON serialized timestamps, Date objects, strings). Added Firestore indexes for efficient coupon queries and fixed false "expired" errors for coupons without expiration dates.
- **Enhanced Logging**: Added comprehensive diagnostic logging for payment verification and coupon validation to aid debugging.
- **Files Modified**: `src/lib/payment-processor.ts`, `src/app/api/coupon/validate/route.ts`, `firestore.indexes.json`
- **Documentation**: See `PAYMENT_COUPON_FIXES.md` for detailed technical documentation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework**: Next.js 15 with App Router and React Server Components (RSC) for performance and server-side rendering.
**UI Components**: shadcn/ui with Radix UI primitives for accessible and customizable components.
**Styling**: Tailwind CSS with a custom design system, including dark mode support.
**State Management**: React Context API for global state (Firebase services, authentication) and custom hooks for access and error handling.

### Backend

**AI Processing**: Google Genkit with Gemini 2.5 Flash for type-safe AI flows, using Zod for structured input/output schemas. AI functions include topic research, blueprint generation, chapter content, expansion, rewriting, style analysis, and title generation.
**Authentication**: Firebase Authentication with Google OAuth for secure, scalable user management and role-based access control.
**Error Handling**: Global error boundary, event emitter pattern, custom error types, and comprehensive AI flow error handling with user-friendly messages.
**Retry System**: Exponential backoff retry logic for robust AI operation handling.

### Data Storage

**Database**: Cloud Firestore (NoSQL) for real-time syncing and offline support, secured by rules-based access control.
**Data Models**: User, Coupon, Project (with `currentStep` for workflow), ResearchProfile, StyleProfile, and Chapter.
**Workflow**: `currentStep` field in projects manages user progress through the book creation workflow.

### Admin Features

**API Key Management**: Encrypted storage of API keys (AES-256-GCM) in Firestore, with a "test connection" feature for validation. Supports Gemini and OpenAI, with planned Claude integration.
**Admin Authentication**: Secure password hashing (bcrypt), HMAC SHA-256 signed tokens, and dedicated environment variables for security.
**Subscription Management**: Comprehensive credit and subscription tracking, with admin CRUD operations for plans and add-ons. Integrated with Uddoktapay for payments, featuring automatic credit granting and subscription enforcement. Includes configurable credit rollover and dynamic credit calculation based on active plans.
**Currency Management**: Comprehensive multi-currency system supporting USD and BDT. Admin can enable/disable currencies, set default currency, and configure conversion rates (e.g., 1 USD = 125 BDT). All subscription and addon plans use the configured default currency. Payments automatically convert to BDT for Uddoktapay integration (Bangladesh MFS provider that only accepts BDT). FREE_ORDER handling for 100% discount coupons with explicit `isFreeOrder` flag and proper bookkeeping that skips gateway processing while maintaining payment record consistency. Legacy data handling: The system gracefully handles plans with unsupported currencies (e.g., EUR) by returning clear 400-level error messages with remediation guidance instead of 500 errors, ensuring backward compatibility during migration.
**Payment Gateway Integration (Uddoktapay)**: Handles payment initiation, verification, and webhooks. Features auto-approval of successful payments, robust security validations (Firebase ID token, amount validation), and a shared payment processor for consistency. Admin panel for manual approval/rejection.
**Coupon System**: Supports promotional and affiliate coupons with percentage/fixed discounts, validity periods, usage limits, and product scope. Server-side validation during payment creation prevents manipulation, and `CouponUsage` records track redemptions.

## External Dependencies

**AI Services**:
- **Google Gemini AI**: Primary AI model via `@genkit-ai/google-genai` plugin.

**Firebase Services**:
- **Firebase Client SDK**: For Authentication and Firestore.
- **Firebase Admin SDK**: For server-side operations.

**UI Component Libraries**:
- **Radix UI**: Headless components.
- **Lucide React**: Icon library.
- **Recharts**: Charting library.
- **Embla Carousel**: Carousel functionality.

**Utilities**:
- **date-fns**: Date manipulation.
- **react-hook-form**: Form management.
- **@hookform/resolvers**: Schema validation.
- **Zod**: For AI flow schemas.

**Development Tools**:
- **TypeScript**: For type safety.
- **patch-package**: For `node_modules` patches.
- **dotenv**: Environment variable management.

**PDF Generation**:
- **@react-pdf/renderer v4.1+**: Client-side PDF generation with React components
- **Google Fonts**: 8 registered fonts (Roboto, Open Sans, Lato, Merriweather, Playfair Display, Noto Sans, Noto Serif, Poppins)
- **Dynamic imports with SSR disabled**: Required for Next.js compatibility

**Image Hosting**:
- Whitelisted domains: `placehold.co`, `images.unsplash.com`, `picsum.photos`.
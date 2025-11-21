# Admin System Documentation

## Overview

The admin system allows centralized management of API keys, user accounts, and AI routing configuration. Administrators can control whether users need to provide their own API keys or use admin-managed keys for all AI operations.

## Admin Access

### Admin Login
- **URL**: `/admin/login`
- **Credentials**: Stored securely in environment variables
  - Email: `ADMIN_EMAIL`
  - Password: `ADMIN_PASSWORD`

### Admin Panel
- **URL**: `/admin/dashboard`
- **Access**: After logging in, you'll receive a token that's stored in localStorage
- **Navigation**: Accessible via the user menu dropdown (Admin Panel link)

## Features

### 1. Global Settings
Configure how the application handles API keys:
- **Use Admin API Keys**: Enable to use centrally managed API keys for all AI operations
- **Allow User API Keys**: Enable to allow users to provide their own API keys (as fallback or primary)

### 2. API Key Management
Add, update, and manage API keys for multiple AI providers:
- **Supported Providers**:
  - Google Gemini
  - OpenAI (integration pending)
  - Claude/Anthropic (integration pending)
  
- **Features**:
  - Add new API keys with optional model specification
  - Enable/disable API keys
  - Delete API keys
  - Keys are encrypted using AES-256-GCM before storage

### 3. AI Function Routing
Configure which AI provider to use for each AI function:
- Topic Research
- Blueprint Generation
- Title Generation
- Chapter Generation
- Content Rewriting
- Content Expansion
- Style Analysis

Each function can be routed to a different AI provider based on admin configuration.

### 4. User Management
Manage user accounts:
- View all registered users
- Enable/disable user accounts
- Delete user accounts
- View user creation and last login dates

## For Developers

### Using Admin-Managed API Keys in AI Flows

Instead of using `getUserGenkitInstance()` directly, use the new `getGenkitInstanceForFunction()` helper:

```typescript
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import type { AIFunction } from '@/lib/definitions';

// In your AI flow
export async function myAIFlow(userId: string, idToken: string) {
  // Get the appropriate Genkit instance based on admin settings
  const { ai, model } = await getGenkitInstanceForFunction(
    'research' as AIFunction, // Specify the AI function type
    userId,
    idToken
  );
  
  // Use the ai instance as usual
  const result = await ai.generate({
    prompt: "...",
    model: model,
  });
  
  return result;
}
```

### How It Works

1. **Admin Keys Enabled**: System checks admin settings first
2. **Routing Configuration**: Checks if a specific provider is configured for the function
3. **Fallback to User Keys**: If admin keys are not available or disabled, falls back to user-provided keys (if allowed)
4. **Error Handling**: Clear error messages guide users when keys are not configured

### Adding Support for New AI Providers

To add support for additional AI providers (OpenAI, Claude, etc.):

1. Update the `createGenkitInstance` function in `src/lib/genkit-admin.ts`
2. Add the appropriate Genkit plugin import
3. Configure the plugin with the API key
4. Add the provider to the admin panel UI options

## Security

- Admin credentials are stored as environment variables
- API keys are encrypted using AES-256-GCM before database storage
- Admin tokens expire after 24 hours
- All admin API routes require valid authentication token

## Database Collections

The admin system uses these Firestore collections:
- `adminSettings` (document: 'global'): Global configuration
- `adminAPIKeys`: Encrypted API keys for different providers

## API Routes

### Public Routes (No Authentication Required)
- `GET /api/settings/public`: Get public admin settings (useAdminKeys, allowUserKeys)

### Admin Routes (Require Authentication)
- `POST /api/admin/login`: Admin authentication
- `GET /api/admin/settings`: Get full admin settings (admin only)
- `PUT /api/admin/settings`: Update global settings (admin only)
- `GET /api/admin/api-keys`: List all API keys (sanitized, admin only)
- `POST /api/admin/api-keys`: Add/update API key (admin only)
- `DELETE /api/admin/api-keys`: Delete API key (admin only)
- `PATCH /api/admin/api-keys`: Toggle API key active status (admin only)
- `GET /api/admin/users`: List all users (admin only)
- `PATCH /api/admin/users`: Enable/disable user (admin only)
- `DELETE /api/admin/users`: Delete user account (admin only)

## Important Security Notes

1. **Server-Side Only**: The `getGenkitInstanceForFunction` helper and `genkit-admin.ts` module must ONLY be imported in server-side code (API routes, Server Components, Server Actions). The module includes a client-side check that throws an error if accidentally bundled for the browser.

2. **Required Environment Variables**:
   - `ENCRYPTION_KEY`: Required for admin token generation and API key encryption. The system will throw an error if this is not configured.
   - `ADMIN_EMAIL`: Admin login email
   - `ADMIN_PASSWORD`: Admin login password

3. **Token Expiration**: Admin authentication tokens expire after 24 hours for security.

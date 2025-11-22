# Security Setup Guide

## Admin Password Security

### Overview

The admin authentication system uses bcrypt for secure password hashing. The system is backwards compatible, supporting both bcrypt-hashed and plain text passwords to allow for gradual migration.

### Initial Setup

1. **Generate a Bcrypt Hash for Your Password**

You can generate a bcrypt hash using Node.js:

```javascript
const bcrypt = require('bcryptjs');
const password = 'your-secure-password-here';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

Or use this quick script in the Replit Shell:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD_HERE', 10));"
```

2. **Update Environment Variables**

Set the required environment variables:

- `ADMIN_EMAIL`: Your admin email address (environment variable)
- `ADMIN_PASSWORD`: The bcrypt hash (starts with `$2a$`, `$2b$`, or `$2y$`) (environment variable)
- `ADMIN_TOKEN_SECRET`: **Required** - Dedicated secret for HMAC token signing (secret)
- `ENCRYPTION_KEY`: Secret for AES data encryption of API keys (secret)

### Environment Variable Setup

**Critical Security Variables:**

1. `ADMIN_TOKEN_SECRET` (Secret) - **REQUIRED** - Dedicated secret for HMAC token signing
   - **CRITICAL**: Must be completely separate from `ENCRYPTION_KEY` to prevent key reuse attacks
   - Use a cryptographically secure random string (minimum 32 characters)
   - **This is mandatory** - the system will fail hard if not set
   - Never reuse this secret for any other purpose

2. `ENCRYPTION_KEY` (Secret) - Used for AES data encryption (API keys, etc.)
   - **CRITICAL**: Must be completely separate from `ADMIN_TOKEN_SECRET`
   - Use a different cryptographically secure random string (minimum 32 characters)
   - Only used for encrypting stored data, never for token signing

**For Development:**
You can set these in the Replit Secrets tab or via the environment variables panel.

**For Production:**
Make sure to set these as environment variables in your deployment environment.

**Generating Secure Secrets:**
```bash
# Generate a secure random secret (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Best Practices

1. **Always Use Bcrypt-Hashed Passwords**
   - Plain text passwords are supported only for migration purposes
   - The system logs a warning when plain text passwords are detected
   - Update to bcrypt as soon as possible

2. **Strong Password Requirements**
   - Use at least 12 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Don't reuse passwords from other services

3. **Separate Signing and Encryption Secrets**
   - `ADMIN_TOKEN_SECRET` for token signing (HMAC)
   - `ENCRYPTION_KEY` for data encryption (AES)
   - Never reuse the same secret for both purposes
   - Use cryptographically secure random strings (minimum 32 characters)

4. **Token Security Features**
   - Admin tokens expire after 24 hours
   - Each token includes a random nonce to prevent replay attacks
   - Tokens are signed with HMAC SHA-256
   - Token format: `base64(email:timestamp:nonce:signature)`
   - Nonces are 16 random bytes, making tokens unpredictable

5. **Rate Limiting (Recommended)**
   - Implement rate limiting on `/api/admin/login` endpoint
   - Suggested limits: 5 failed attempts per IP/email per 15 minutes
   - Use exponential backoff for repeated failures
   - Consider IP-based and email-based lockouts

### Migration from Plain Text

If you currently have a plain text password:

1. Generate a bcrypt hash using the method above
2. Replace `ADMIN_PASSWORD` environment variable with the hash
3. Restart the application
4. The system will automatically detect and use bcrypt verification

### Troubleshooting

**"Admin credentials not configured" error:**
- Ensure both `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables are set

**"Invalid or expired token" error:**
- Token has expired (24 hours) - log in again
- Token signature is invalid - check that `ENCRYPTION_KEY` hasn't changed
- Token was tampered with - re-authenticate

**"ADMIN_TOKEN_SECRET environment variable is not set" error:**
- `ADMIN_TOKEN_SECRET` is **required** and must be configured as a secret
- Generate a new cryptographically secure secret (see command above)
- This must be different from `ENCRYPTION_KEY`
- Restart the application after adding the secret
- **There is no fallback** - this is intentional for security

**Token format changed / old tokens invalid:**
- Tokens now include a random nonce for replay protection
- Old tokens (without nonce) will be rejected
- Users must re-authenticate after this security update

### Testing Authentication

To verify your setup:

1. Navigate to `/admin/login`
2. Enter your admin email and password
3. If successful, you'll receive a token and be redirected to the admin dashboard
4. Check the console for any security warnings about plain text passwords

## API Route Security

All admin API routes are protected with:

1. **Token Verification**: Every request must include `Authorization: Bearer <token>` header
2. **Token Validation**: Tokens are verified for authenticity, expiration, and correct admin email
3. **Centralized Authentication**: `getAuthToken()` and `verifyAdminToken()` from `src/lib/admin-auth.ts`

### Protected Admin Routes

- `/api/admin/subscription-plans` - Subscription plan management
- `/api/admin/addon-credit-plans` - Credit addon management
- `/api/admin/allocate-credits` - Manual credit allocation
- `/api/admin/users` - User management
- `/api/admin/api-keys` - API key management
- `/api/admin/settings` - Application settings

## Payment Integration Security

### Stripe Integration (Optional)

The application supports Stripe for payment processing but requires setup:

1. **Using Replit's Stripe Integration:**
   - Provides automatic API key management
   - Handles webhook signature verification
   - Recommended for production use

2. **Manual Stripe Setup:**
   - Set `STRIPE_SECRET_KEY` as a secret
   - Set `STRIPE_PUBLISHABLE_KEY` as an environment variable
   - Configure webhook endpoint at `/api/webhooks/stripe`
   - Set `STRIPE_WEBHOOK_SECRET` for webhook verification

**Note:** Payment integration is currently using placeholder UI. To enable real payments, you need to set up Stripe and implement the payment flow.

## Best Practices Summary

1. ✅ Use bcrypt-hashed passwords for admin authentication
2. ✅ Store all sensitive credentials as secrets
3. ✅ Use HTTPS in production
4. ✅ Regularly rotate encryption keys and API keys
5. ✅ Monitor authentication logs for suspicious activity
6. ✅ Keep dependencies updated for security patches
7. ✅ Implement rate limiting on authentication endpoints (future enhancement)
8. ✅ Use Content Security Policy headers (future enhancement)

## Recent Security Improvements (November 2025)

1. ✅ **Separate signing and encryption secrets** - `ADMIN_TOKEN_SECRET` for tokens, `ENCRYPTION_KEY` for data
2. ✅ **Replay attack prevention** - Random nonce in each token
3. ✅ **Bcrypt password hashing** - Industry-standard password protection
4. ✅ **Centralized authentication** - Single source of truth for auth logic

## Future Security Enhancements

- [ ] **Rate limiting on admin login endpoint** (HIGH PRIORITY)
  - Implement per-IP and per-email throttling
  - Suggested library: `express-rate-limit` or similar
  - Configuration: 5 attempts per 15 minutes
- [ ] **Session management** - Server-side session storage with Redis or database
- [ ] **Two-factor authentication (2FA)** for admin users
- [ ] **IP whitelisting** for admin access
- [ ] **Audit logging** for all admin actions with timestamps and IP addresses
- [ ] **Automated security scanning** and dependency updates
- [ ] **Content Security Policy (CSP)** headers
- [ ] **CSRF protection** for state-changing operations

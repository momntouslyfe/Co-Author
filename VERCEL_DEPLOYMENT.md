# Vercel Deployment Guide

## Required Environment Variables

For the application to work properly on Vercel, you **must** configure the following environment variables:

### 1. ENCRYPTION_KEY (CRITICAL)
**Purpose:** Encrypts user API keys before storing them in Firestore

**Value:** `2b6942bb65e86c8465e2ae134694e74c285eccfe90cafd992b3e94f656d38d11`

**How to Add:**
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add variable:
   - Name: `ENCRYPTION_KEY`
   - Value: (the key above)
   - Environments: Production, Preview, Development
4. Save and redeploy

⚠️ **NEVER CHANGE THIS KEY** - Changing it will make all existing encrypted user API keys unreadable, and users will lose access to their saved keys.

### 2. Firebase Configuration
Make sure all your Firebase environment variables are also set on Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Firebase Admin SDK
If using Firebase Admin (server-side):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (make sure to preserve line breaks with `\n`)

## Deployment Steps

1. **Set Environment Variables** (as described above)
2. **Deploy from GitHub**
   - Connect your GitHub repository to Vercel
   - Vercel will auto-deploy on every push to main
3. **Verify Deployment**
   - Test user registration/login
   - Test saving API keys in Settings
   - Test AI features

## Common Issues

### Issue: Users can't save API keys (500 error)
**Solution:** ENCRYPTION_KEY is missing. Add it to Vercel environment variables.

### Issue: Firebase errors
**Solution:** Check all Firebase environment variables are set correctly.

### Issue: Changes not reflecting
**Solution:** Redeploy from Vercel dashboard or push a new commit.

## Security Checklist

✅ ENCRYPTION_KEY is set in Vercel (not in code)
✅ Firebase credentials are environment variables (not in code)
✅ All secrets are in environment variables (not committed to git)
✅ .env files are in .gitignore

## Support

If you encounter deployment issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure database (Firestore) is accessible from Vercel's IP range

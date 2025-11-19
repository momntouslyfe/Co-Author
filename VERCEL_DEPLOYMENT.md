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

### 3. Firebase Admin SDK (REQUIRED)
The app REQUIRES Firebase Admin SDK credentials to save user data. You have two options:

**Option A: Use full service account JSON (Recommended):**
- `FIREBASE_SERVICE_ACCOUNT` = entire service account JSON

**Option B: Use individual credentials:**
- `FIREBASE_PROJECT_ID` = your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` = service account email
- `FIREBASE_PRIVATE_KEY` = service account private key (preserve `\n` line breaks)

**How to get service account credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Settings (⚙️) → Project Settings → Service Accounts tab
4. Click "Generate New Private Key"
5. Download the JSON file
6. Copy the entire JSON content to `FIREBASE_SERVICE_ACCOUNT` on Vercel

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
**Cause 1:** ENCRYPTION_KEY is missing
**Solution:** Add `ENCRYPTION_KEY` to Vercel environment variables

**Cause 2:** Firebase Admin credentials missing (Error: "Firebase: Need to provide options")
**Solution:** Add `FIREBASE_SERVICE_ACCOUNT` with your service account JSON from Firebase Console

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

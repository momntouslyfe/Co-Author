# Co-Author Pro - Deployment Instructions

This package contains all the files needed to deploy Co-Author Pro on your own server.

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- A Firebase project with Authentication and Firestore enabled
- Google Gemini API key

## Deployment Steps

### 1. Extract Files

Extract the deployment archive to your server:

```bash
tar -xzf co-author-pro-deployment.tar.gz
cd co-author-pro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create or update the `.env` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Firebase Configuration

Update `src/firebase/config.ts` with your Firebase project credentials if different from the current ones.

### 5. Build the Application

```bash
npm run build
```

This will create an optimized production build in the `.next` directory.

### 6. Start the Production Server

```bash
npm run start
```

The server will start on port 5000 by default.

## Deployment Options

### Option 1: Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the app with PM2
pm2 start npm --name "co-author-pro" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
```

### Option 2: Using Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t co-author-pro .
docker run -p 5000:5000 --env-file .env co-author-pro
```

### Option 3: Using a Reverse Proxy (Nginx)

Configure Nginx to proxy requests to your Next.js app:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Firebase Setup

### Google OAuth Configuration

Add these authorized redirect URIs in your Google Cloud Console:

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Under **Authorized JavaScript Origins**, add:
   - `https://yourdomain.com`
   - Your Firebase auth domain

4. Under **Authorized Redirect URIs**, add:
   - `https://yourdomain.com/__/auth/handler`
   - `https://your-firebase-project.firebaseapp.com/__/auth/handler`

### Firebase Console Settings

1. Go to Firebase Console > Authentication > Sign-in method
2. Under **Authorized domains**, add:
   - `yourdomain.com`

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| GEMINI_API_KEY | Google Gemini API key for AI features | Yes |
| NODE_ENV | Set to 'production' for production deployments | Recommended |

## Port Configuration

The app is configured to run on port 5000. To change this:

1. Update `package.json` scripts:
   - `dev`: Change `-p 5000` to your desired port
   - `start`: Change `-p 5000` to your desired port

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

### Firebase Connection Issues

- Verify your Firebase credentials in `src/firebase/config.ts`
- Check that Firestore and Authentication are enabled in Firebase Console
- Ensure your server's IP is not blocked by Firebase

### API Key Issues

- Verify GEMINI_API_KEY is correctly set in `.env`
- Check that the API key is valid and has the necessary permissions
- Ensure `.env` file is in the root directory

## Security Considerations

1. **Never commit `.env` to version control** in production environments
2. Use environment variables or secret management for sensitive data
3. Enable HTTPS for production deployments
4. Set up proper CORS policies
5. Configure Firebase security rules appropriately

## Monitoring and Logs

To monitor your application:

```bash
# With PM2
pm2 logs co-author-pro

# Or follow the logs
pm2 logs co-author-pro --lines 100
```

## Support

For issues specific to Co-Author Pro functionality, check the codebase documentation in `replit.md`.

For Next.js deployment issues, refer to: https://nextjs.org/docs/deployment

---

**Last Updated:** November 14, 2025

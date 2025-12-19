# Environment Variables Setup Guide

This guide explains how to set up all environment variables needed for the Stitch application.

## Quick Start

1. Copy the example files to create your `.env` files
2. Fill in your API keys and secrets
3. Restart the services

## Environment Files

### AI Service (`ai-service/.env`)

Create `ai-service/.env` with:

```bash
# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL=postgresql://stitch:stitch_dev_password@localhost:5432/stitch

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# File Upload Settings
MAX_UPLOAD_SIZE_MB=50
ALLOWED_FILE_TYPES=.pdf

# AI Settings
AI_MODEL=gpt-4-turbo-preview
AI_TEMPERATURE=0.3

# Feature Flags
ENABLE_OCR=true
```

### Backend (`backend/.env`)

Create `backend/.env` with:

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://stitch:stitch_dev_password@localhost:5432/stitch

# JWT Secrets (generate strong random strings)
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# OAuth - Apple
APPLE_CLIENT_ID=your_apple_client_id_here
APPLE_TEAM_ID=your_apple_team_id_here
APPLE_KEY_ID=your_apple_key_id_here
APPLE_PRIVATE_KEY=your_apple_private_key_here
APPLE_REDIRECT_URI=http://localhost:3001/api/auth/apple/callback

# CORS
CORS_ORIGIN=http://localhost:5173

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# AI Service
AI_SERVICE_URL=http://localhost:8001

# Email (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_FROM=noreply@stitch.app
```

### Frontend (`frontend/.env`)

Create `frontend/.env` with:

```bash
# API URL
VITE_API_URL=http://localhost:3001/api

# OAuth - Google
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# AI Service (for direct frontend calls if needed)
VITE_AI_SERVICE_URL=http://localhost:8001

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

## Getting API Keys

### Required vs Optional

**Required for core features:**
- ✅ OpenAI API Key (for AI pattern parsing and generation)
- ✅ JWT Secrets (for authentication)
- ✅ Database URL (for data storage)

**Optional (can skip for development):**
- ⚠️ Google OAuth (nice to have, but not required)
- ⚠️ Apple OAuth (requires $99/year Apple Developer Program - can skip)

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to `ai-service/.env` as `OPENAI_API_KEY`

**Note:** You'll need to add billing information to use the API. The API charges per token used.

### Google OAuth (Optional)

**Note:** Google OAuth is optional. You can use email/password authentication without it.

If you want to enable Google Sign-In:

1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
   - For production: Add your production URL
6. Copy the Client ID and Client Secret
7. Add to `backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
8. Add the Client ID to `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`

**Free to use:** Google OAuth is free for development and production use.

### Apple OAuth (Sign in with Apple for Web)

✅ **Yes, Apple authentication works in web apps!** Apple provides "Sign in with Apple" for both native apps and web applications.

⚠️ **Requirement:** You need an **Apple Developer Program membership** ($99/year) to use Sign in with Apple for web applications.

**Note:** Sign in with Apple is optional. You can skip this if you only want to use email/password and Google OAuth.

#### How it works for web apps:

1. **Service ID**: You create a Service ID (not an App ID) for your web application
2. **JavaScript SDK**: Apple provides a JavaScript SDK that you can use in your web app
3. **Backend Verification**: Your backend verifies the identity token from Apple
4. **User Experience**: Users see a popup/modal from Apple to sign in, similar to Google OAuth

#### Setup Steps:

If you have an Apple Developer account:

1. Go to https://developer.apple.com/account/
2. Navigate to "Certificates, Identifiers & Profiles"
3. **Create a Service ID:**
   - Click "Identifiers" → "+" → "Services IDs"
   - Register a new Service ID (e.g., `com.yourcompany.stitch.web`)
   - Enable "Sign in with Apple"
   - Configure: Add your domain and redirect URLs
     - Domains: `localhost` (for dev), `yourdomain.com` (for production)
     - Return URLs: `http://localhost:3001/api/auth/apple/callback` (dev), `https://yourdomain.com/api/auth/apple/callback` (prod)
4. **Create a Key:**
   - Go to "Keys" → "+"
   - Name it (e.g., "Sign in with Apple Key")
   - Enable "Sign in with Apple"
   - Download the key (.p8 file) - **you can only download it once!**
5. **Get your Team ID:**
   - Found in the top right of Apple Developer portal (under your name/company)
6. Add to `backend/.env`:
   - `APPLE_CLIENT_ID`: Your Service ID (e.g., `com.yourcompany.stitch.web`)
   - `APPLE_TEAM_ID`: Your Team ID
   - `APPLE_KEY_ID`: Your Key ID (from the key you created)
   - `APPLE_PRIVATE_KEY`: Contents of the .p8 file (keep this secure!)

#### Frontend Implementation:

The frontend uses Apple's JavaScript SDK. The button is already implemented in the login/register pages. It will work once you:
1. Have the Apple Developer account set up
2. Have configured the Service ID and redirect URLs
3. Have added the credentials to your `.env` file

**For Development:** You can develop and test the app without Apple OAuth. The login page will show the Apple button, but it will only work once you've set up the Apple Developer account and configured the credentials.

**Resources:**
- [Apple's Sign in with Apple for Web Documentation](https://developer.apple.com/sign-in-with-apple/get-started/)
- [Apple's JavaScript SDK](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js)

### JWT Secrets

Generate strong random strings for JWT secrets:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the generated strings to:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

## Security Notes

⚠️ **Never commit `.env` files to version control!**

- All `.env` files are in `.gitignore`
- Use different secrets for development and production
- Rotate secrets regularly in production
- Use environment-specific values (dev, staging, prod)

## Testing the Setup

After setting up your environment variables:

1. **Test AI Service:**
   ```bash
   cd ai-service
   python -c "from app.config import settings; print('OpenAI Key:', 'Set' if settings.openai_api_key else 'Missing')"
   ```

2. **Test Backend:**
   ```bash
   cd backend
   yarn dev
   # Check console for any missing environment variable warnings
   ```

3. **Test Frontend:**
   ```bash
   cd frontend
   yarn dev
   # Check browser console for any API connection errors
   ```

## Production Setup

For production:

1. Use a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
2. Set environment variables in your hosting platform
3. Use different database credentials
4. Enable HTTPS
5. Update CORS origins to your production domain
6. Use stronger JWT secrets
7. Enable rate limiting
8. Set up monitoring and logging

## Troubleshooting

### "OpenAI API key not configured"
- Check that `OPENAI_API_KEY` is set in `ai-service/.env`
- Restart the AI service after adding the key

### "Google OAuth not working"
- Verify the redirect URI matches exactly
- Check that the Client ID is set in both backend and frontend `.env` files
- Ensure Google+ API is enabled in Google Cloud Console

### "JWT errors"
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Ensure they are different from each other
- Restart the backend after changing secrets

### "Database connection failed"
- Check that PostgreSQL is running: `docker ps`
- Verify `DATABASE_URL` matches your database credentials
- Ensure the database exists: `psql -U stitch -d stitch -c "SELECT 1"`


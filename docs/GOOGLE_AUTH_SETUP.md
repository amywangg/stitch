# Google OAuth Setup Guide

Quick guide to set up Google Sign-In for the Stitch app.

## Prerequisites

- Google account
- Access to Google Cloud Console (free)

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Enter project name: "Stitch App" (or your preferred name)
4. Click "Create"

### 2. Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace account)
3. Fill in the required information:
   - **App name**: Stitch
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click "Save and Continue"
5. On "Scopes" page, click "Save and Continue" (no need to add scopes for basic sign-in)
6. On "Test users" page (if in testing mode), you can add test users or skip
7. Click "Save and Continue" → "Back to Dashboard"

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure the consent screen first (see step 2)
4. Choose **Application type**: **Web application**
5. Enter a name: "Stitch Web Client"
6. **Authorized JavaScript origins**:
   - `http://localhost:5173` (for development)
   - Add your production URL when ready (e.g., `https://stitch.app`)
7. **Authorized redirect URIs**:
   - `http://localhost:3001/api/auth/google/callback` (for development)
   - Add your production URL when ready (e.g., `https://api.stitch.app/api/auth/google/callback`)
8. Click **"CREATE"**

### 4. Copy Your Credentials

After creating the OAuth client, you'll see:
- **Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

⚠️ **Important**: Keep the Client Secret secure! Never commit it to version control.

### 5. Add to Environment Variables

#### Backend (`backend/.env`)

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

#### Frontend (`frontend/.env`)

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

**Note**: Only the Client ID goes in the frontend. The Client Secret stays on the backend.

### 6. Restart Your Services

After adding the environment variables:

```bash
# Stop your services (Ctrl+C)
# Then restart:

# Backend
cd backend
yarn dev

# Frontend
cd frontend
yarn dev
```

### 7. Test Google Sign-In

1. Go to http://localhost:5173/login
2. Click "Sign in with Google"
3. You should see the Google sign-in popup
4. Sign in with your Google account
5. You should be redirected to the home page

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

- Make sure the redirect URI in your `.env` matches exactly what's in Google Cloud Console
- Check for trailing slashes, `http` vs `https`, etc.
- The redirect URI should be: `http://localhost:3001/api/auth/google/callback`

### "Google sign-in button not showing"

- Check that `VITE_GOOGLE_CLIENT_ID` is set in `frontend/.env`
- Make sure you've restarted the frontend dev server
- Check browser console for errors

### "Invalid client" error

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct in `backend/.env`
- Make sure there are no extra spaces or quotes
- Restart the backend server

### "OAuth consent screen not configured"

- Complete the OAuth consent screen setup (Step 2)
- Make sure you've saved all the required information

## Production Setup

When deploying to production:

1. **Update OAuth Consent Screen**:
   - Add your production domain
   - Submit for verification if needed (for public apps)

2. **Update Authorized Origins**:
   - Add your production frontend URL (e.g., `https://stitch.app`)

3. **Update Redirect URIs**:
   - Add your production backend URL (e.g., `https://api.stitch.app/api/auth/google/callback`)

4. **Update Environment Variables**:
   - Use production URLs in your production `.env` files

## Security Notes

- ✅ Client ID can be public (it's in your frontend code)
- ❌ Client Secret must stay secret (backend only)
- ✅ Use HTTPS in production
- ✅ Keep your `.env` files out of version control (they're already in `.gitignore`)

## Next Steps

Once Google OAuth is working:
- Test creating a new account with Google
- Test logging in with an existing Google account
- Test linking Google account to existing email/password account



# OAuth Setup Guide

This guide explains how to set up Google and Apple OAuth for Stitch.

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Apple Sign In
VITE_APPLE_CLIENT_ID=com.yourapp.stitch
```

### Backend (`backend/.env`)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign In
APPLE_CLIENT_ID=com.yourapp.stitch
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "Stitch" or similar

### 2. Enable Google+ API

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API" 
3. Enable it

### 3. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure consent screen first if prompted:
   - User Type: External
   - App name: Stitch
   - User support email: your email
   - Add scopes: email, profile, openid
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Stitch Web Client
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:5173` (development)
     - `https://yourdomain.com` (production)

### 4. Copy Credentials

- Copy the **Client ID** to both frontend and backend `.env` files
- Copy the **Client Secret** to backend `.env` file

---

## Apple Sign In Setup

### 1. Apple Developer Account

You need an [Apple Developer Account](https://developer.apple.com/programs/) ($99/year)

### 2. Create App ID

1. Go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** > **+** button
3. Select **App IDs** > Continue
4. Select **App** > Continue
5. Enter:
   - Description: Stitch
   - Bundle ID: `com.yourcompany.stitch`
6. Enable **Sign in with Apple** capability
7. Click Continue > Register

### 3. Create Service ID (for web)

1. Click **Identifiers** > **+** button
2. Select **Services IDs** > Continue
3. Enter:
   - Description: Stitch Web
   - Identifier: `com.yourcompany.stitch.web`
4. Enable **Sign in with Apple**
5. Configure:
   - Primary App ID: Select your app ID
   - Domains: `yourdomain.com`, `localhost`
   - Return URLs: 
     - `http://localhost:5173/auth/apple/callback`
     - `https://yourdomain.com/auth/apple/callback`
6. Click Save > Continue > Register

### 4. Create Key

1. Go to **Keys** > **+** button
2. Enter key name: "Stitch Sign In Key"
3. Enable **Sign in with Apple**
4. Configure: Select your primary App ID
5. Click Continue > Register
6. **Download the key file** (you can only download once!)
7. Note the **Key ID**

### 5. Get Team ID

Your Team ID is in the top right of the Apple Developer portal, or in **Membership** details.

### 6. Configure Backend

Add to backend `.env`:

```env
APPLE_CLIENT_ID=com.yourcompany.stitch.web  # Service ID
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...rest of key...\n-----END PRIVATE KEY-----"
```

---

## Testing OAuth

### Development Testing

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Visit `http://localhost:5173`
4. Click "Continue with Google" or "Continue with Apple"

### Google Test Users

During development (before app verification), only test users can sign in:
1. Go to Google Cloud Console > **OAuth consent screen**
2. Add test users under **Test users**

### Apple Sandbox

Apple Sign In works in development, but for production:
1. Your app must be submitted for review
2. Domain must be verified

---

## Troubleshooting

### Google: "Error 400: redirect_uri_mismatch"

- Ensure redirect URI in Google Console exactly matches your app URL
- Check for trailing slashes
- Wait 5-10 minutes after adding new URIs

### Apple: "Invalid client_id"

- Ensure you're using the **Service ID** (not App ID) for web
- Check that Sign in with Apple is enabled for the Service ID

### "popup_blocked" errors

- Ensure you're calling OAuth from a user gesture (click event)
- Check browser popup blockers

---

## Security Notes

1. **Never commit secrets** - Use `.env` files and add to `.gitignore`
2. **Validate tokens server-side** - Never trust client-only validation
3. **Use HTTPS in production** - OAuth requires secure origins
4. **Rotate secrets periodically** - Especially if exposed

---

## Database Schema

OAuth accounts are stored in `user_oauth_accounts`:

```sql
CREATE TABLE user_oauth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50),      -- 'google', 'apple'
  provider_user_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

This allows users to:
- Link multiple OAuth providers to one account
- Sign in with any linked provider
- Unlink providers from settings

---

## Resources

- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [Apple Sign In Web](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- [apple-signin-auth](https://www.npmjs.com/package/apple-signin-auth)



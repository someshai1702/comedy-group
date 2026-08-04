# Firebase Cloud Messaging Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Comedy Group app.

## Prerequisites

1. A Firebase project ([Create one here](https://console.firebase.google.com/))
2. Node.js and npm installed (for generating VAPID keys)

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "Comedy Group Notifications")
4. Disable Google Analytics if you don't need it, or keep it enabled
5. Click "Create project"

---

## Step 2: Add a Web App to Firebase

1. In your Firebase project, click the gear icon → Project settings
2. Scroll down to "Your apps" section
3. Click the Web icon (`</>`)
4. Register your app with a nickname (e.g., "Comedy Group Web")
5. Copy the Firebase configuration object

---

## Step 3: Get Your Firebase Config

You'll need these values from Firebase:

```javascript
{
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

**Update these files with your Firebase config:**

1. `/public/firebase-messaging-sw.js` - Line 7
2. `/src/hooks/usePushNotifications.ts` - Line 8

---

## Step 4: Generate VAPID Keys

VAPID keys are required for Web Push notifications. Generate them using Node.js:

```bash
# Create a temporary directory
mkdir fcm-keys && cd fcm-keys

# Initialize npm and install web-push
npm init -y
npm install web-push

# Generate keys
npx web-push generate-vapid-keys
```

You'll get output like:

```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
yD5hX3nK8qR7mT2wP9vL4sN6jG1cF8bA5dE2hR0kZ7uW4

=========================================
```

**Important:** Save these keys securely! The private key should never be committed to version control.

---

## Step 5: Add VAPID Keys to Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project → Settings → Environment Variables
3. Add these variables:

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | Your generated public key |
| `VAPID_PRIVATE_KEY` | Your generated private key |

---

## Step 6: Enable Cloud Messaging in Firebase

1. In Firebase Console, go to Messaging in the left sidebar
2. Click "Create your first campaign" (or skip if already done)
3. Under "Messaging", click "Settings" (gear icon)
4. Scroll to "Web configuration"
5. Add your VAPID public key in the "Web Push certificates" tab
6. Click "Save"

---

## Step 7: Update Code Files

### Update Firebase Config

In `/public/firebase-messaging-sw.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

In `/src/hooks/usePushNotifications.ts`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

Also update the VAPID key in both files:
```javascript
vapidKey: "YOUR_VAPID_PUBLIC_KEY"
```

---

## Step 8: Deploy and Test

1. Push your changes to GitHub
2. Wait for Vercel to deploy
3. Open the app in your browser
4. Log in as any family
5. Click "Enable" next to Push Notifications
6. Allow the notification permission prompt
7. Create a new event (as an admin)
8. You should receive a push notification!

---

## Troubleshooting

### "Push permission denied"

The user has blocked notifications in their browser. They need to:
1. Click the lock/info icon in the browser's address bar
2. Go to "Notifications" settings
3. Allow notifications for the site

### "Service worker registration failed"

Make sure:
1. HTTPS is enabled (required for service workers)
2. The service worker file exists at `/public/firebase-messaging-sw.js`
3. Clear browser cache and try again

### "Invalid VAPID key"

1. Make sure the VAPID public key in your code matches the one in Firebase Console
2. Regenerate keys if needed: `npx web-push generate-vapid-keys`

### "Notifications not appearing"

1. Check browser DevTools → Application → Service Workers
2. Check DevTools → Console for errors
3. Check DevTools → Network for failed FCM requests

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Push   │────▶│   FCM API  │
│  (Browser)  │◀────│  Endpoint   │◀────│  (Google)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │  1. Subscribe & save token            │
      │  2. Event created                     │
      │                                       │
      └───────────────────────────────────────┘
                    3. Send notification
```

### Flow:
1. **Subscription**: User clicks "Enable" → Browser requests permission → Service worker subscribes → Token saved to API
2. **Event Created**: Admin creates event → API receives POST → Creates in-app notification + Calls FCM API
3. **Push Delivery**: FCM sends push to browser → Service worker shows notification

---

## Security Notes

- Never commit VAPID private keys to version control
- Use environment variables for all secrets
- The VAPID public key can be safely exposed in client-side code
- Rate limit your `/api/push` endpoint to prevent abuse

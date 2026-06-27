// Firebase configuration
// To set up push notifications:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project or use existing one
// 3. Add a Web app in Project Settings
// 4. Copy the config values below
// 5. Generate VAPID keys using: npx web-push generate-vKeys

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// VAPID keys - Required for web push
// Run: npx web-push generate-vKeys
export const VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY";

export const isConfigured = (): boolean => {
  return !firebaseConfig.apiKey.includes("YOUR_");
};

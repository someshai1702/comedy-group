// Firebase configuration
// Comedy Group Planner - comedy-group-project

export const firebaseConfig = {
  apiKey: "AIzaSyBbKwHnN6Em2K_16-4oY2xtgmBxml8R4Lo",
  authDomain: "comedy-group-project.firebaseapp.com",
  projectId: "comedy-group-project",
  storageBucket: "comedy-group-project.firebasestorage.app",
  messagingSenderId: "841868646390",
  appId: "1:841868646390:web:cb41e7892ab8ddbc4759d7"
};

// VAPID keys for web push notifications (from Firebase Console)
export const VAPID_PUBLIC_KEY = "BBpGh0AzhMCqEIb7nc9qbIakcQc662UG4pu8H5PSiF2TR8WKoiwiw0QkUfOpmaT6Vk0qo1zkMcqLS5X-h2coRnE";

// Firebase Sender ID (same as messagingSenderId)
export const FIREBASE_SENDER_ID = "841868646390";

export const isConfigured = (): boolean => {
  return !firebaseConfig.apiKey.includes("YOUR_") && !VAPID_PUBLIC_KEY.includes("YOUR_");
};

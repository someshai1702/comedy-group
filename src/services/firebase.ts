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

// VAPID keys for web push notifications
export const VAPID_PUBLIC_KEY = "BDiG4S4Sod4ysuEUoaxjCYVbvpPejQLyUKx_BpGB_82ptF4LbLKAm2_a8R_U1AyoCBfxLVRUakANcHCZ_3thYtA";

export const isConfigured = (): boolean => {
  return !firebaseConfig.apiKey.includes("YOUR_") && !VAPID_PUBLIC_KEY.includes("YOUR_");
};

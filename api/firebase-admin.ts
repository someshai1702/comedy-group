import * as admin from 'firebase-admin';

// Firebase Admin SDK configuration
// Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables in Vercel

let firebaseInitialized = false;

export function initializeFirebase(): boolean {
  if (firebaseInitialized) {
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "comedy-group-project";
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@comedy-group-project.iam.gserviceaccount.com";

  if (!projectId || !privateKey || !clientEmail) {
    console.warn("[Firebase] Environment variables not configured. Push notifications will use Web Push fallback.");
    console.warn("[Firebase] Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL");
    return false;
  }

  try {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail: clientEmail,
      }),
    });

    firebaseInitialized = true;
    console.log("[Firebase] Admin SDK initialized successfully");
    return true;
  } catch (error) {
    console.error("[Firebase] Failed to initialize:", error);
    return false;
  }
}

export function isFirebaseConfigured(): boolean {
  return firebaseInitialized;
}

// Send push notification via Firebase Cloud Messaging
export async function sendFCMNotification(token: string, notification: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  if (!firebaseInitialized) {
    console.warn("[Firebase] Firebase not initialized, cannot send FCM notification");
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      token: token,
      webpush: {
        fcmOptions: {
          link: process.env.SITE_URL || "https://comedy-group-planning.vercel.app/",
        },
        headers: {
          TTL: "86400",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("[Firebase] FCM notification sent:", response);
    return true;
  } catch (error) {
    console.error("[Firebase] Error sending FCM notification:", error);
    return false;
  }
}

// Send to multiple tokens
export async function sendFCMToMultiple(tokens: string[], notification: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ success: number; failure: number }> {
  if (!firebaseInitialized) {
    console.warn("[Firebase] Firebase not initialized");
    return { success: 0, failure: tokens.length };
  }

  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    const success = response.successCount;
    const failure = response.failureCount;
    
    // Log failed tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.warn(`[Firebase] Failed to send to token ${idx}:`, resp.error?.message);
      }
    });

    console.log(`[Firebase] Multicast result: ${success} success, ${failure} failed`);
    return { success, failure };
  } catch (error) {
    console.error("[Firebase] Error sending multicast FCM:", error);
    return { success: 0, failure: tokens.length };
  }
}

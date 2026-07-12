import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

const KEYS_FILE = path.join(process.cwd(), 'vapid-keys.json');

let vapidKeys: { publicKey: string; privateKey: string };

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
} else if (fs.existsSync(KEYS_FILE)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading VAPID keys file, generating new keys.', err);
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
  }
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save VAPID keys file', err);
  }
}

// Set VAPID details (subject should be mailto URL or standard URL)
webpush.setVapidDetails(
  'mailto:support@lifeos.ai',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export function getPublicKey(): string {
  return vapidKeys.publicKey;
}

export async function sendPushNotification(subscriptionStr: string, payload: { title: string; message: string; data?: any }) {
  try {
    const subscription = JSON.parse(subscriptionStr);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    console.error('Web Push notification failed:', error.statusCode, error.message);
    // Return false so caller can handle cleanup of expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      return false; // Subscription expired or no longer active
    }
    throw error;
  }
}

import { supabase } from '@/integrations/supabase/client';

// VAPID public key (same as in edge function)
const VAPID_PUBLIC_KEY = 'BLBz1p2s4P9kX7nF8mQ3wR6tY5vC8bN2aM4jK9hL0xS3fG6dE7cV0bA1wZ5yT8uI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push with proper key conversion
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('User not logged in');
      return false;
    }

    // Extract subscription keys
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys as { p256dh: string; auth: string };

    // Save subscription to database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return false;
    }

    console.log('Push subscription saved successfully');
    return true;

  } catch (error) {
    console.error('Error subscribing to push:', error);
    return false;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from database
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', session.user.id);
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return false;
  }
}

export async function sendPushToAdmins(title: string, body: string, url?: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        title,
        body,
        url: url || '/admin/agenda',
        targetRole: 'admin',
      },
    });

    if (error) {
      console.error('Error sending push:', error);
    }
  } catch (error) {
    console.error('Error invoking push function:', error);
  }
}
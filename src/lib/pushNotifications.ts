import { supabase } from '@/integrations/supabase/client';

// VAPID public key - Generated from vapidkeys.com
const VAPID_PUBLIC_KEY = 'BHJ-Q8DU_w5SVtAb_88tc1sY151Rj6D7kr2iNTSNvenIZIDOxnSCRN97OPCV4sGj22-zH7hWr2Mfnlj36qSx2mI';

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

    // Extract subscription keys
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys as { p256dh: string; auth: string };

    // Get auth token for the edge function
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Save subscription via Edge Function (more secure)
    const { error } = await supabase.functions.invoke('save-subscription', {
      body: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      },
    });

    if (error) {
      console.error('Error saving subscription:', error);
      return false;
    }

    console.log('Push subscription saved successfully via Edge Function');
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
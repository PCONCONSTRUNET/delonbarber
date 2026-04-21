import { useEffect, useState, useCallback, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'cliente';

interface UsePushOptions {
  role: Role;
  userId?: string | null;
}

// Singleton init guard (OneSignal can only be initialized once per page)
let oneSignalInitPromise: Promise<void> | null = null;

function isInPreviewIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const isPreviewHost =
      host.includes('id-preview--') ||
      host.includes('lovableproject.com');
    return inIframe || isPreviewHost;
  } catch {
    return true;
  }
}

function detectEnvironment() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as any).standalone === true;
  const hasNotificationAPI = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;

  return {
    isIOS,
    isStandalone,
    hasNotificationAPI,
    hasServiceWorker,
    hasPushManager,
  };
}

async function initOneSignal(appId: string): Promise<void> {
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      welcomeNotification: { disable: true, message: '' },
    } as unknown as Parameters<typeof OneSignal.init>[0]);
  })();

  return oneSignalInitPromise;
}

export function usePushNotifications({ role, userId }: UsePushOptions) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const initStartedRef = useRef(false);

  // Initialize OneSignal SDK
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const setup = async () => {
      try {
        const env = detectEnvironment();
        console.log('[push] Environment:', env);
        setIsIOS(env.isIOS);

        // Block in preview/iframe (always)
        if (isInPreviewIframe()) {
          console.log('[push] Skipping init in preview/iframe');
          setSupported(false);
          setUnsupportedReason('preview');
          setLoading(false);
          return;
        }

        // For iOS: ALWAYS try to init, even if standalone check is uncertain.
        // Let the SDK + user attempt determine real support.
        // For other browsers: require basic APIs upfront.
        if (!env.isIOS && (!env.hasNotificationAPI || !env.hasServiceWorker)) {
          console.log('[push] Missing browser APIs');
          setSupported(false);
          setUnsupportedReason('no-api');
          setLoading(false);
          return;
        }

        // Fetch App ID from edge function
        const { data, error } = await supabase.functions.invoke('onesignal-config');
        if (error || !data?.appId) {
          console.error('[push] Failed to fetch OneSignal App ID', error);
          setSupported(false);
          setUnsupportedReason('config-error');
          setLoading(false);
          return;
        }

        try {
          await initOneSignal(data.appId);
          setSupported(true);
          setInitialized(true);

          if (env.hasNotificationAPI) {
            setPermission(Notification.permission);
          }

          const isOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;
          const id = OneSignal.User?.PushSubscription?.id ?? null;
          setSubscribed(isOptedIn);
          setPlayerId(id);

          // Listen for subscription changes
          OneSignal.User?.PushSubscription?.addEventListener(
            'change',
            (event: { current: { optedIn: boolean; id: string | null } }) => {
              setSubscribed(event.current.optedIn);
              setPlayerId(event.current.id);
            }
          );
        } catch (initErr) {
          console.error('[push] OneSignal init failed:', initErr);
          // On iOS, still expose UI so user can try (gives clearer error)
          if (env.isIOS) {
            setSupported(true);
            setInitialized(false);
            setUnsupportedReason('ios-needs-retry');
          } else {
            setSupported(false);
            setUnsupportedReason('init-error');
          }
        }
      } catch (err) {
        console.error('[push] Setup error:', err);
        setSupported(false);
        setUnsupportedReason('init-error');
      } finally {
        setLoading(false);
      }
    };

    setup();
  }, []);

  // Save subscription to DB
  const saveSubscription = useCallback(
    async (pid: string) => {
      try {
        const deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          standalone:
            (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            (navigator as any).standalone === true,
        };

        const { error } = await supabase
          .from('onesignal_subscriptions')
          .upsert(
            {
              player_id: pid,
              role,
              user_id: userId ?? null,
              device_info: deviceInfo,
              ativo: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'player_id' }
          );

        if (error) {
          console.error('[push] Save subscription error:', error);
        } else {
          console.log('[push] Subscription saved for', role);
        }
      } catch (err) {
        console.error('[push] saveSubscription threw:', err);
      }
    },
    [role, userId]
  );

  // Update user_id binding when user logs in/out
  useEffect(() => {
    if (!playerId || !initialized) return;
    saveSubscription(playerId);
  }, [playerId, userId, initialized, saveSubscription]);

  const enable = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);

      // If not yet initialized but on iOS, attempt init now
      if (!initialized) {
        try {
          const { data } = await supabase.functions.invoke('onesignal-config');
          if (data?.appId) {
            await initOneSignal(data.appId);
            setInitialized(true);
          }
        } catch (e) {
          console.error('[push] retry init failed:', e);
        }
      }

      // Request permission and opt-in
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();

      // Wait for player_id (poll briefly)
      let pid: string | null = null;
      for (let i = 0; i < 30; i++) {
        pid = OneSignal.User.PushSubscription.id ?? null;
        if (pid) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }

      if (pid) {
        setPlayerId(pid);
        setSubscribed(true);
        setUnsupportedReason(null);
        await saveSubscription(pid);
        return true;
      }

      // No player_id obtained — likely permission denied or iOS standalone issue
      if (isIOS) {
        setUnsupportedReason('ios-permission-failed');
      }
      return false;
    } catch (err) {
      console.error('[push] enable error:', err);
      if (isIOS) {
        setUnsupportedReason('ios-permission-failed');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, saveSubscription, isIOS]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!initialized) return false;
    try {
      setLoading(true);
      await OneSignal.User.PushSubscription.optOut();

      // Mark inactive in DB
      if (playerId) {
        await supabase
          .from('onesignal_subscriptions')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('player_id', playerId);
      }

      setSubscribed(false);
      return true;
    } catch (err) {
      console.error('[push] disable error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, playerId]);

  return {
    supported,
    subscribed,
    permission,
    loading,
    playerId,
    enable,
    disable,
    unsupportedReason,
    isIOS,
  };
}

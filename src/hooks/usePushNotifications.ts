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

async function initOneSignal(appId: string, safariWebId?: string): Promise<void> {
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    await OneSignal.init({
      appId,
      safari_web_id: safariWebId,
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

        // Optimistic: assume supported. Real validation happens on enable().
        // This ensures the activation button is always visible outside preview,
        // regardless of admin/cliente or device — clearer UX than blocking upfront.
        setSupported(true);

        if (env.hasNotificationAPI) {
          setPermission(Notification.permission);
        }

        // Try to fetch App ID and init in background (non-blocking for UI)
        const { data, error } = await supabase.functions.invoke('onesignal-config');
        if (error || !data?.appId) {
          console.error('[push] Failed to fetch OneSignal App ID', error);
          // Keep supported=true so user can retry; mark reason for diagnostics
          setUnsupportedReason('config-error');
          setLoading(false);
          return;
        }

        try {
          await initOneSignal(data.appId);
          setInitialized(true);
          setUnsupportedReason(null);

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
          // Keep supported=true so user can still try — enable() will retry init
          setInitialized(false);
          setUnsupportedReason('init-error');
        }
      } catch (err) {
        console.error('[push] Setup error:', err);
        // Even on error, keep supported=true outside preview so user can retry
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
    // Hard timeout: never let UI hang for more than 20s
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('[push] enable() timed out after 20s');
        resolve(false);
      }, 20000);
    });

    const enablePromise = (async (): Promise<boolean> => {
      try {
        console.log('[push] enable() called. initialized=', initialized);

        // If not yet initialized, attempt init now
        if (!initialized) {
          try {
            console.log('[push] fetching onesignal-config...');
            const { data, error } = await supabase.functions.invoke('onesignal-config');
            if (error) console.error('[push] onesignal-config error:', error);
            if (data?.appId) {
              console.log('[push] initializing OneSignal...');
              await initOneSignal(data.appId);
              setInitialized(true);
              console.log('[push] OneSignal initialized');
            } else {
              console.error('[push] no appId returned');
              setUnsupportedReason('config-error');
              return false;
            }
          } catch (e) {
            console.error('[push] retry init failed:', e);
            setUnsupportedReason('init-error');
            return false;
          }
        }

        // Check current permission first
        if ('Notification' in window) {
          console.log('[push] current permission:', Notification.permission);
          if (Notification.permission === 'denied') {
            console.warn('[push] permission previously denied by user');
            setPermission('denied');
            setUnsupportedReason('permission-denied');
            return false;
          }
        }

        // Request permission with explicit timeout
        console.log('[push] requesting permission...');
        try {
          await Promise.race([
            OneSignal.Notifications.requestPermission(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('requestPermission timeout')), 10000)
            ),
          ]);
        } catch (permErr) {
          console.error('[push] requestPermission failed:', permErr);
        }

        // Re-check permission after request
        if ('Notification' in window) {
          console.log('[push] permission after request:', Notification.permission);
          setPermission(Notification.permission);
          if (Notification.permission !== 'granted') {
            setUnsupportedReason('permission-denied');
            return false;
          }
        }

        console.log('[push] opting in...');
        try {
          await Promise.race([
            OneSignal.User.PushSubscription.optIn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('optIn timeout')), 10000)
            ),
          ]);
        } catch (optErr) {
          console.error('[push] optIn failed:', optErr);
        }

        // Wait for player_id (poll briefly — max ~5s)
        console.log('[push] polling for player_id...');
        let pid: string | null = null;
        for (let i = 0; i < 20; i++) {
          pid = OneSignal.User?.PushSubscription?.id ?? null;
          if (pid) {
            console.log('[push] got player_id:', pid);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        if (pid) {
          setPlayerId(pid);
          setSubscribed(true);
          setUnsupportedReason(null);
          await saveSubscription(pid);
          return true;
        }

        console.warn('[push] no player_id obtained after polling');
        if (isIOS) {
          setUnsupportedReason('ios-permission-failed');
        } else {
          setUnsupportedReason('no-player-id');
        }
        return false;
      } catch (err) {
        console.error('[push] enable error:', err);
        if (isIOS) {
          setUnsupportedReason('ios-permission-failed');
        }
        return false;
      }
    })();

    setLoading(true);
    try {
      const result = await Promise.race([enablePromise, timeoutPromise]);
      return result;
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

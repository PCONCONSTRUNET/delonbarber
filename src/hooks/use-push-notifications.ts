import { useEffect, useState, useCallback, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'cliente';

interface UsePushOptions {
  role: Role;
  userId?: string | null;
  autoInit?: boolean;
}

let oneSignalInitPromise: Promise<void> | null = null;

function isInPreviewIframe(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const isPreviewHost =
      host.includes('id-preview--') || host.includes('lovableproject.com');
    return inIframe || isPreviewHost;
  } catch {
    return true;
  }
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

export function usePushNotifications({ role, userId, autoInit = true }: UsePushOptions) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (!autoInit) {
      setLoading(false);
      return;
    }
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const setup = async () => {
      try {
        if (isInPreviewIframe()) {
          setSupported(false);
          setLoading(false);
          return;
        }

        const hasNotificationAPI = 'Notification' in window;
        const hasServiceWorker = 'serviceWorker' in navigator;
        if (!hasNotificationAPI || !hasServiceWorker) {
          setSupported(false);
          setLoading(false);
          return;
        }

        setSupported(true);
        setPermission(Notification.permission);

        const { data, error } = await supabase.functions.invoke('onesignal-config');
        if (error || !data?.appId) {
          console.error('[push] config error', error);
          setLoading(false);
          return;
        }

        await initOneSignal(data.appId);
        setInitialized(true);

        const isOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;
        const id = OneSignal.User?.PushSubscription?.id ?? null;
        setSubscribed(isOptedIn);
        setPlayerId(id);

        OneSignal.User?.PushSubscription?.addEventListener(
          'change',
          (event: { current: { optedIn: boolean; id: string | null } }) => {
            setSubscribed(event.current.optedIn);
            setPlayerId(event.current.id);
          }
        );
      } catch (err) {
        console.error('[push] setup error:', err);
      } finally {
        setLoading(false);
      }
    };

    setup();
  }, [autoInit]);

  const saveSubscription = useCallback(
    async (pid: string) => {
      try {
        const deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        };

        const { error } = await supabase
          .from('push_subscriptions' as never)
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

        if (error) console.error('[push] save error:', error);
      } catch (err) {
        console.error('[push] saveSubscription threw:', err);
      }
    },
    [role, userId]
  );

  useEffect(() => {
    if (!playerId || !initialized) return;
    saveSubscription(playerId);
  }, [playerId, userId, initialized, saveSubscription]);

  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      if (!initialized) {
        const { data } = await supabase.functions.invoke('onesignal-config');
        if (!data?.appId) return false;
        await initOneSignal(data.appId);
        setInitialized(true);
      }

      if ('Notification' in window && Notification.permission === 'denied') {
        setPermission('denied');
        return false;
      }

      try {
        await OneSignal.Notifications.requestPermission();
      } catch (e) {
        console.warn('[push] requestPermission failed', e);
      }

      if ('Notification' in window) {
        setPermission(Notification.permission);
        if (Notification.permission !== 'granted') return false;
      }

      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (e) {
        console.warn('[push] optIn failed', e);
      }

      let pid: string | null = null;
      for (let i = 0; i < 20; i++) {
        pid = OneSignal.User?.PushSubscription?.id ?? null;
        if (pid) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      if (pid) {
        setPlayerId(pid);
        setSubscribed(true);
        await saveSubscription(pid);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[push] enable error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, saveSubscription]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!initialized) return false;
    try {
      setLoading(true);
      await OneSignal.User.PushSubscription.optOut();
      if (playerId) {
        await supabase
          .from('push_subscriptions' as never)
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

  return { supported, subscribed, permission, loading, playerId, enable, disable };
}

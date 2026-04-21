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
    console.log('[push] OneSignal.init com appId =', appId);
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
      autoRegister: false,
      autoResubscribe: true,
      welcomeNotification: { disable: true, message: '' },
      notifyButton: { enable: false },
      promptOptions: { slidedown: { prompts: [] } },
    } as unknown as Parameters<typeof OneSignal.init>[0]);
    console.log('[push] OneSignal.init RESOLVIDO');
  })();

  return oneSignalInitPromise;
}

/**
 * Aguarda o OneSignal devolver um player_id após optIn.
 * Combina polling com event listener para máxima confiabilidade.
 */
function waitForPlayerId(timeoutMs = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (id: string | null) => {
      if (resolved) return;
      resolved = true;
      resolve(id);
    };

    // 1) Listener de eventos — preferencial
    const listener = (event: { current: { id: string | null; optedIn: boolean } }) => {
      console.log('[push] subscription change event:', event.current);
      if (event.current.id) finish(event.current.id);
    };
    try {
      OneSignal.User?.PushSubscription?.addEventListener('change', listener);
    } catch (e) {
      console.warn('[push] addEventListener falhou', e);
    }

    // 2) Polling — fallback (alguns dispositivos não disparam o evento)
    const start = Date.now();
    const poll = () => {
      if (resolved) return;
      const id = OneSignal.User?.PushSubscription?.id ?? null;
      if (id) {
        console.log(`[push] player_id via polling em ${Date.now() - start}ms:`, id);
        finish(id);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        console.error('[push] timeout aguardando player_id');
        finish(null);
        return;
      }
      setTimeout(poll, 300);
    };
    poll();
  });
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
            console.log('[push] global change event:', event.current);
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

        const { error } = await (supabase as any)
          .from('push_subscriptions')
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
        else console.log('[push] subscription salva no banco:', pid);
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
    console.log('[push] enable() iniciado', { initialized, role, userId });
    try {
      if (!initialized) {
        const { data, error: cfgErr } = await supabase.functions.invoke('onesignal-config');
        if (!data?.appId) {
          console.error('[push] appId vazio', cfgErr);
          return false;
        }
        await initOneSignal(data.appId);
        setInitialized(true);
      }

      if ('Notification' in window && Notification.permission === 'denied') {
        console.warn('[push] permissão já estava negada');
        setPermission('denied');
        return false;
      }

      // Pedir permissão DIRETA (sem prompt do OneSignal)
      try {
        console.log('[push] solicitando permissão nativa...');
        await OneSignal.Notifications.requestPermission();
      } catch (e) {
        console.warn('[push] requestPermission falhou', e);
      }

      // Algumas versões devolvem o estado em Notification.permission
      if ('Notification' in window) {
        setPermission(Notification.permission);
        console.log('[push] permissão pós-prompt:', Notification.permission);
        if (Notification.permission !== 'granted') {
          console.warn('[push] permissão não concedida');
          return false;
        }
      }

      // OPT-IN — força o registro do player_id no OneSignal
      try {
        console.log('[push] optIn()...');
        await OneSignal.User.PushSubscription.optIn();
      } catch (e) {
        console.warn('[push] optIn falhou', e);
      }

      // Aguarda o player_id chegar (combina event + polling)
      const pid = await waitForPlayerId(15000);

      if (pid) {
        setPlayerId(pid);
        setSubscribed(true);
        await saveSubscription(pid);
        console.log('[push] ✅ inscrição completa, pid =', pid);

        // Welcome push depois de garantir que está salvo
        setTimeout(async () => {
          try {
            const { data: welcomeRes, error: welcomeErr } = await supabase.functions.invoke('send-push', {
              body: {
                role,
                user_id: userId ?? undefined,
                title: '🔔 Notificações ativadas!',
                message: 'Você receberá avisos de novos agendamentos aqui.',
                url: '/',
              },
            });
            console.log('[push] welcome push:', { welcomeRes, welcomeErr });
          } catch (e) {
            console.warn('[push] welcome push falhou:', e);
          }
        }, 2000);

        return true;
      }

      console.error('[push] ❌ player_id não chegou. optedIn=', OneSignal.User?.PushSubscription?.optedIn);
      return false;
    } catch (err) {
      console.error('[push] enable error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, role, userId, saveSubscription]);

  const disable = useCallback(async (): Promise<boolean> => {
    if (!initialized) return false;
    try {
      setLoading(true);
      await OneSignal.User.PushSubscription.optOut();
      if (playerId) {
        await (supabase as any)
          .from('push_subscriptions')
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

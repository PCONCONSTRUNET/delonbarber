import { useEffect, useState } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'push-prompt-asked-v1';
const DELAY_MS = 1500;

interface Props {
  excludePaths?: string[];
}

export function PushPromptModal({ excludePaths = ['/admin', '/login'] }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const shouldInitPush = !excludePaths.some((p) => location.pathname.startsWith(p));

  const { supported, permission, subscribed, loading, enable } = usePushNotifications({
    role: 'cliente',
    userId,
    autoInit: shouldInitPush,
  });

  useEffect(() => {
    let mounted = true;
    const check = async (sessionUserId?: string | null) => {
      if (!mounted) return;
      const uid = sessionUserId ?? null;
      setUserId(uid);
      if (uid) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', uid)
          .eq('role', 'admin');
        if (mounted) setIsAdmin((roles?.length ?? 0) > 0);
      } else {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      void check(session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void check(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!userId) return;
    if (isAdmin) return;
    if (excludePaths.some((p) => location.pathname.startsWith(p))) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!supported) return;
    if (permission === 'granted' || permission === 'denied') return;
    if (subscribed) return;

    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [authChecked, userId, isAdmin, supported, permission, subscribed, location.pathname, excludePaths]);

  const dismiss = () => {
    setClosing(true);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  };

  const handleEnable = async () => {
    await enable();
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl border border-border transition-transform duration-200 ${
          closing ? 'translate-y-4 sm:translate-y-0 sm:scale-95' : 'translate-y-0 scale-100'
        }`}
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-7 w-7 text-primary" />
            </div>
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary" />
          </div>

          <h2 className="text-base font-semibold text-foreground">
            Receber lembretes do seu agendamento?
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Avisaremos sobre confirmações e lembretes — mesmo com o app fechado.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {loading ? 'Ativando...' : 'Permitir notificações'}
          </button>
          <button
            onClick={dismiss}
            disabled={loading}
            className="h-10 rounded-xl text-xs text-muted-foreground hover:bg-muted transition"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

export default PushPromptModal;

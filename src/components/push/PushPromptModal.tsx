import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'push-prompt-shown-v2';

// Routes where we never show the prompt (admin area, login, public landing)
const EXCLUDED_PATHS = ['/login', '/admin'];

export function PushPromptModal() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  const { supported, subscribed, permission, enable, loading } = usePushNotifications({
    role: 'cliente',
    userId,
  });

  // Track logged-in user (only show prompt to authenticated clients)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Decide whether to show the prompt
  useEffect(() => {
    if (!authChecked) return;
    if (!userId) return; // only logged-in clients
    if (EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p))) return;
    if (!supported) {
      console.log('[PushPrompt] not supported, skipping');
      return;
    }
    if (subscribed) {
      console.log('[PushPrompt] already subscribed');
      return;
    }
    if (permission === 'denied') {
      console.log('[PushPrompt] permission denied previously');
      return;
    }
    if (localStorage.getItem(STORAGE_KEY)) {
      console.log('[PushPrompt] already shown');
      return;
    }

    console.log('[PushPrompt] scheduling prompt in 3s');
    const t = setTimeout(() => {
      console.log('[PushPrompt] opening prompt');
      setOpen(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [authChecked, userId, supported, subscribed, permission, location.pathname]);

  const handleEnable = async () => {
    const ok = await enable();
    if (ok) {
      toast.success('Notificações ativadas!');
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
    } else {
      toast.error('Não foi possível ativar. Verifique as permissões.');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Receba avisos de agendamento</DialogTitle>
          <DialogDescription className="text-center">
            Ative as notificações para receber lembretes, confirmações e novidades direto no seu
            celular — mesmo com o app fechado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleEnable}
            disabled={loading}
            size="lg"
            className="w-full h-12 rounded-xl active:scale-[0.98] transition-transform"
          >
            {loading ? 'Ativando...' : '🔔 Ativar notificações'}
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

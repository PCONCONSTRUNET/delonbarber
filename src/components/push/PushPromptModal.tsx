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
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  const { supported, subscribed, permission, enable, loading } = usePushNotifications({
    role: 'cliente',
    userId,
  });

  // Track logged-in user + admin role (admins shouldn't see the client prompt)
  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const uid = data.user?.id ?? null;
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

    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      // Re-check admin role on auth change
      checkUser();
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

    console.log('[PushPrompt] scheduling prompt in 500ms');
    const t = setTimeout(() => {
      console.log('[PushPrompt] opening prompt');
      setOpen(true);
    }, 500);
    return () => clearTimeout(t);
  }, [authChecked, userId, supported, subscribed, permission, location.pathname]);

  const handleEnable = async () => {
    // Safety: close modal automatically if enable() takes longer than 15s
    const safetyTimer = setTimeout(() => {
      console.warn('[PushPrompt] enable() taking too long — closing modal');
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
      toast.error('Tempo esgotado. Tente novamente nas configurações.');
    }, 15000);

    try {
      const ok = await enable();
      clearTimeout(safetyTimer);
      if (ok) {
        toast.success('Notificações ativadas!');
        localStorage.setItem(STORAGE_KEY, '1');
        setOpen(false);
      } else {
        toast.error('Não foi possível ativar. Verifique as permissões.');
        // Close modal even on failure so user isn't stuck
        localStorage.setItem(STORAGE_KEY, '1');
        setOpen(false);
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('[PushPrompt] handleEnable error:', err);
      toast.error('Erro ao ativar. Tente novamente.');
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="max-w-[320px] p-5 rounded-2xl gap-3">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-base font-semibold">
            Ativar notificações?
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed">
            Receba lembretes e confirmações dos seus agendamentos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-1.5 sm:flex-col mt-1">
          <Button
            onClick={handleEnable}
            disabled={loading}
            size="sm"
            className="w-full h-10 rounded-xl active:scale-[0.98] transition-transform text-sm font-medium"
          >
            {loading ? 'Ativando...' : 'Ativar'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            size="sm"
            className="w-full h-9 text-xs text-muted-foreground"
          >
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

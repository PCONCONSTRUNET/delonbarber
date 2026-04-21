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
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  const { supported, subscribed, permission, enable, loading } = usePushNotifications({
    role: 'cliente',
    userId,
  });

  const permissionDenied = permission === 'denied';

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
    if (!userId) return;
    if (isAdmin) return;
    if (EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p))) return;
    if (!supported) return;
    if (subscribed) return;
    // If permission is already denied, don't auto-show — user must enable in OS settings
    if (permission === 'denied') {
      localStorage.setItem(STORAGE_KEY, '1');
      return;
    }
    if (localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [authChecked, userId, isAdmin, supported, subscribed, permission, location.pathname]);

  const handleEnable = async () => {
    if (submitting) return; // prevent double-clicks
    setSubmitting(true);

    // Safety: close modal automatically if enable() takes longer than 15s
    const safetyTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
      setSubmitting(false);
      toast.error('Tempo esgotado. Tente novamente nas configurações.');
    }, 15000);

    try {
      const ok = await enable();
      clearTimeout(safetyTimer);
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
      if (ok) {
        toast.success('Notificações ativadas!');
      } else {
        toast.error('Não foi possível ativar. Habilite nas configurações do seu celular.');
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.error('[PushPrompt] handleEnable error:', err);
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
      toast.error('Erro ao ativar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const isBusy = loading || submitting;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isBusy && handleDismiss()}>
      <DialogContent className="max-w-[320px] p-5 rounded-2xl gap-3">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center text-base font-semibold">
            {permissionDenied ? 'Notificações bloqueadas' : 'Ativar notificações?'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed">
            {permissionDenied
              ? 'Para receber lembretes, ative as notificações nas configurações do seu celular.'
              : 'Receba lembretes e confirmações dos seus agendamentos.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-1.5 sm:flex-col mt-1">
          {!permissionDenied && (
            <Button
              onClick={handleEnable}
              disabled={isBusy}
              size="sm"
              className="w-full h-10 rounded-xl active:scale-[0.98] transition-transform text-sm font-medium"
            >
              {isBusy ? 'Ativando...' : 'Ativar'}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isBusy}
            size="sm"
            className="w-full h-9 text-xs text-muted-foreground"
          >
            {permissionDenied ? 'Entendi' : 'Agora não'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

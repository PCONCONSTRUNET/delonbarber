import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
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

const STORAGE_KEY = 'push-prompt-shown-v1';

interface PushPromptModalProps {
  userId?: string | null;
}

export function PushPromptModal({ userId }: PushPromptModalProps) {
  const [open, setOpen] = useState(false);
  const { supported, subscribed, permission, enable, loading } = usePushNotifications({
    role: 'cliente',
    userId,
  });

  useEffect(() => {
    if (!supported) return;
    if (subscribed) return;
    if (permission === 'denied') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [supported, subscribed, permission]);

  const handleEnable = async () => {
    const ok = await enable();
    if (ok) {
      toast.success('Notificações ativadas!');
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
    } else {
      toast.error('Não foi possível ativar.');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Receba avisos de agendamento</DialogTitle>
          <DialogDescription className="text-center">
            Ative as notificações para receber lembretes, confirmações e novidades direto no seu
            celular — mesmo com o app fechado.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleEnable} disabled={loading} className="w-full">
            {loading ? 'Ativando...' : 'Ativar notificações'}
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Bell, BellOff, Loader2, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

interface PushToggleProps {
  role: 'admin' | 'cliente';
  userId?: string | null;
  variant?: 'default' | 'compact';
  showTestButton?: boolean;
}

export function PushToggle({ role, userId, variant = 'default' }: PushToggleProps) {
  const { supported, subscribed, loading, enable, disable, permission } = usePushNotifications({
    role,
    userId,
  });

  const handleToggle = async () => {
    if (subscribed) {
      const ok = await disable();
      if (ok) toast.success('Notificações desativadas');
      else toast.error('Erro ao desativar notificações');
    } else {
      if (permission === 'denied') {
        toast.error('Permissão negada. Libere notificações nas configurações do navegador/celular.', {
          duration: 7000,
        });
        return;
      }
      const ok = await enable();
      if (ok) toast.success('Notificações ativadas com sucesso!');
      else toast.error('Não foi possível ativar. Verifique as permissões.');
    }
  };

  if (!supported) {
    if (variant === 'compact') return null;
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
        Notificações não disponíveis neste ambiente.
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        size="sm"
        variant={subscribed ? 'secondary' : 'default'}
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={subscribed ? 'outline' : 'default'}
      size="lg"
      className="gap-2 w-full sm:w-auto h-12 rounded-xl active:scale-[0.98] transition-transform font-semibold"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : subscribed ? (
        <>
          <BellOff className="h-5 w-5" />
          Desativar notificações
        </>
      ) : (
        <>
          <BellRing className="h-5 w-5" />
          Ativar notificações
        </>
      )}
    </Button>
  );
}

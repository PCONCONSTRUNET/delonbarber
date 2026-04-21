import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface PushToggleProps {
  role: 'admin' | 'cliente';
  userId?: string | null;
  variant?: 'default' | 'compact';
}

export function PushToggle({ role, userId, variant = 'default' }: PushToggleProps) {
  const { supported, subscribed, loading, enable, disable } = usePushNotifications({ role, userId });

  if (!supported) {
    if (variant === 'compact') return null;
    return (
      <div className="text-sm text-muted-foreground">
        Notificações não suportadas neste dispositivo/navegador.
      </div>
    );
  }

  const handleToggle = async () => {
    if (subscribed) {
      const ok = await disable();
      if (ok) toast.success('Notificações desativadas');
      else toast.error('Erro ao desativar notificações');
    } else {
      const ok = await enable();
      if (ok) toast.success('Notificações ativadas com sucesso!');
      else toast.error('Não foi possível ativar. Verifique as permissões do navegador.');
    }
  };

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
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {subscribed ? 'Desativar notificações' : 'Ativar notificações'}
    </Button>
  );
}

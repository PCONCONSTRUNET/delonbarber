import { Bell, BellOff, Loader2, BellRing } from 'lucide-react';
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

  // Detect if running inside Lovable preview iframe (push not available there)
  const isPreview = (() => {
    try {
      const host = window.location.hostname;
      return (
        window.self !== window.top ||
        host.includes('id-preview--') ||
        host.includes('lovableproject.com')
      );
    } catch {
      return true;
    }
  })();

  if (!supported) {
    if (variant === 'compact') return null;

    if (isPreview) {
      return (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📱 Notificações disponíveis no app publicado</p>
          <p>Abra o app pelo link publicado (delonbarber.lovable.app) ou instale como aplicativo no seu celular para ativar as notificações.</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-muted bg-muted/20 p-3 text-xs text-muted-foreground">
        Notificações não suportadas neste dispositivo/navegador. No iPhone, instale o app na tela inicial primeiro.
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

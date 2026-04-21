import { Bell, BellOff, Loader2, BellRing, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface PushToggleProps {
  role: 'admin' | 'cliente';
  userId?: string | null;
  variant?: 'default' | 'compact';
}

export function PushToggle({ role, userId, variant = 'default' }: PushToggleProps) {
  const { supported, subscribed, loading, enable, disable, unsupportedReason } =
    usePushNotifications({ role, userId });

  if (!supported) {
    if (variant === 'compact') return null;

    // Friendly message + actionable hint per reason
    let title = 'Notificações indisponíveis';
    let message = 'Seu navegador não suporta notificações push.';

    if (unsupportedReason === 'preview') {
      title = '📱 Notificações disponíveis no app publicado';
      message =
        'Abra o app pelo link publicado (delonbarber.lovable.app) e instale na tela inicial para ativar.';
    } else if (unsupportedReason === 'ios-not-installed') {
      title = '📲 Instale o app primeiro';
      message =
        'No iPhone, toque em Compartilhar → "Adicionar à Tela de Início" e abra o app pelo ícone instalado para ativar as notificações.';
    } else if (unsupportedReason === 'config-error') {
      title = '⚠️ Erro de configuração';
      message = 'Não conseguimos carregar a configuração de notificações. Tente recarregar.';
    } else if (unsupportedReason === 'no-api') {
      title = '⚠️ Navegador incompatível';
      message =
        'Use o Chrome, Safari (iOS 16.4+) ou Firefox para receber notificações.';
    }

    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">{title}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>
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

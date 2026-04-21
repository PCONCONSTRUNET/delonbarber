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
  const { supported, subscribed, loading, enable, disable, unsupportedReason, isIOS } =
    usePushNotifications({ role, userId });

  const handleToggle = async () => {
    if (subscribed) {
      const ok = await disable();
      if (ok) toast.success('Notificações desativadas');
      else toast.error('Erro ao desativar notificações');
    } else {
      const ok = await enable();
      if (ok) {
        toast.success('Notificações ativadas com sucesso!');
      } else {
        if (isIOS) {
          toast.error('Não foi possível ativar. Confirme que o app está instalado na tela inicial e iOS é 16.4+');
        } else {
          toast.error('Não foi possível ativar. Verifique as permissões do navegador.');
        }
      }
    }
  };

  // Block totally only in preview iframe (we can't init there)
  if (!supported && unsupportedReason === 'preview') {
    if (variant === 'compact') return null;
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              📱 Disponível no app publicado
            </p>
            <p className="text-xs text-muted-foreground">
              As notificações funcionam apenas fora do preview do Lovable. Acesse pelo seu domínio publicado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant — just a button
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

  // For non-iOS unsupported (no API available, etc.) → show info card
  if (!supported && !isIOS) {
    let title = 'Notificações indisponíveis';
    let message = 'Use o Chrome, Safari (iOS 16.4+) ou Firefox para receber notificações.';

    if (unsupportedReason === 'config-error') {
      title = '⚠️ Erro de configuração';
      message = 'Não conseguimos carregar a configuração de notificações. Recarregue a página.';
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

  // Default variant — full button (always show on iOS, regardless of "supported")
  return (
    <div className="space-y-2">
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
            {isIOS ? 'Ativar notificações' : 'Ativar notificações'}
          </>
        )}
      </Button>

      {/* iOS-specific helper hint when previous attempt failed */}
      {isIOS && !subscribed && unsupportedReason === 'ios-permission-failed' && (
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-2.5">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Não funcionou?</strong> Verifique:
            <br />
            1. O app está aberto pelo <strong>ícone na tela inicial</strong> (não pelo Safari)
            <br />
            2. Seu iOS é <strong>versão 16.4 ou superior</strong>
            <br />
            3. Vá em Ajustes → Notificações → Delon Barber e ative
          </p>
        </div>
      )}
    </div>
  );
}

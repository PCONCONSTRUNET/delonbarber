import { Bell, BellOff, Loader2, BellRing, Bug, Send } from 'lucide-react';
import { useState } from 'react';
import OneSignal from 'react-onesignal';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PushToggleProps {
  role: 'admin' | 'cliente';
  userId?: string | null;
  variant?: 'default' | 'compact';
  showTestButton?: boolean;
}

export function PushToggle({ role, userId, variant = 'default' }: PushToggleProps) {
  const { supported, subscribed, loading, enable, disable, permission, playerId } =
    usePushNotifications({ role, userId });
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagInfo, setDiagInfo] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const sendTestPush = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          role,
          title: '🔔 Push de teste',
          message: `Se você está vendo isso, as notificações estão funcionando! (${new Date().toLocaleTimeString('pt-BR')})`,
          url: role === 'admin' ? '/admin' : '/cliente',
          ...(role === 'cliente' && userId ? { user_id: userId } : {}),
        },
      });
      if (error) {
        console.error('[test push] error:', error);
        toast.error(`Erro ao enviar: ${error.message}`);
        return;
      }
      console.log('[test push] result:', data);
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) {
        toast.success(`Enviado para ${sent} dispositivo(s). Aguarde alguns segundos.`, { duration: 6000 });
      } else {
        toast.warning(`Nenhum dispositivo recebeu. Motivo: ${(data as any)?.reason ?? 'desconhecido'}`, { duration: 6000 });
      }
    } catch (err) {
      console.error('[test push] threw:', err);
      toast.error('Falha ao chamar send-push');
    } finally {
      setTestLoading(false);
    }
  };

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

  const runDiagnostic = async () => {
    setDiagLoading(true);
    setDiagInfo(null);
    try {
      const sdkPid = OneSignal.User?.PushSubscription?.id ?? null;
      const sdkOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;
      const sdkToken = OneSignal.User?.PushSubscription?.token ?? null;
      const browserPerm =
        'Notification' in window ? Notification.permission : 'unsupported';
      const swReg =
        'serviceWorker' in navigator
          ? (await navigator.serviceWorker.getRegistrations()).length
          : 0;

      const pidToCheck = sdkPid ?? playerId;
      let dbRow: { player_id: string; ativo: boolean; user_id: string | null; role: string } | null = null;
      let dbError: string | null = null;

      if (pidToCheck) {
        const { data, error } = await (supabase as any)
          .from('push_subscriptions')
          .select('player_id, ativo, user_id, role')
          .eq('player_id', pidToCheck)
          .maybeSingle();
        if (error) dbError = error.message;
        else dbRow = data;
      }

      const { count: totalCount } = await (supabase as any)
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('role', role)
        .eq('ativo', true);

      const lines = [
        `🔍 DIAGNÓSTICO PUSH (${role})`,
        '',
        `📱 Browser permission: ${browserPerm}`,
        `🛰️  Service Workers ativos: ${swReg}`,
        '',
        `🆔 SDK player_id: ${sdkPid ?? '❌ NÃO GERADO'}`,
        `✅ SDK optedIn: ${sdkOptedIn}`,
        `🎫 SDK push token: ${sdkToken ? '✅ presente' : '❌ ausente'}`,
        `🪝 Hook playerId: ${playerId ?? '—'}`,
        '',
        `💾 Linha no banco: ${
          dbRow
            ? `ativo=${dbRow.ativo}, user_id=${dbRow.user_id ?? 'NULL'}`
            : pidToCheck
              ? '❌ NÃO ENCONTRADA no banco'
              : '— (sem player_id pra checar)'
        }`,
        dbError ? `❗ Erro DB: ${dbError}` : '',
        `📊 Total inscrições ativas (${role}): ${totalCount ?? 0}`,
        '',
        `👤 userId logado: ${userId ?? 'anônimo'}`,
      ].filter(Boolean);

      const report = lines.join('\n');
      console.log(report);
      setDiagInfo(report);

      if (!sdkPid) {
        toast.error('player_id não foi gerado pelo OneSignal', { duration: 5000 });
      } else if (!dbRow) {
        toast.warning('player_id existe mas não foi salvo no banco', { duration: 5000 });
      } else {
        toast.success(`Inscrição OK — ${totalCount ?? 0} dispositivo(s) ativo(s)`);
      }
    } catch (err) {
      console.error('[diag] erro:', err);
      toast.error('Erro ao rodar diagnóstico');
      setDiagInfo(`Erro: ${String(err)}`);
    } finally {
      setDiagLoading(false);
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
    <div className="space-y-3">
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

      {subscribed && (
        <Button
          onClick={sendTestPush}
          disabled={testLoading}
          variant="secondary"
          size="sm"
          className="gap-2 w-full sm:w-auto h-10 rounded-xl active:scale-[0.98] transition-transform"
        >
          {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar push de teste
        </Button>
      )}

      <Button
        onClick={runDiagnostic}
        disabled={diagLoading}
        variant="ghost"
        size="sm"
        className="gap-2 w-full sm:w-auto h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
      >
        {diagLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Bug className="h-3.5 w-3.5" />
        )}
        Testar inscrição (diagnóstico)
      </Button>

      {diagInfo && (
        <pre className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all font-mono">
          {diagInfo}
        </pre>
      )}
    </div>
  );
}

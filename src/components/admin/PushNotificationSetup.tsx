import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PushNotificationSetup() {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    checkSubscriptionStatus();
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  async function checkSubscriptionStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setIsSubscribed(!!data && !error);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    }
  }

  async function handleEnablePush() {
    setIsLoading(true);
    try {
      const success = await subscribeToPushNotifications();
      if (success) {
        setIsSubscribed(true);
        setPermissionState('granted');
        toast.success('Notificações push ativadas!', {
          description: 'Você receberá alertas mesmo com o app fechado.'
        });
      } else {
        toast.error('Não foi possível ativar', {
          description: 'Verifique se permitiu notificações no navegador.'
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
      toast.success('Notificações push desativadas');
    } catch (error) {
      console.error('Error disabling push:', error);
      toast.error('Erro ao desativar notificações');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestPush() {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🔔 Teste de Notificação',
          body: 'Se você está vendo isso, as notificações estão funcionando!',
          url: '/admin',
          targetRole: 'admin',
        },
      });

      if (error) {
        toast.error('Erro ao enviar teste');
      } else {
        toast.success('Notificação de teste enviada!', {
          description: 'Aguarde alguns segundos...'
        });
      }
    } catch (error) {
      console.error('Error testing push:', error);
      toast.error('Erro ao testar notificação');
    } finally {
      setIsLoading(false);
    }
  }

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  if (!isPushSupported) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Push não suportado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push. Instale o app como PWA para melhor experiência.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isSubscribed ? 'border-green-500/30 bg-green-500/5' : 'border-primary/30 bg-primary/5'}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isSubscribed ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              Notificações Ativadas
            </>
          ) : (
            <>
              <Bell className="w-5 h-5 text-primary" />
              Notificações Push
            </>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {isSubscribed 
            ? 'Você receberá alertas de novos agendamentos mesmo com o app fechado.'
            : 'Ative para receber alertas de novos agendamentos mesmo com o celular bloqueado.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {isSubscribed ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestPush}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Testar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDisablePush}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <BellOff className="w-4 h-4 mr-1" />
              Desativar
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleEnablePush}
            disabled={isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Bell className="w-4 h-4 mr-1" />
            )}
            Ativar Notificações
          </Button>
        )}
        
        {permissionState === 'denied' && (
          <p className="text-xs text-red-500 w-full mt-2">
            ⚠️ Notificações bloqueadas no navegador. Vá nas configurações do navegador para permitir.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import React, { createContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clientSupabase, getAuthScope } from '@/integrations/supabase/client';
import { playNotificationSound, playSuccessSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

export const ClientNotificationContext = createContext(null);

export function ClientNotificationProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isClientRoute = getAuthScope(pathname) === 'client';
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isClientRoute) {
      setUserId(null);
      return;
    }

    // Check initial session
    clientSupabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        requestNotificationPermission(); // Request browser permission when logged in
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = clientSupabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isClientRoute]);

  useEffect(() => {
    if (!isClientRoute || !userId) return;

    // Subscribe to realtime changes for this client's appointments
    const channel = clientSupabase
      .channel(`global-client-appointments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          
          // Check if status changed
          if (updated.status !== old.status) {
            const statusConfig: Record<string, { message: string; sound: 'success' | 'notification' }> = {
              confirmed: { message: '✅ Seu agendamento foi confirmado!', sound: 'success' },
              completed: { message: '🎉 Seu atendimento foi concluído!', sound: 'success' },
              cancelled: { message: '❌ Seu agendamento foi cancelado.', sound: 'notification' },
            };

            const config = statusConfig[updated.status];
            if (config) {
              // Play appropriate sound
              if (config.sound === 'success') {
                playSuccessSound();
              } else {
                playNotificationSound();
              }
              
              toast.info(config.message, {
                description: `${updated.appointment_date} às ${updated.appointment_time?.slice(0, 5)}`,
                duration: 8000,
              });
              
              // Show browser notification for confirmed status
              if (updated.status === 'confirmed') {
                showBrowserNotification(
                  '✅ Agendamento Confirmado!',
                  `Seu horário para ${updated.appointment_date} às ${updated.appointment_time?.slice(0, 5)} foi confirmado.`,
                  () => {
                    window.focus();
                    window.location.href = '/historico';
                  }
                );
              }
            }
          }

          // Check if payment status changed
          if (updated.payment_status === 'paid' && old.payment_status !== 'paid') {
            playSuccessSound();
            toast.success('💳 Pagamento confirmado!', {
              description: 'Obrigado pelo seu pagamento.',
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      clientSupabase.removeChannel(channel);
    };
  }, [isClientRoute, userId]);

  return (
    <ClientNotificationContext.Provider value={null}>
      {children}
    </ClientNotificationContext.Provider>
  );
}

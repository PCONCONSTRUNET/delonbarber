import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, playSuccessSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

interface UseAdminNotificationsOptions {
  enabled?: boolean;
  onNewAppointment?: (appointment: any) => void;
}

// Admin notifications are now handled by AdminNotificationContext
// This hook is kept for backward compatibility but does nothing for notifications
// to avoid duplicate notifications
export function useAdminNotifications({ enabled = true, onNewAppointment }: UseAdminNotificationsOptions = {}) {
  // No-op - notifications are handled globally by AdminNotificationContext
  // This prevents duplicate notifications
}

export function useClientNotifications() {
  const lastNotifiedRef = useRef<Set<string>>(new Set());

  const subscribeToAppointments = useCallback((userId: string) => {
    const channel = supabase
      .channel(`client-appointments-${userId}`)
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
                  `Seu horário para ${updated.appointment_date} às ${updated.appointment_time?.slice(0, 5)} foi confirmado.`
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
      supabase.removeChannel(channel);
    };
  }, []);

  return { subscribeToAppointments };
}

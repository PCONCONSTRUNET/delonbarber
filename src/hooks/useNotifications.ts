import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

interface UseAdminNotificationsOptions {
  enabled?: boolean;
  onNewAppointment?: (appointment: any) => void;
}

export function useAdminNotifications({ enabled = true, onNewAppointment }: UseAdminNotificationsOptions = {}) {
  const lastNotifiedRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    // Request notification permission on mount
    requestNotificationPermission();

    const channel = supabase
      .channel('admin-appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          // Skip if this is the initial load
          if (initialLoadRef.current) return;
          
          const newAppointment = payload.new as any;
          
          // Skip if already notified
          if (lastNotifiedRef.current.has(newAppointment.id)) return;
          lastNotifiedRef.current.add(newAppointment.id);

          // Get client info
          let clientName = 'Novo cliente';
          
          if (newAppointment.guest_name) {
            clientName = newAppointment.guest_name;
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', newAppointment.user_id)
              .maybeSingle();
            
            if (profile?.name) {
              clientName = profile.name;
            }
          }

          const time = newAppointment.appointment_time?.slice(0, 5) || '';
          const date = newAppointment.appointment_date || '';

          // Play sound
          playNotificationSound();

          // Show toast
          toast.success(`Novo agendamento!`, {
            description: `${clientName} agendou para ${date} às ${time}`,
            duration: 8000,
          });

          // Show browser notification
          showBrowserNotification(
            '🗓️ Novo Agendamento!',
            `${clientName} agendou para ${date} às ${time}`
          );

          // Callback
          onNewAppointment?.(newAppointment);
        }
      )
      .subscribe();

    // Mark initial load as complete after a short delay
    const timeout = setTimeout(() => {
      initialLoadRef.current = false;
    }, 2000);

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [enabled, onNewAppointment]);
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
            const statusMessages: Record<string, string> = {
              confirmed: '✅ Seu agendamento foi confirmado!',
              completed: '🎉 Seu atendimento foi concluído!',
              cancelled: '❌ Seu agendamento foi cancelado.',
            };

            const message = statusMessages[updated.status];
            if (message) {
              playNotificationSound();
              toast.info(message, {
                description: `${updated.appointment_date} às ${updated.appointment_time?.slice(0, 5)}`,
                duration: 8000,
              });
            }
          }

          // Check if payment status changed
          if (updated.payment_status === 'paid' && old.payment_status !== 'paid') {
            playNotificationSound();
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

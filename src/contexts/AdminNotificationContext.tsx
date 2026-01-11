import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';
import { toast } from 'sonner';

interface AdminNotificationContextValue {
  pendingCount: number;
  isAdmin: boolean;
}

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(null);

export function useGlobalAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useGlobalAdminNotifications must be used within AdminNotificationProvider');
  }
  return context;
}

export function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin');

      const hasAdminRole = roles && roles.length > 0;
      setIsAdmin(hasAdminRole);

      if (hasAdminRole) {
        // Request notification permission for admins
        requestNotificationPermission();
        
        // Subscribe to push notifications for background alerts
        subscribeToPushNotifications().then(success => {
          if (success) {
            console.log('Admin subscribed to push notifications');
          }
        });
      }
    }

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to new appointments for admins
  useEffect(() => {
    if (!isAdmin) return;

    // Fetch initial pending count
    async function fetchPendingCount() {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingCount(count || 0);
      
      // Mark initial load complete after a short delay
      setTimeout(() => setInitialLoadComplete(true), 2000);
    }

    fetchPendingCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('global-admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          // Skip during initial load
          if (!initialLoadComplete) return;

          const newAppointment = payload.new as any;

          // Get client info
          let clientName = 'Novo cliente';
          
          if (newAppointment.guest_name) {
            clientName = newAppointment.guest_name;
          } else if (newAppointment.user_id) {
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

          // Play notification sound
          playNotificationSound();

          // Show toast notification
          toast.success(`🗓️ Novo agendamento!`, {
            description: `${clientName} agendou para ${date} às ${time}`,
            duration: 10000,
          });

          // Show browser notification (works even when tab is not focused)
          showBrowserNotification(
            '🗓️ Novo Agendamento!',
            `${clientName} agendou para ${date} às ${time}`,
            () => {
              window.focus();
              window.location.href = '/admin/agenda';
            }
          );

          // Update pending count
          if (newAppointment.status === 'pending' || newAppointment.status === 'confirmed') {
            setPendingCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;

          // Update pending count based on status change
          if (updated.status !== old.status) {
            if (['pending', 'confirmed'].includes(old.status) && !['pending', 'confirmed'].includes(updated.status)) {
              setPendingCount(prev => Math.max(0, prev - 1));
            } else if (!['pending', 'confirmed'].includes(old.status) && ['pending', 'confirmed'].includes(updated.status)) {
              setPendingCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, initialLoadComplete]);

  return (
    <AdminNotificationContext.Provider value={{ pendingCount, isAdmin }}>
      {children}
    </AdminNotificationContext.Provider>
  );
}

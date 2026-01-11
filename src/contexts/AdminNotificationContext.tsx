import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

interface AdminNotificationContextValue {
  pendingCount: number;
  isAdmin: boolean;
  subscribeToPush: () => Promise<void>;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAdmin(false);
        setUserId(null);
        return;
      }

      setUserId(session.user.id);

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
              window.location.href = '/admin/agenda';
            }
          );

          // Update pending count
          if (newAppointment.status === 'pending') {
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
            if (old.status === 'pending' && updated.status !== 'pending') {
              setPendingCount(prev => Math.max(0, prev - 1));
            } else if (old.status !== 'pending' && updated.status === 'pending') {
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

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        return;
      }

      // Get VAPID public key from server
      const { data: vapidData } = await supabase.functions.invoke('get-vapid-key');
      
      if (!vapidData?.publicKey) {
        console.error('Could not get VAPID public key');
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey)
      });

      const subscriptionJSON = subscription.toJSON();

      // Save subscription to database
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscriptionJSON.endpoint!,
        p256dh: subscriptionJSON.keys!.p256dh,
        auth: subscriptionJSON.keys!.auth,
      }, {
        onConflict: 'user_id,endpoint'
      });

      console.log('Successfully subscribed to push notifications');
      toast.success('Notificações push ativadas!');
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    }
  }, [userId]);

  return (
    <AdminNotificationContext.Provider value={{ pendingCount, isAdmin, subscribeToPush }}>
      {children}
    </AdminNotificationContext.Provider>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

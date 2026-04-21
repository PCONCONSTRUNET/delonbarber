import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  total_price: number;
  total_duration: number;
  payment_status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  user_id: string;
  guest_name: string | null;
  guest_phone: string | null;
  profile?: {
    name: string | null;
    phone: string | null;
  };
  services: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface Client {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  total_appointments: number;
  total_spent: number;
  last_appointment: string | null;
  is_guest: boolean; // true if from guest_clients table
}

export interface ClientNote {
  id: string;
  client_id: string;
  note: string;
  created_at: string;
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
      setLoading(false);
    }

    checkAdmin();
  }, []);

  return { isAdmin, loading };
}

export function useAdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchAppointments() {
    setLoading(true);
    
    // Single query with JOINs for profiles
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_user_id_fkey(name, phone)
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
      return;
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    // Fetch all services in a single batch query
    const appointmentIds = appointmentsData.map(apt => apt.id);
    const { data: servicesData } = await supabase
      .from('appointment_services')
      .select('appointment_id, service_id, price_at_booking, services(id, name)')
      .in('appointment_id', appointmentIds);

    // Create lookup map for O(1) access
    const servicesByAppointment = new Map<string, { id: string; name: string; price: number }[]>();
    (servicesData || []).forEach((s: any) => {
      if (!servicesByAppointment.has(s.appointment_id)) {
        servicesByAppointment.set(s.appointment_id, []);
      }
      servicesByAppointment.get(s.appointment_id)!.push({
        id: s.services?.id,
        name: s.services?.name,
        price: s.price_at_booking
      });
    });

    // Map appointments with all data
    const appointmentsWithServices: AdminAppointment[] = appointmentsData.map((apt: any) => ({
      ...apt,
      profile: apt.profiles || { name: null, phone: null },
      services: servicesByAppointment.get(apt.id) || []
    }));

    setAppointments(appointmentsWithServices);
    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function updateAppointmentStatus(id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show') {
    const updateData: any = { status };
    
    // When marking as no_show, reset payment to remove revenue
    if (status === 'no_show') {
      updateData.payment_status = 'pending';
      updateData.payment_method = null;
      updateData.payment_date = null;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return false;
    }

    // Notify on cancellation by admin
    if (status === 'cancelled') {
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        const { sendPush, notifyAdmin: notifyAdm } = await import('@/lib/oneSignalPush');
        notifyAdm(
          '❌ Agendamento Cancelado',
          `Agendamento de ${apt.appointment_date} às ${apt.appointment_time?.slice(0, 5)} cancelado.`,
          '/admin/agenda'
        );
        if (apt.user_id) {
          sendPush({
            role: 'cliente',
            user_id: apt.user_id,
            title: '❌ Agendamento Cancelado',
            message: `Seu agendamento de ${apt.appointment_date} às ${apt.appointment_time?.slice(0, 5)} foi cancelado.`,
            url: '/perfil',
          });
        }
      }
    }

    toast({ title: "Atualizado!", description: status === 'no_show' ? "Marcado como falta." : "Status alterado com sucesso." });
    fetchAppointments();
    return true;
  }

  async function updatePaymentStatus(id: string, paymentStatus: string, paymentMethod?: string) {
    const updateData: any = { 
      payment_status: paymentStatus,
      payment_date: paymentStatus === 'paid' ? new Date().toISOString() : null
    };
    if (paymentMethod) updateData.payment_method = paymentMethod;

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar pagamento.", variant: "destructive" });
      return false;
    }

    if (paymentStatus === 'paid') {
      const apt = appointments.find(a => a.id === id);
      if (apt?.user_id) {
        const { sendPush } = await import('@/lib/oneSignalPush');
        sendPush({
          role: 'cliente',
          user_id: apt.user_id,
          title: '💳 Pagamento Confirmado',
          message: `Recebemos seu pagamento de R$ ${Number(apt.total_price || 0).toFixed(2)}. Obrigado!`,
          url: '/perfil',
        });
        sendPush({
          role: 'admin',
          title: '💰 Novo Pagamento',
          message: `Pagamento de R$ ${Number(apt.total_price || 0).toFixed(2)} confirmado.`,
          url: '/admin/financeiro',
        });
      }
    }

    toast({ title: "Atualizado!", description: "Pagamento registrado." });
    fetchAppointments();
    return true;
  }

  async function deleteAppointment(id: string) {
    try {
      // First delete related records in order
      // 1. Delete blocked_slots referencing this appointment
      await supabase
        .from('blocked_slots')
        .delete()
        .eq('appointment_id', id);

      // 2. Delete client_package_usage referencing this appointment
      await supabase
        .from('client_package_usage')
        .delete()
        .eq('appointment_id', id);

      // 3. Delete loyalty_rewards referencing this appointment
      await supabase
        .from('loyalty_rewards')
        .delete()
        .eq('appointment_id', id);

      // 4. Delete ratings referencing this appointment
      await supabase
        .from('ratings')
        .delete()
        .eq('appointment_id', id);

      // 5. Delete notifications referencing this appointment
      await supabase
        .from('notifications')
        .delete()
        .eq('appointment_id', id);

      // 6. Delete appointment_services
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', id);

      if (servicesError) {
        console.error('Error deleting appointment services:', servicesError);
        toast({ title: "Erro", description: "Não foi possível excluir serviços do agendamento.", variant: "destructive" });
        return false;
      }

      // 7. Finally delete the appointment
      const { error, data } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error deleting appointment:', error);
        toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
        return false;
      }

      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        console.error('No appointment deleted - may not have permission');
        toast({ title: "Erro", description: "Agendamento não encontrado ou sem permissão.", variant: "destructive" });
        return false;
      }

      toast({ title: "Excluído!", description: "Agendamento removido." });
      fetchAppointments();
      return true;
    } catch (err) {
      console.error('Unexpected error deleting appointment:', err);
      toast({ title: "Erro", description: "Erro inesperado ao excluir.", variant: "destructive" });
      return false;
    }
  }

  return { appointments, loading, fetchAppointments, updateAppointmentStatus, updatePaymentStatus, deleteAppointment };
}

export function useAdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchClients() {
    setLoading(true);

    // Fetch profiles, guest_clients, and appointments in parallel
    const [profilesResult, guestClientsResult, appointmentsResult, guestAppointmentsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('guest_clients')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select('user_id, total_price, appointment_date, status')
        .neq('status', 'cancelled'),
      supabase
        .from('appointments')
        .select('guest_client_id, total_price, appointment_date, status')
        .not('guest_client_id', 'is', null)
        .neq('status', 'cancelled')
    ]);

    if (profilesResult.error) {
      console.error('Error fetching clients:', profilesResult.error);
      setLoading(false);
      return;
    }

    const profiles = profilesResult.data || [];
    const guestClients = guestClientsResult.data || [];
    const appointments = appointmentsResult.data || [];
    const guestAppointments = guestAppointmentsResult.data || [];

    // Pre-compute stats by user_id using a Map for O(1) lookups
    const statsByUser = new Map<string, {
      total_appointments: number;
      total_spent: number;
      last_appointment: string | null;
    }>();

    appointments.forEach(apt => {
      const userId = apt.user_id;
      if (!statsByUser.has(userId)) {
        statsByUser.set(userId, {
          total_appointments: 0,
          total_spent: 0,
          last_appointment: null
        });
      }
      
      const stats = statsByUser.get(userId)!;
      stats.total_appointments++;
      
      if (apt.status === 'completed') {
        stats.total_spent += Number(apt.total_price || 0);
      }
      
      if (!stats.last_appointment || apt.appointment_date > stats.last_appointment) {
        stats.last_appointment = apt.appointment_date;
      }
    });

    // Pre-compute stats for guest clients
    const statsByGuestClient = new Map<string, {
      total_appointments: number;
      total_spent: number;
      last_appointment: string | null;
    }>();

    guestAppointments.forEach(apt => {
      const guestId = apt.guest_client_id;
      if (!guestId) return;
      
      if (!statsByGuestClient.has(guestId)) {
        statsByGuestClient.set(guestId, {
          total_appointments: 0,
          total_spent: 0,
          last_appointment: null
        });
      }
      
      const stats = statsByGuestClient.get(guestId)!;
      stats.total_appointments++;
      
      if (apt.status === 'completed') {
        stats.total_spent += Number(apt.total_price || 0);
      }
      
      if (!stats.last_appointment || apt.appointment_date > stats.last_appointment) {
        stats.last_appointment = apt.appointment_date;
      }
    });

    // Map profiles with pre-computed stats
    const clientsFromProfiles: Client[] = profiles.map(profile => {
      const stats = statsByUser.get(profile.user_id) || {
        total_appointments: 0,
        total_spent: 0,
        last_appointment: null
      };

      return {
        ...profile,
        total_appointments: stats.total_appointments,
        total_spent: stats.total_spent,
        last_appointment: stats.last_appointment,
        is_guest: false
      };
    });

    // Map guest clients with their stats
    const clientsFromGuests: Client[] = guestClients.map(guest => {
      const stats = statsByGuestClient.get(guest.id) || {
        total_appointments: guest.total_visits || 0,
        total_spent: Number(guest.total_spent) || 0,
        last_appointment: guest.last_visit_at
      };

      return {
        id: guest.id,
        user_id: guest.id, // Use guest id as user_id for consistency
        name: guest.name,
        phone: guest.phone,
        avatar_url: null,
        created_at: guest.created_at,
        total_appointments: stats.total_appointments || guest.total_visits || 0,
        total_spent: stats.total_spent || Number(guest.total_spent) || 0,
        last_appointment: stats.last_appointment || guest.last_visit_at,
        is_guest: true
      };
    });

    // Combine both lists, profiles first then guests
    const allClients = [...clientsFromProfiles, ...clientsFromGuests];
    
    // Sort by created_at descending
    allClients.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setClients(allClients);
    setLoading(false);
  }

  async function deleteClient(userId: string, isGuest: boolean = false) {
    try {
      if (isGuest) {
        // Delete guest client
        // 1. Get all appointments for this guest client
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('guest_client_id', userId);

        // 2. Delete appointment_services for those appointments
        if (appointments && appointments.length > 0) {
          const appointmentIds = appointments.map(a => a.id);
          await supabase
            .from('appointment_services')
            .delete()
            .in('appointment_id', appointmentIds);
          
          // 3. Delete blocked_slots for those appointments
          await supabase
            .from('blocked_slots')
            .delete()
            .in('appointment_id', appointmentIds);
        }

        // 4. Update appointments to remove guest_client_id reference
        await supabase
          .from('appointments')
          .update({ guest_client_id: null })
          .eq('guest_client_id', userId);

        // 5. Delete guest_client
        const { error } = await supabase
          .from('guest_clients')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Error deleting guest client:', error);
          toast({ title: "Erro", description: "Não foi possível excluir cliente.", variant: "destructive" });
          return false;
        }
      } else {
        // Delete regular client (profile)
        // 1. Get all client packages for this user
        const { data: clientPackages } = await supabase
          .from('client_packages')
          .select('id')
          .eq('user_id', userId);

        // 2. Delete client_package_usage for those packages
        if (clientPackages && clientPackages.length > 0) {
          const packageIds = clientPackages.map(p => p.id);
          await supabase
            .from('client_package_usage')
            .delete()
            .in('client_package_id', packageIds);
        }

        // 3. Delete client_packages
        await supabase
          .from('client_packages')
          .delete()
          .eq('user_id', userId);

        // 4. Get profile id for client_notes
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          // 5. Delete client_notes
          await supabase
            .from('client_notes')
            .delete()
            .eq('client_id', profile.id);
        }

        // 6. Get all appointments for this user
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', userId);

        // 7. Delete appointment_services for those appointments
        if (appointments && appointments.length > 0) {
          const appointmentIds = appointments.map(a => a.id);
          await supabase
            .from('appointment_services')
            .delete()
            .in('appointment_id', appointmentIds);
        }

        // 8. Delete appointments
        await supabase
          .from('appointments')
          .delete()
          .eq('user_id', userId);

        // 9. Delete profile
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('Error deleting profile:', error);
          toast({ title: "Erro", description: "Não foi possível excluir cliente.", variant: "destructive" });
          return false;
        }
      }

      toast({ title: "Cliente excluído!", description: "Todos os dados foram removidos." });
      fetchClients();
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({ title: "Erro", description: "Não foi possível excluir cliente.", variant: "destructive" });
      return false;
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, loading, fetchClients, deleteClient };
}

export function useClientNotes(clientId: string | null) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function fetchNotes() {
    if (!clientId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (!error) setNotes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [clientId]);

  async function addNote(note: string) {
    if (!clientId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('client_notes')
      .insert({ client_id: clientId, note, admin_id: user?.id });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar nota.", variant: "destructive" });
      return false;
    }

    toast({ title: "Nota adicionada!" });
    fetchNotes();
    return true;
  }

  return { notes, loading, addNote, fetchNotes };
}

export function useAdminServices() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchServices() {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('price', { ascending: false });

    if (!error) setServices(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function createService(service: any) {
    const { error } = await supabase.from('services').insert(service);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar serviço.", variant: "destructive" });
      return false;
    }
    toast({ title: "Serviço criado!" });
    fetchServices();
    return true;
  }

  async function updateService(id: string, service: any) {
    const { error } = await supabase.from('services').update(service).eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return false;
    }
    toast({ title: "Serviço atualizado!" });
    fetchServices();
    return true;
  }

  async function deleteService(id: string) {
    console.log('Deleting service:', id);
    const { error, data } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .select();
    
    console.log('Delete result:', { error, data });
    
    if (error) {
      console.error('Delete service error:', error);
      toast({ title: "Erro", description: error.message || "Não foi possível remover.", variant: "destructive" });
      return false;
    }
    
    if (!data || data.length === 0) {
      toast({ title: "Erro", description: "Serviço não encontrado ou sem permissão.", variant: "destructive" });
      return false;
    }
    
    toast({ title: "Serviço removido!" });
    fetchServices();
    return true;
  }

  return { services, loading, fetchServices, createService, updateService, deleteService };
}

export function useBusinessStatus() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchStatus() {
    const today = new Date().getDay();
    const { data } = await supabase
      .from('business_hours')
      .select('is_open')
      .eq('day_of_week', today)
      .single();

    setIsOpen(data?.is_open ?? false);
    setLoading(false);
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function toggleStatus() {
    const today = new Date().getDay();
    const { error } = await supabase
      .from('business_hours')
      .update({ is_open: !isOpen })
      .eq('day_of_week', today);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível alterar status.", variant: "destructive" });
      return;
    }

    setIsOpen(!isOpen);
    toast({ title: isOpen ? "Barbearia fechada!" : "Barbearia aberta!" });
  }

  return { isOpen, loading, toggleStatus };
}

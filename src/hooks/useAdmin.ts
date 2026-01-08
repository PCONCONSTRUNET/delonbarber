import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  total_price: number;
  total_duration: number;
  payment_status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  user_id: string;
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

    const appointmentsWithServices: AdminAppointment[] = [];
    
    for (const apt of appointmentsData || []) {
      const { data: servicesData } = await supabase
        .from('appointment_services')
        .select('service_id, price_at_booking, services(id, name)')
        .eq('appointment_id', apt.id);

      appointmentsWithServices.push({
        ...apt,
        profile: apt.profiles,
        services: servicesData?.map((s: any) => ({
          id: s.services?.id,
          name: s.services?.name,
          price: s.price_at_booking
        })) || []
      });
    }

    setAppointments(appointmentsWithServices);
    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function updateAppointmentStatus(id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
      return false;
    }

    toast({ title: "Atualizado!", description: "Status alterado com sucesso." });
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

    toast({ title: "Atualizado!", description: "Pagamento registrado." });
    fetchAppointments();
    return true;
  }

  return { appointments, loading, fetchAppointments, updateAppointmentStatus, updatePaymentStatus };
}

export function useAdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchClients() {
    setLoading(true);

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      setLoading(false);
      return;
    }

    const clientsWithStats: Client[] = [];

    for (const profile of profiles || []) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('total_price, appointment_date, status')
        .eq('user_id', profile.user_id)
        .neq('status', 'cancelled');

      const completedAppts = appointments?.filter(a => a.status === 'completed') || [];
      const totalSpent = completedAppts.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      const lastAppt = appointments?.sort((a, b) => 
        new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      )[0];

      clientsWithStats.push({
        ...profile,
        total_appointments: appointments?.length || 0,
        total_spent: totalSpent,
        last_appointment: lastAppt?.appointment_date || null
      });
    }

    setClients(clientsWithStats);
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  return { clients, loading, fetchClients };
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

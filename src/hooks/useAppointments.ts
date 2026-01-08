import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  category: string;
}

export interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  total_price: number;
  total_duration: number;
  created_at: string;
  services: Service[];
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data || []);
      }
      setLoading(false);
    }

    fetchServices();
  }, []);

  return { services, loading };
}

export function useBusinessHours() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinessHours() {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error fetching business hours:', error);
      } else {
        setBusinessHours(data || []);
      }
      setLoading(false);
    }

    fetchBusinessHours();
  }, []);

  return { businessHours, loading };
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchAppointments() {
    setLoading(true);
    
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      setLoading(false);
      return;
    }

    // Fetch services for each appointment
    const appointmentsWithServices: Appointment[] = [];
    
    for (const apt of appointmentsData || []) {
      const { data: servicesData } = await supabase
        .from('appointment_services')
        .select('service_id, price_at_booking, services(*)')
        .eq('appointment_id', apt.id);

      appointmentsWithServices.push({
        ...apt,
        services: servicesData?.map((s: any) => s.services) || []
      });
    }

    setAppointments(appointmentsWithServices);
    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function createAppointment(
    selectedServices: Service[],
    date: Date,
    time: string,
    notes: string,
    paymentMethod?: string
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para agendar.",
        variant: "destructive"
      });
      return null;
    }

    // Check for active package benefits
    const { data: activePackages } = await supabase
      .from('client_packages')
      .select('id, package_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0]);

    // Get benefits and usage for active packages
    const benefitsToUse: { clientPackageId: string; serviceId: string }[] = [];
    const servicesWithBenefits: string[] = [];

    if (activePackages && activePackages.length > 0) {
      for (const pkg of activePackages) {
        // Get benefits for this package
        const { data: benefits } = await supabase
          .from('package_benefits')
          .select('service_id, quantity')
          .eq('package_id', pkg.package_id);

        // Get current usage for this client package
        const { data: usage } = await supabase
          .from('client_package_usage')
          .select('service_id')
          .eq('client_package_id', pkg.id);

        const usageByService = (usage || []).reduce((acc, u) => {
          acc[u.service_id] = (acc[u.service_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Check which selected services have available benefits
        for (const service of selectedServices) {
          // Skip if we already found a benefit for this service
          if (servicesWithBenefits.includes(service.id)) continue;

          const benefit = benefits?.find(b => b.service_id === service.id);
          if (benefit) {
            const used = usageByService[service.id] || 0;
            const remaining = benefit.quantity - used;
            if (remaining > 0) {
              benefitsToUse.push({
                clientPackageId: pkg.id,
                serviceId: service.id,
              });
              servicesWithBenefits.push(service.id);
            }
          }
        }
      }
    }

    // Calculate price (services with benefits are free)
    const totalPrice = selectedServices.reduce((sum, s) => {
      if (servicesWithBenefits.includes(s.id)) {
        return sum; // Free - covered by package
      }
      return sum + Number(s.price);
    }, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

    // Create appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        appointment_date: date.toISOString().split('T')[0],
        appointment_time: time,
        notes: notes || null,
        total_price: totalPrice,
        total_duration: totalDuration,
        status: 'pending',
        payment_method: paymentMethod || null
      })
      .select()
      .single();

    if (aptError) {
      console.error('Error creating appointment:', aptError);
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento.",
        variant: "destructive"
      });
      return null;
    }

    // Add services to appointment
    const appointmentServices = selectedServices.map(service => ({
      appointment_id: appointment.id,
      service_id: service.id,
      price_at_booking: servicesWithBenefits.includes(service.id) ? 0 : service.price
    }));

    const { error: servicesError } = await supabase
      .from('appointment_services')
      .insert(appointmentServices);

    if (servicesError) {
      console.error('Error adding services:', servicesError);
    }

    // Register benefit usage for services covered by packages
    if (benefitsToUse.length > 0) {
      const usageRecords = benefitsToUse.map(b => ({
        client_package_id: b.clientPackageId,
        service_id: b.serviceId,
        appointment_id: appointment.id,
      }));

      const { error: usageError } = await supabase
        .from('client_package_usage')
        .insert(usageRecords);

      if (usageError) {
        console.error('Error registering usage:', usageError);
      }
    }

    // Show appropriate toast message
    if (benefitsToUse.length > 0) {
      toast({
        title: "Agendamento criado! 🎉",
        description: `${benefitsToUse.length} serviço(s) utilizando benefício do pacote VIP.`,
      });
    } else {
      toast({
        title: "Agendamento criado!",
        description: "Seu agendamento foi realizado com sucesso.",
      });
    }

    fetchAppointments();
    return { ...appointment, benefitsUsed: benefitsToUse.length };
  }

  async function cancelAppointment(appointmentId: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive"
      });
      return false;
    }

    toast({
      title: "Agendamento cancelado",
      description: "Seu agendamento foi cancelado.",
    });

    fetchAppointments();
    return true;
  }

  return { 
    appointments, 
    loading, 
    createAppointment, 
    cancelAppointment,
    refetch: fetchAppointments 
  };
}

export function useBookedSlots(date: Date | undefined) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!date) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date.toISOString().split('T')[0])
        .in('status', ['pending', 'confirmed']);

      if (error) {
        console.error('Error fetching booked slots:', error);
      } else {
        setBookedSlots(data?.map(a => a.appointment_time) || []);
      }
    }

    fetchBookedSlots();
  }, [date]);

  return bookedSlots;
}

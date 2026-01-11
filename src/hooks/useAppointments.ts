import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { sendPushToAdmins } from '@/lib/pushNotifications';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  category: string;
  subscribers_only?: boolean;
}

export interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
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
    const { data: activePackages, error: pkgError } = await supabase
      .from('client_packages')
      .select('id, package_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (pkgError) {
      console.error('Error fetching active packages:', pkgError);
    }

    console.log('Active packages for user:', activePackages);

    // Get benefits and usage for active packages
    const benefitsToUse: { clientPackageId: string; serviceId: string }[] = [];
    const servicesWithBenefits: string[] = [];
    const weeklyBlockedServices: string[] = [];

    // Calculate current week boundaries (Monday to Sunday)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    console.log('Week boundaries:', { weekStart, weekEnd });

    if (activePackages && activePackages.length > 0) {
      for (const pkg of activePackages) {
        // Get benefits for this package with weekly_limit
        const { data: benefits, error: benefitsError } = await supabase
          .from('package_benefits')
          .select('service_id, quantity, weekly_limit')
          .eq('package_id', pkg.package_id);

        if (benefitsError) {
          console.error('Error fetching benefits:', benefitsError);
          continue;
        }

        console.log('Benefits for package', pkg.id, ':', benefits);

        // Get current usage for this client package
        const { data: usage, error: usageError } = await supabase
          .from('client_package_usage')
          .select('service_id, used_at')
          .eq('client_package_id', pkg.id);

        if (usageError) {
          console.error('Error fetching usage:', usageError);
        }

        console.log('Current usage for package', pkg.id, ':', usage);

        // Count total usage per service
        const usageByService = (usage || []).reduce((acc, u) => {
          acc[u.service_id] = (acc[u.service_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Count usage THIS WEEK per service
        const usageThisWeekByService = (usage || []).reduce((acc, u) => {
          const usedAt = new Date(u.used_at);
          if (usedAt >= weekStart && usedAt <= weekEnd) {
            acc[u.service_id] = (acc[u.service_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        console.log('Usage by service:', usageByService);
        console.log('Usage this week by service:', usageThisWeekByService);

        // Check which selected services have available benefits
        for (const service of selectedServices) {
          // Skip if we already found a benefit for this service
          if (servicesWithBenefits.includes(service.id)) continue;
          if (weeklyBlockedServices.includes(service.id)) continue;

          const benefit = benefits?.find(b => b.service_id === service.id);
          console.log('Checking service', service.name, ':', { benefit, serviceId: service.id });
          
          if (benefit) {
            const used = usageByService[service.id] || 0;
            const remaining = benefit.quantity - used;
            
            console.log('Benefit found:', { used, remaining, quantity: benefit.quantity, weeklyLimit: benefit.weekly_limit });
            
            // Check weekly limit if applicable
            if (benefit.weekly_limit !== null && benefit.weekly_limit > 0) {
              const usedThisWeek = usageThisWeekByService[service.id] || 0;
              const remainingThisWeek = benefit.weekly_limit - usedThisWeek;
              
              console.log('Weekly limit check:', { usedThisWeek, remainingThisWeek, weeklyLimit: benefit.weekly_limit });
              
              if (remainingThisWeek <= 0) {
                // Weekly limit reached - block this service
                console.log('Weekly limit reached for service:', service.name);
                weeklyBlockedServices.push(service.id);
                continue;
              }
            }
            
            if (remaining > 0) {
              console.log('Adding benefit to use:', { clientPackageId: pkg.id, serviceId: service.id });
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

    console.log('Final benefits to use:', benefitsToUse);
    console.log('Services with benefits:', servicesWithBenefits);
    console.log('Weekly blocked services:', weeklyBlockedServices);

    // If any services are blocked by weekly limit and user is trying to use as subscriber
    if (weeklyBlockedServices.length > 0 && paymentMethod === 'subscriber') {
      const blockedServiceNames = selectedServices
        .filter(s => weeklyBlockedServices.includes(s.id))
        .map(s => s.name)
        .join(', ');
      
      toast({
        title: "Limite semanal atingido",
        description: `Você já usou o limite semanal para: ${blockedServiceNames}. Aguarde a próxima segunda-feira.`,
        variant: "destructive"
      });
      return null;
    }

    // IMPORTANT: If user selected subscriber payment but there are services without benefits
    // we should block this - they can't use subscriber payment for services not in package
    if (paymentMethod === 'subscriber') {
      const servicesWithoutBenefits = selectedServices.filter(s => !servicesWithBenefits.includes(s.id));
      if (servicesWithoutBenefits.length > 0) {
        const names = servicesWithoutBenefits.map(s => s.name).join(', ');
        toast({
          title: "Serviço não incluído no pacote",
          description: `Os seguintes serviços não estão no seu pacote: ${names}. Escolha outro método de pagamento.`,
          variant: "destructive"
        });
        return null;
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

    // If using subscriber payment, mark as paid automatically
    const isSubscriberPayment = paymentMethod === 'subscriber';

    // Create appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        appointment_date: format(date, 'yyyy-MM-dd'),
        appointment_time: time,
        notes: notes || null,
        total_price: isSubscriberPayment ? 0 : totalPrice,
        total_duration: totalDuration,
        status: 'confirmed',
        payment_method: paymentMethod || null,
        payment_status: isSubscriberPayment ? 'paid' : 'pending',
        payment_date: isSubscriberPayment ? new Date().toISOString() : null,
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
    // CRITICAL: This must be done when using subscriber payment method
    if (benefitsToUse.length > 0 || (isSubscriberPayment && servicesWithBenefits.length > 0)) {
      // Use benefitsToUse if available, otherwise build from servicesWithBenefits for subscriber payments
      const recordsToInsert = benefitsToUse.length > 0 ? benefitsToUse : [];
      
      console.log('Registering usage records:', recordsToInsert);
      
      if (recordsToInsert.length > 0) {
        const usageRecords = recordsToInsert.map(b => ({
          client_package_id: b.clientPackageId,
          service_id: b.serviceId,
          appointment_id: appointment.id,
        }));

        console.log('Inserting usage records:', usageRecords);

        const { data: insertedUsage, error: usageError } = await supabase
          .from('client_package_usage')
          .insert(usageRecords)
          .select();

        if (usageError) {
          console.error('Error registering usage:', usageError);
          // Still show error to user but don't fail the appointment
          toast({
            title: "Atenção",
            description: "O agendamento foi criado, mas houve um erro ao registrar o uso do benefício.",
            variant: "destructive"
          });
        } else {
          console.log('Usage records inserted successfully:', insertedUsage);
        }
      }
    }

    // Notify admins about new appointment
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: '📅 Novo Agendamento',
        message: `${selectedServices.map(s => s.name).join(', ')} para ${date.toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}`,
        type: 'info',
        appointment_id: appointment.id
      }));

      await supabase.from('notifications').insert(notifications);

      // Send push notification to admins (for background alerts)
      sendPushToAdmins(
        '📅 Novo Agendamento',
        `${selectedServices.map(s => s.name).join(', ')} para ${date.toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}`
      );
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

      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch booked appointments
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (aptError) {
        console.error('Error fetching booked slots:', aptError);
      }

      // Fetch blocked slots
      const { data: blockedSlots, error: blockedError } = await supabase
        .from('blocked_slots')
        .select('blocked_time')
        .eq('blocked_date', dateStr);

      if (blockedError) {
        console.error('Error fetching blocked slots:', blockedError);
      }

      // Combine both - blocked slots and booked appointments
      const bookedTimes = appointments?.map(a => a.appointment_time) || [];
      const blockedTimes = blockedSlots?.map(b => b.blocked_time) || [];
      
      // Merge and deduplicate
      const allBlockedSlots = [...new Set([...bookedTimes, ...blockedTimes])];
      setBookedSlots(allBlockedSlots);
    }

    fetchBookedSlots();
  }, [date]);

  return bookedSlots;
}

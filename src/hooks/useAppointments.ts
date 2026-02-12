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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
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
    
    // Get current user to filter appointments
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });
    
    // Filter by user_id for non-admin users
    if (user) {
      query = query.eq('user_id', user.id);
    }

    const { data: appointmentsData, error: appointmentsError } = await query;

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      setLoading(false);
      return;
    }

    if (!appointmentsData || appointmentsData.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    // Fetch all appointment services in a single query
    const appointmentIds = appointmentsData.map(a => a.id);
    const { data: allServicesData } = await supabase
      .from('appointment_services')
      .select('appointment_id, service_id, price_at_booking, services(*)')
      .in('appointment_id', appointmentIds);

    // Group services by appointment_id
    const servicesByAppointment: Record<string, any[]> = {};
    (allServicesData || []).forEach((s: any) => {
      if (!servicesByAppointment[s.appointment_id]) {
        servicesByAppointment[s.appointment_id] = [];
      }
      servicesByAppointment[s.appointment_id].push(s.services);
    });

    const appointmentsWithServices: Appointment[] = appointmentsData.map(apt => ({
      ...apt,
      services: servicesByAppointment[apt.id] || []
    }));

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
      .select('id, package_id, start_date, end_date')
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

    // Calculate week boundaries for the SELECTED DATE (not current date)
    // This allows VIP clients to schedule multiple future appointments in different weeks
    const appointmentDate = date;
    const weekStart = startOfWeek(appointmentDate, { weekStartsOn: 1 }); // Monday of appointment week
    const weekEnd = endOfWeek(appointmentDate, { weekStartsOn: 1 }); // Sunday of appointment week
    const appointmentDateStr = format(appointmentDate, 'yyyy-MM-dd');

    console.log('Week boundaries for appointment date:', { appointmentDate, weekStart, weekEnd });

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

        // Count usage THIS WEEK per service (based on usage records - for completed appointments)
        const usageThisWeekByService = (usage || []).reduce((acc, u) => {
          const usedAt = new Date(u.used_at);
          if (usedAt >= weekStart && usedAt <= weekEnd) {
            acc[u.service_id] = (acc[u.service_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        console.log('Usage by service:', usageByService);
        console.log('Usage this week by service:', usageThisWeekByService);

        // ALSO check for SCHEDULED appointments in the same week (pending/confirmed)
        // This prevents double-booking the same week even if usage hasn't been recorded yet
        const { data: scheduledAppointments } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_services!inner(service_id)
          `)
          .eq('user_id', user.id)
          .gte('appointment_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('appointment_date', format(weekEnd, 'yyyy-MM-dd'))
          .in('status', ['pending', 'confirmed']);

        // Count scheduled appointments this week per service
        const scheduledThisWeekByService: Record<string, number> = {};
        scheduledAppointments?.forEach((apt: any) => {
          apt.appointment_services.forEach((as: any) => {
            scheduledThisWeekByService[as.service_id] = (scheduledThisWeekByService[as.service_id] || 0) + 1;
          });
        });

        console.log('Scheduled appointments this week by service:', scheduledThisWeekByService);

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
            // IMPORTANT: Consider BOTH completed usage AND scheduled (pending/confirmed) appointments
            if (benefit.weekly_limit !== null && benefit.weekly_limit > 0) {
              // Only count SCHEDULED appointments for future weeks (not usage records)
              // This allows VIP to schedule multiple future appointments in different weeks
              const scheduledThisWeek = scheduledThisWeekByService[service.id] || 0;
              const remainingThisWeek = benefit.weekly_limit - scheduledThisWeek;
              
              console.log('Weekly limit check:', { 
                scheduledThisWeek, 
                remainingThisWeek, 
                weeklyLimit: benefit.weekly_limit 
              });
              
              if (remainingThisWeek <= 0) {
                // Weekly limit reached for THIS APPOINTMENT'S WEEK - block this service
                console.log('Weekly limit reached for service in appointment week:', service.name);
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
      
      // Format the week for the error message
      const weekStartFormatted = format(weekStart, 'dd/MM');
      const weekEndFormatted = format(weekEnd, 'dd/MM');
      
      toast({
        title: "Limite semanal atingido",
        description: `Você já tem agendamento para: ${blockedServiceNames} na semana ${weekStartFormatted} - ${weekEndFormatted}. Escolha outra semana.`,
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

    // Create appointment - auto-confirmed
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

    // Notify admins via push notification (DB trigger already creates the notification record)
    sendPushToAdmins(
      '📅 Novo Agendamento',
      `${selectedServices.map(s => s.name).join(', ')} para ${date.toLocaleDateString('pt-BR')} às ${time.slice(0, 5)}`
    );

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
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive"
      });
      return false;
    }

    // Blocked slots are released automatically by database trigger

    toast({
      title: "Agendamento cancelado",
      description: "Seu agendamento foi cancelado e o horário foi liberado.",
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

// Helper function to calculate blocked time slots based on duration
function calculateBlockedSlots(startTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [hours, minutes] = startTime.split(':').map(Number);
  
  let currentMinutes = hours * 60 + minutes;
  const endMinutes = currentMinutes + durationMinutes;
  
  // Block slots in 30-minute increments until the service duration is covered
  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    currentMinutes += 30;
  }
  
  return slots;
}

export function useBookedSlots(date: Date | undefined) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!date) return;

      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch booked appointments WITH total_duration to calculate blocked slots
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('appointment_time, total_duration')
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

      // Calculate all blocked times based on appointment duration
      const allBookedTimes: string[] = [];
      
      for (const apt of appointments || []) {
        const duration = apt.total_duration || 30; // Default to 30 minutes if not set
        const blockedForAppointment = calculateBlockedSlots(apt.appointment_time, duration);
        allBookedTimes.push(...blockedForAppointment);
      }
      
      // Add manually blocked slots
      const blockedTimes = blockedSlots?.map(b => b.blocked_time) || [];
      
      // Merge and deduplicate
      const allBlockedSlots = [...new Set([...allBookedTimes, ...blockedTimes])];
      setBookedSlots(allBlockedSlots);
    }

    fetchBookedSlots();
  }, [date]);

  return bookedSlots;
}

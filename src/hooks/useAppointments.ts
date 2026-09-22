import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { notifyAdmin } from '@/lib/oneSignalPush';


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
      .order('appointment_date', { ascending: false })
      .limit(50); // Most recent 50 is enough for client history view
    
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
    const { data: appointmentsServices } = await supabase
      .from('appointment_services')
      .select('appointment_id, service_id, price_at_booking, services(*)')
      .in('appointment_id', appointmentIds);

    // Group services by appointment_id
    const servicesByAppointment: Record<string, any[]> = {};
    (appointmentsServices || []).forEach((s: any) => {
      if (!servicesByAppointment[s.appointment_id]) {
        servicesByAppointment[s.appointment_id] = [];
      }
      if (s.services) {
        servicesByAppointment[s.appointment_id].push(s.services);
      } else {
        servicesByAppointment[s.appointment_id].push({
          id: s.service_id || Math.random().toString(),
          name: 'Serviço Removido',
          price: 0,
          duration_minutes: 0,
          category: 'outro'
        });
      }
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
      .select('id, package_id, start_date, end_date, packages:package_id(type)')
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

    // ── PLANO SEQUENCIAL ──────────────────────────────────────────────────────
    // Detecta se o cliente tem plano sequencial ativo e quais serviços do ciclo
    // atual devem ser cobertos gratuitamente.
    let isSequentialCovered = false;
    let sequentialClientPackageId: string | null = null;
    const sequentialCycleServiceIds: string[] = [];

    if (activePackages && activePackages.length > 0) {
      for (const pkg of activePackages as any[]) {
        const pkgType = pkg.packages?.type;
        if (pkgType !== 'sequential') continue;

        // Busca ciclos do pacote
        const { data: cycles } = await supabase
          .from('package_cycles')
          .select('sequence_order, service_id')
          .eq('package_id', pkg.package_id)
          .order('sequence_order', { ascending: true });

        if (!cycles || cycles.length === 0) continue;

        // Busca usos já registrados para calcular o índice do ciclo ativo
        const { data: usageSeq } = await supabase
          .from('client_package_usage')
          .select('appointment_id')
          .eq('client_package_id', pkg.id);

        // Conta appointments distintos (incluindo skips sem appointment_id como 1 uso cada)
        const distinctAppointments = new Set(
          (usageSeq || []).map((u: any) => u.appointment_id).filter((id: any) => id != null)
        );
        const skipCount = (usageSeq || []).filter((u: any) => u.appointment_id == null).length;
        const usageCount = distinctAppointments.size + skipCount;

        // Agrupa ciclos por sequence_order
        const cyclesMap = new Map<number, string[]>();
        cycles.forEach((c: any) => {
          if (!cyclesMap.has(c.sequence_order)) cyclesMap.set(c.sequence_order, []);
          cyclesMap.get(c.sequence_order)!.push(c.service_id);
        });
        const groupedCyclesArray = Array.from(cyclesMap.keys()).sort((a, b) => a - b).map(k => cyclesMap.get(k)!);

        if (groupedCyclesArray.length === 0) continue;

        const activeCycleIndex = usageCount % groupedCyclesArray.length;
        const activeCycleIds = groupedCyclesArray[activeCycleIndex];

        // Verifica se TODOS os serviços selecionados estão no ciclo ativo
        const allMatch = selectedServices.every(s => activeCycleIds.includes(s.id));
        if (allMatch) {
          isSequentialCovered = true;
          sequentialClientPackageId = pkg.id;
          sequentialCycleServiceIds.push(...activeCycleIds);
          // Marca todos os serviços do ciclo como cobertos
          selectedServices.forEach(s => {
            if (!servicesWithBenefits.includes(s.id)) servicesWithBenefits.push(s.id);
          });
          console.log('Sequential package covers this appointment. Cycle index:', activeCycleIndex, 'Services:', activeCycleIds);
          break;
        }
      }
    }
    // ── FIM PLANO SEQUENCIAL ─────────────────────────────────────────────────

    if (activePackages && activePackages.length > 0) {
      for (const pkg of activePackages as any[]) {
        // Pula pacotes sequenciais (já tratados acima)
        if (pkg.packages?.type === 'sequential') continue;

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
        const usageByService = (usage || []).reduce((acc: Record<string, number>, u: any) => {
          acc[u.service_id] = (acc[u.service_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Count usage THIS WEEK per service (based on usage records)
        // using the appointment week boundaries
        const usageThisWeekByService = (usage || []).reduce((acc: Record<string, number>, u: any) => {
          const usedAtStr = u.used_at ? u.used_at.substring(0, 10) : '';
          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
          
          if (usedAtStr >= weekStartStr && usedAtStr <= weekEndStr) {
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

          const benefit = (benefits as any[])?.find((b: any) => b.service_id === service.id);
          console.log('Checking service', service.name, ':', { benefit, serviceId: service.id });
          
          if (benefit) {
            const used = usageByService[service.id] || 0;
            const remaining = benefit.quantity - used;
            
            console.log('Benefit found:', { used, remaining, quantity: benefit.quantity, weeklyLimit: benefit.weekly_limit });
            
            // Check weekly limit if applicable
            if (benefit.weekly_limit !== null && benefit.weekly_limit > 0) {
              const usedThisWeek = usageThisWeekByService[service.id] || 0;
              const remainingThisWeek = benefit.weekly_limit - usedThisWeek;
              
              console.log('Weekly limit check:', { 
                usedThisWeek, 
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
    console.log('Is sequential covered:', isSequentialCovered);

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
    // (only for non-sequential; sequential is auto-detected above)
    if (paymentMethod === 'subscriber' && !isSequentialCovered) {
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

    // Calculate price (services with benefits or sequential cycle are free)
    const totalPrice = selectedServices.reduce((sum, s) => {
      if (servicesWithBenefits.includes(s.id)) {
        return sum; // Free - covered by package or sequential cycle
      }
      return sum + Number(s.price);
    }, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

    // Se plano sequencial cobre, força subscriber como método de pagamento
    const effectivePaymentMethod = isSequentialCovered ? 'subscriber' : paymentMethod;

    // If using subscriber payment, mark as paid automatically
    const isSubscriberPayment = effectivePaymentMethod === 'subscriber';

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
        payment_method: effectivePaymentMethod || null,
        payment_status: isSubscriberPayment ? 'paid' : 'pending',
        payment_date: isSubscriberPayment ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (aptError) {
      console.error('Error creating appointment:', aptError);
      console.error('aptError details:', JSON.stringify(aptError, null, 2));
      // Detect conflict/block errors raised by the DB trigger
      // The PostgreSQL RAISE EXCEPTION message can appear in message, details, or hint
      const msg: string = [
        aptError.message || '',
        (aptError as any).details || '',
        (aptError as any).hint || '',
      ].join(' ');
      if (msg.includes('SLOT_CONFLICT')) {
        toast({
          title: "⚠️ Horário indisponível",
          description: "Este horário acabou de ser ocupado por outro cliente. Por favor, escolha outro horário.",
          variant: "destructive"
        });
      } else if (msg.includes('SLOT_BLOCKED')) {
        toast({
          title: "⚠️ Horário bloqueado",
          description: "Este horário está bloqueado pelo administrador. Por favor, escolha outro horário.",
          variant: "destructive"
        });
      } else if (msg.includes('CLOSED_DAY')) {
        toast({
          title: "⚠️ Dia fechado",
          description: "O estabelecimento não atende neste dia da semana. Escolha outra data.",
          variant: "destructive"
        });
      } else if (msg.includes('OUTSIDE_HOURS')) {
        toast({
          title: "⚠️ Fora do horário",
          description: "O horário selecionado está fora do horário de funcionamento. Escolha um horário dentro do expediente.",
          variant: "destructive"
        });
      } else if (msg.includes('LUNCH_BREAK')) {
        toast({
          title: "⚠️ Intervalo de almoço",
          description: "Este horário coincide com o intervalo de almoço. Por favor, escolha outro horário.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: `Não foi possível criar o agendamento. Tente novamente. (${aptError.message || aptError.code || 'erro desconhecido'})`,
          variant: "destructive"
        });
      }
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

    // Register benefit usage for services covered by packages (flexible)
    if (benefitsToUse.length > 0) {
      const usageRecords = benefitsToUse.map(b => ({
        client_package_id: b.clientPackageId,
        service_id: b.serviceId,
        appointment_id: appointment.id,
        used_at: new Date(`${format(date, 'yyyy-MM-dd')}T${time}:00`).toISOString()
      }));

      console.log('Inserting flexible usage records:', usageRecords);

      const { error: usageError } = await supabase
        .from('client_package_usage')
        .insert(usageRecords);

      if (usageError) {
        console.error('Error registering flexible usage:', usageError);
        toast({
          title: "Atenção",
          description: "O agendamento foi criado, mas houve um erro ao registrar o uso do benefício.",
          variant: "destructive"
        });
      } else {
        console.log('Flexible usage records inserted successfully');
      }
    }

    // Register usage for SEQUENTIAL packages — each service in the active cycle
    // is inserted separately so the cycle pointer advances correctly.
    if (isSequentialCovered && sequentialClientPackageId) {
      const seqUsageRecords = selectedServices.map(s => ({
        client_package_id: sequentialClientPackageId!,
        service_id: s.id,
        appointment_id: appointment.id,
        used_at: new Date(`${format(date, 'yyyy-MM-dd')}T${time}:00`).toISOString()
      }));

      console.log('Inserting sequential usage records:', seqUsageRecords);

      const { error: seqUsageError } = await supabase
        .from('client_package_usage')
        .insert(seqUsageRecords);

      if (seqUsageError) {
        console.error('Error registering sequential usage:', seqUsageError);
        toast({
          title: "Atenção",
          description: "O agendamento VIP foi criado, mas houve um erro ao registrar o ciclo. Contate o administrador.",
          variant: "destructive"
        });
      } else {
        console.log('Sequential usage records inserted successfully');
      }
    }

    // Push para admin é disparado pelo trigger do banco (send_push_on_new_appointment).
    // Notificação para o cliente foi desabilitada para evitar conflitos de SW no iOS PWA.

    // Show appropriate toast message
    if (isSequentialCovered) {
      toast({
        title: "Agendamento VIP criado! 👑",
        description: "Serviço coberto pelo seu plano sequencial. Grátis!",
      });
    } else if (benefitsToUse.length > 0) {
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

    // Devolve o uso do pacote, caso esse agendamento tenha usado algum benefício
    const { error: usageDeleteError } = await supabase
      .from('client_package_usage')
      .delete()
      .eq('appointment_id', appointmentId);

    if (usageDeleteError) {
      console.warn('Could not delete package usage:', usageDeleteError);
    }

    // Safety net: explicitly delete blocked slots for this appointment
    // in case the database trigger didn't fire properly
    const { error: blockError } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('is_manual', false);

    if (blockError) {
      console.warn('Could not clean blocked slots (trigger may have handled it):', blockError);
    }

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchBookedSlots(targetDate?: Date) {
    const d = targetDate ?? date;
    if (!d) return;

    setIsRefreshing(true);
    const dateStr = format(d, 'yyyy-MM-dd');

    // Fetch booked appointments WITH total_duration to calculate blocked slots
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select('appointment_time, total_duration')
      .eq('appointment_date', dateStr)
      .in('status', ['pending', 'confirmed']);

    if (aptError) {
      console.error('Error fetching booked slots:', aptError);
    }

    // Fetch blocked slots (manual blocks)
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
      const duration = apt.total_duration || 30;
      const blockedForAppointment = calculateBlockedSlots(apt.appointment_time, duration);
      allBookedTimes.push(...blockedForAppointment);
    }
    
    // Add manually blocked slots
    const blockedTimes = blockedSlots?.map(b => b.blocked_time) || [];
    
    // Merge and deduplicate
    const allBlockedSlots = [...new Set([...allBookedTimes, ...blockedTimes])];
    setBookedSlots(allBlockedSlots);
    setIsRefreshing(false);
  }

  // Reload whenever the date changes
  useEffect(() => {
    fetchBookedSlots();
  }, [date]);

  // Poll every 20 seconds so two clients don't see stale data simultaneously
  useEffect(() => {
    if (!date) return;
    const interval = setInterval(() => fetchBookedSlots(), 20_000);
    return () => clearInterval(interval);
  }, [date]);

  return { bookedSlots, isRefreshing, refresh: () => fetchBookedSlots() };
}

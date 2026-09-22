import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Crown } from 'lucide-react';
import { BusinessHours, Service } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMyPackages } from '@/hooks/useMyPackages';
import { useIsExclusiveClient } from '@/hooks/useExclusiveClients';


interface DateTimeSelectionProps {
  businessHours: BusinessHours[];
  bookedSlots: string[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  onSelectDate: (date: Date | undefined) => void;
  onSelectTime: (time: string) => void;
  selectedServices?: Service[];
  isRefreshing?: boolean;
}

export function DateTimeSelection({
  businessHours,
  bookedSlots,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  selectedServices = [],
  isRefreshing = false
}: DateTimeSelectionProps) {
  const { packages } = useMyPackages();
  const { isExclusive: isExclusiveClient, loading: isExclusiveClientLoading } = useIsExclusiveClient();
  const [blockedWeekDates, setBlockedWeekDates] = useState<Date[]>([]);
  const [isVipBooking, setIsVipBooking] = useState(false);
  const [isSequentialVipBooking, setIsSequentialVipBooking] = useState(false);

  // Check if any selected service has VIP benefit with weekly limit OR is sequential
  useEffect(() => {
    async function checkBlockedWeeks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || selectedServices.length === 0) {
        setBlockedWeekDates([]);
        setIsVipBooking(false);
        setIsSequentialVipBooking(false);
        return;
      }

      // ── Plano SEQUENCIAL ──────────────────────────────────────────────
      const activeSequentialPkg = packages.find(
        p => p.status === 'active' && p.package.type === 'sequential'
      );
      const activeCycleIds = (activeSequentialPkg?.activeCycle || []).map(c => c.service_id);
      const isSequential =
        activeCycleIds.length > 0 &&
        selectedServices.length > 0 &&
        selectedServices.every(s => activeCycleIds.includes(s.id));

      if (isSequential) {
        setIsSequentialVipBooking(true);
        setIsVipBooking(true);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

        // Bloqueia do início do pacote até o dia anterior à semana atual (passado)
        const pkgStart = activeSequentialPkg!.start_date
          ? new Date(activeSequentialPkg!.start_date + 'T00:00:00')
          : new Date(today.getFullYear(), today.getMonth() - 3, 1);

        const blockedDates: Date[] = [];

        // Datas PASSADAS (antes da semana atual)
        let cursor = new Date(pkgStart);
        while (cursor < currentWeekStart) {
          blockedDates.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }

        // Datas FUTURAS (após a semana atual — semanas 3, 4... ainda não liberadas)
        const farFuture = new Date(today);
        farFuture.setMonth(farFuture.getMonth() + 6); // bloqueia 6 meses à frente
        let futureCursor = new Date(currentWeekEnd);
        futureCursor.setDate(futureCursor.getDate() + 1); // começa no dia após a semana atual
        while (futureCursor <= farFuture) {
          blockedDates.push(new Date(futureCursor));
          futureCursor.setDate(futureCursor.getDate() + 1);
        }

        setBlockedWeekDates(blockedDates);
        return;
      }

      setIsSequentialVipBooking(false);
      // ── Fim Plano SEQUENCIAL ──────────────────────────────────────────

      // Get service IDs that have weekly limits in user's packages
      const servicesWithWeeklyLimit: { serviceId: string; weeklyLimit: number }[] = [];
      
      for (const pkg of packages) {
        if (pkg.status === 'active') {
          for (const benefit of pkg.benefits) {
            if (benefit.weekly_limit !== null && benefit.weekly_limit > 0 && benefit.remaining > 0) {
              const isSelected = selectedServices.some(s => s.id === benefit.service_id);
              if (isSelected) {
                servicesWithWeeklyLimit.push({
                  serviceId: benefit.service_id,
                  weeklyLimit: benefit.weekly_limit
                });
              }
            }
          }
        }
      }

      if (servicesWithWeeklyLimit.length === 0) {
        setBlockedWeekDates([]);
        setIsVipBooking(false);
        return;
      }

      setIsVipBooking(true);

      // Get all scheduled appointments for the next 60 days
      const today2 = new Date();
      const futureDate = new Date();
      futureDate.setDate(today2.getDate() + 60);

      const { data: scheduledAppointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_services!inner(service_id)
        `)
        .eq('user_id', user.id)
        .gte('appointment_date', format(today2, 'yyyy-MM-dd'))
        .lte('appointment_date', format(futureDate, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed']);

      if (error) {
        console.error('Error fetching scheduled appointments:', error);
        return;
      }

      // Find all dates that are in weeks already having VIP appointments for selected services
      const blockedDates: Date[] = [];

      for (const apt of scheduledAppointments || []) {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00');
        const aptServiceIds = apt.appointment_services.map((as: any) => as.service_id);

        // Check if any selected service with weekly limit is in this appointment
        const hasBlockingService = servicesWithWeeklyLimit.some(s => 
          aptServiceIds.includes(s.serviceId)
        );

        if (hasBlockingService) {
          // Block the entire week of this appointment
          const weekStart = startOfWeek(aptDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(aptDate, { weekStartsOn: 1 });
          
          // Add all dates in this week to blocked dates
          let currentDate = new Date(weekStart);
          while (currentDate <= weekEnd) {
            blockedDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }

      setBlockedWeekDates(blockedDates);
    }

    checkBlockedWeeks();
  }, [selectedServices, packages]);

  // Generate available time slots based on business hours (excluding lunch break)
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);

    if (!dayHours || !dayHours.is_open) return [];

    const slots: string[] = [];
    const [openHour, openMin] = dayHours.open_time.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close_time.split(':').map(Number);

    // Parse lunch break times if they exist
    let lunchStartHour = -1, lunchStartMin = -1, lunchEndHour = -1, lunchEndMin = -1;
    if (dayHours.lunch_start && dayHours.lunch_end) {
      [lunchStartHour, lunchStartMin] = dayHours.lunch_start.split(':').map(Number);
      [lunchEndHour, lunchEndMin] = dayHours.lunch_end.split(':').map(Number);
    }

    let currentHour = openHour;
    let currentMin = openMin;

    // Calculate total duration needed for selected services
    const totalServiceDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0) || 30;
    const closeTimeMinutes = closeHour * 60 + closeMin;
    const lunchStartMinutes = lunchStartHour >= 0 ? lunchStartHour * 60 + lunchStartMin : -1;
    const lunchEndMinutes = lunchEndHour >= 0 ? lunchEndHour * 60 + lunchEndMin : -1;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const currentMinutes = currentHour * 60 + currentMin;
      
      // Check if current time is during lunch break
      const isLunchBreak = lunchStartMinutes >= 0 && (
        currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes
      );

      if (!isLunchBreak) {
        const endMinutes = currentMinutes + totalServiceDuration;
        // Check appointment finishes before closing
        const fitsBeforeClose = endMinutes <= closeTimeMinutes;
        // Check appointment doesn't overlap into lunch break
        const overlapsLunch = lunchStartMinutes >= 0 && 
          currentMinutes < lunchStartMinutes && endMinutes > lunchStartMinutes;
        
        if (fitsBeforeClose && !overlapsLunch) {
          const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}:00`;
          slots.push(timeStr);
        }
      }
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    return slots;
  }, [selectedDate, businessHours, selectedServices]);

  // Check if a date is blocked due to VIP weekly limit
  const isDateBlockedByVip = (date: Date): boolean => {
    return blockedWeekDates.some(blockedDate => 
      blockedDate.toDateString() === date.toDateString()
    );
  };

  // Disable days that are closed OR blocked by VIP weekly limit OR Saturday for non-exclusive
  const disabledDays = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    const isBlockedByVipLimit = isDateBlockedByVip(date);
    // Saturday (6) is blocked for exclusive clients (Subscribers), or while loading to prevent race conditions
    const isSaturdayRestricted = dayOfWeek === 6 && (isExclusiveClient || isExclusiveClientLoading);
    
    return isPast || !dayHours?.is_open || isBlockedByVipLimit || isSaturdayRestricted;
  };

  // Custom day content to show VIP blocked indicator
  const modifiers = useMemo(() => {
    return {
      vipBlocked: blockedWeekDates
    };
  }, [blockedWeekDates]);

  const modifiersClassNames = {
    vipBlocked: isSequentialVipBooking
      ? 'opacity-30 line-through cursor-not-allowed text-red-400'
      : 'bg-yellow-500/20 text-yellow-600 line-through cursor-not-allowed'
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  // Check if selected date is in a VIP-blocked week
  const isSelectedWeekBlocked = selectedDate && isDateBlockedByVip(selectedDate);

  return (
    <div className="space-y-6">

      {/* VIP / Sequential info banner */}
      {isVipBooking && blockedWeekDates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-3 ${
            isSequentialVipBooking
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              {isSequentialVipBooking ? (
                <>
                  <p className="font-medium text-yellow-600">Plano Sequencial VIP</p>
                  <p className="text-muted-foreground mt-0.5">
                    Apenas a semana atual está disponível. Após cada visita, a próxima semana será liberada automaticamente.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-yellow-600">Limite VIP semanal</p>
                  <p className="text-muted-foreground mt-0.5">
                    Semanas com agendamento VIP marcado estão destacadas em amarelo. 
                    Escolha uma semana diferente.
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-card/80 rounded-2xl p-3 overflow-hidden">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDate}
            disabled={disabledDays}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            locale={ptBR}
            className="pointer-events-auto w-full"
            classNames={{
              months: "w-full",
              month: "w-full space-y-3",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs",
              row: "flex w-full mt-1",
              cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(
                "h-10 w-full rounded-xl font-medium transition-colors",
                "hover:bg-primary/10 focus:bg-primary/10"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-bold",
              day_disabled: "text-muted-foreground/40 hover:bg-transparent",
              day_outside: "text-muted-foreground/30",
            }}
          />
          
          <div className="flex flex-wrap justify-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>🟢 Ter-Sáb</span>
            <span>🔴 Dom-Seg</span>
            {isVipBooking && blockedWeekDates.length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500/30"></div>
                VIP ocupado
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Selected date display */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 rounded-2xl p-4 text-center"
        >
          <p className="text-sm text-muted-foreground">Data selecionada</p>
          <p className="text-lg font-semibold text-foreground capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </motion.div>
      )}

      {/* Time slots */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Horários</h3>
          {isRefreshing ? (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block"
              >
                ⏳
              </motion.span>
              Atualizando...
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-500/70">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Ao vivo
            </span>
          )}
        </div>

        {!selectedDate ? (
          <div className="bg-card/50 rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">👆 Selecione uma data</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="bg-card/50 rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">😔 Fechado neste dia</p>
          </div>
        ) : (
        <div className="grid grid-cols-4 gap-2">
            {availableSlots.map((slot, index) => {
              // Calculate required duration for selected services
              const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0) || 30;
              const slotsNeeded = Math.ceil(totalDuration / 30);
              
              // Check if THIS slot and all consecutive slots needed are available
              const [slotHour, slotMin] = slot.split(':').map(Number);
              let hasConflict = false;
              
              for (let i = 0; i < slotsNeeded; i++) {
                const checkMinutes = slotHour * 60 + slotMin + (i * 30);
                const checkHour = Math.floor(checkMinutes / 60);
                const checkMin = checkMinutes % 60;
                const checkSlot = `${String(checkHour).padStart(2, '0')}:${String(checkMin).padStart(2, '0')}:00`;
                
                if (bookedSlots.includes(checkSlot)) {
                  hasConflict = true;
                  break;
                }
              }
              
              const isBooked = bookedSlots.includes(slot) || hasConflict;
              const isSelected = selectedTime === slot;

              // Block past time slots when selected date is today
              const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              let isPastSlot = false;
              if (isToday) {
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const slotMinutes = slotHour * 60 + slotMin;
                isPastSlot = slotMinutes <= nowMinutes;
              }

              const isDisabled = isBooked || isPastSlot;

              return (
                <motion.button
                  key={slot}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.015 }}
                  whileTap={!isDisabled ? { scale: 0.95 } : {}}
                  onClick={() => !isDisabled && onSelectTime(slot)}
                  disabled={isDisabled}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isDisabled
                      ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through"
                      : isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-card/80 text-foreground active:scale-95"
                  )}
                >
                  {formatTime(slot)}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

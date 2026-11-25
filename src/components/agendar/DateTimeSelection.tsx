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
import { getScheduleDaySummary, sanitizeLunchBreak } from '@/lib/businessHours';


interface DateTimeSelectionProps {
  businessHours: BusinessHours[];
  bookedSlots: string[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  onSelectDate: (date: Date | undefined) => void;
  onSelectTime: (time: string) => void;
  selectedServices?: Service[];
  isRefreshing?: boolean;
  selectedBarberId?: string | null;
}

export function DateTimeSelection({
  businessHours,
  bookedSlots,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  selectedServices = [],
  isRefreshing = false,
  selectedBarberId,
}: DateTimeSelectionProps) {
  const { packages, hasActiveSubscription, loading: packagesLoading, fetchMyPackages } = useMyPackages();
  const { isExclusive: isExclusiveClient, loading: isExclusiveClientLoading } = useIsExclusiveClient();
  const [blockedWeekDates, setBlockedWeekDates] = useState<Date[]>([]);
  const [isVipBooking, setIsVipBooking] = useState(false);
  const [isSequentialVipBooking, setIsSequentialVipBooking] = useState(false);

  const isVipSubscriber = useMemo(
    () => hasActiveSubscription || packages.some((p) => p.status === 'active'),
    [hasActiveSubscription, packages]
  );
  const isVipOrExclusiveClient = isVipSubscriber || isExclusiveClient;
  const isVipAccessLoading = packagesLoading || isExclusiveClientLoading;

  useEffect(() => {
    void fetchMyPackages();
  }, [fetchMyPackages]);

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

      const matchingPackages = packages.filter(
        p => p.status === 'active' && (!selectedBarberId || !p.barber_id || p.barber_id === selectedBarberId)
      );

      // ── Plano SEQUENCIAL ──────────────────────────────────────────────
      const activeSequentialPkg = matchingPackages.find(
        p => p.package.type === 'sequential'
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
        const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

        // Buscar agendamentos VIP (incluindo 'completed' para não travar semanas futuras após o corte de hoje!)
        // e também usos manuais em client_package_usage deste pacote sequencial.
        let futureAptsQuery = supabase
          .from('appointments')
          .select('id, appointment_date, payment_method')
          .eq('user_id', user.id)
          .gte('appointment_date', currentWeekStartStr)
          .eq('payment_method', 'subscriber')
          .in('status', ['confirmed', 'pending', 'completed']);

        if (selectedBarberId) {
          futureAptsQuery = futureAptsQuery.eq('barber_id', selectedBarberId);
        }

        const [aptsRes, manualUsageRes] = await Promise.all([
          futureAptsQuery,
          supabase
            .from('client_package_usage')
            .select('used_at, appointment_id')
            .eq('client_package_id', activeSequentialPkg!.id)
            .is('appointment_id', null)
            .gte('used_at', `${currentWeekStartStr}T00:00:00`),
        ]);

        const occupiedWeekStarts = new Map<string, Date>();

        const markWeekOccupied = (dateStr: string) => {
          if (!dateStr) return;
          const d = new Date(dateStr.substring(0, 10) + 'T00:00:00');
          if (isNaN(d.getTime())) return;
          const wStart = startOfWeek(d, { weekStartsOn: 1 });
          const wKey = format(wStart, 'yyyy-MM-dd');
          if (!occupiedWeekStarts.has(wKey)) {
            occupiedWeekStarts.set(wKey, wStart);
          }
        };

        (aptsRes.data || []).forEach((apt: any) => markWeekOccupied(apt.appointment_date));
        (manualUsageRes.data || []).forEach((u: any) => markWeekOccupied(u.used_at));

        const blockedDates: Date[] = [];

        // Bloqueia apenas as semanas que já possuem agendamento/uso (máx 1 por semana),
        // liberando todas as próximas semanas livres até o vencimento do pacote.
        occupiedWeekStarts.forEach((wStart) => {
          const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
          const cur = new Date(wStart);
          while (cur <= wEnd) {
            blockedDates.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
          }
        });

        // Bloqueia datas posteriores ao vencimento da assinatura (end_date)
        if (activeSequentialPkg?.end_date) {
          const pkgEnd = new Date(activeSequentialPkg.end_date + 'T00:00:00');
          const farFuture = new Date(today);
          farFuture.setMonth(farFuture.getMonth() + 6);
          const futureCursor = new Date(pkgEnd);
          futureCursor.setDate(futureCursor.getDate() + 1);
          while (futureCursor <= farFuture) {
            blockedDates.push(new Date(futureCursor));
            futureCursor.setDate(futureCursor.getDate() + 1);
          }
        }

        setBlockedWeekDates(blockedDates);
        return;
      }

      setIsSequentialVipBooking(false);
      // ── Fim Plano SEQUENCIAL ──────────────────────────────────────────

      // Get service IDs that have weekly limits in user's packages FOR THIS BARBER
      const servicesWithWeeklyLimit: { serviceId: string; weeklyLimit: number }[] = [];
      
      for (const pkg of matchingPackages) {
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

      // Buscar do início da semana atual até +90 dias para contar corretamente usos/agendamentos (inclusive 'completed')
      const today2 = new Date();
      const currentWeekStart2 = startOfWeek(today2, { weekStartsOn: 1 });
      const currentWeekStartStr2 = format(currentWeekStart2, 'yyyy-MM-dd');
      const futureDate = new Date();
      futureDate.setDate(today2.getDate() + 90);

      let scheduledQuery = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_services!inner(service_id)
        `)
        .eq('user_id', user.id)
        .gte('appointment_date', currentWeekStartStr2)
        .lte('appointment_date', format(futureDate, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed', 'completed']);

      if (selectedBarberId) {
        scheduledQuery = scheduledQuery.eq('barber_id', selectedBarberId);
      }

      const pkgIds = matchingPackages.map((p) => p.id);
      const [scheduledRes, manualFlexUsageRes] = await Promise.all([
        scheduledQuery,
        pkgIds.length > 0
          ? supabase
              .from('client_package_usage')
              .select('service_id, used_at, appointment_id')
              .in('client_package_id', pkgIds)
              .is('appointment_id', null)
              .gte('used_at', `${currentWeekStartStr2}T00:00:00`)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (scheduledRes.error) {
        console.error('Error fetching scheduled appointments:', scheduledRes.error);
        return;
      }

      // Contabiliza uso por (semana, serviceId) para respeitar weekly_limit real (ex: 1x ou 2x/semana)
      const weekServiceCounts = new Map<string, number>();

      for (const apt of scheduledRes.data || []) {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00');
        const weekKey = format(startOfWeek(aptDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const aptServiceIds = (apt.appointment_services || []).map((as: any) => as.service_id);

        for (const s of servicesWithWeeklyLimit) {
          if (aptServiceIds.includes(s.serviceId)) {
            const k = `${weekKey}:${s.serviceId}`;
            weekServiceCounts.set(k, (weekServiceCounts.get(k) || 0) + 1);
          }
        }
      }

      for (const u of (manualFlexUsageRes as any).data || []) {
        if (!u.used_at) continue;
        const uDate = new Date(u.used_at.substring(0, 10) + 'T00:00:00');
        const weekKey = format(startOfWeek(uDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const k = `${weekKey}:${u.service_id}`;
        weekServiceCounts.set(k, (weekServiceCounts.get(k) || 0) + 1);
      }

      const blockedWeeksSet = new Set<string>();
      weekServiceCounts.forEach((count, key) => {
        const [weekKey, serviceId] = key.split(':');
        const req = servicesWithWeeklyLimit.find((s) => s.serviceId === serviceId);
        if (req && count >= req.weeklyLimit) {
          blockedWeeksSet.add(weekKey);
        }
      });

      const blockedDates: Date[] = [];
      blockedWeeksSet.forEach((weekKey) => {
        const weekStart = new Date(weekKey + 'T00:00:00');
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const currentDate = new Date(weekStart);
        while (currentDate <= weekEnd) {
          blockedDates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      setBlockedWeekDates(blockedDates);
    }

    checkBlockedWeeks();
  }, [selectedServices, packages, selectedBarberId]);

  const selectedDayHours = useMemo(() => {
    if (!selectedDate) return null;
    const dayOfWeek = selectedDate.getDay();
    return businessHours.find(bh => bh.day_of_week === dayOfWeek) || null;
  }, [selectedDate, businessHours]);

  // Generate available time slots based on business hours (excluding lunch break)
  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedDayHours || !selectedDayHours.is_open) return [];
    const dow = selectedDate.getDay();
    if (
      (dow === 6 && (isVipOrExclusiveClient || isVipAccessLoading)) ||
      (dow === 0 && (isVipSubscriber || packagesLoading))
    ) {
      return [];
    }

    const slots: string[] = [];
    const [openHour, openMin] = selectedDayHours.open_time.split(':').map(Number);
    const [closeHour, closeMin] = selectedDayHours.close_time.split(':').map(Number);

    // Parse lunch break times if they exist and are valid
    const cleanLunch = sanitizeLunchBreak(selectedDayHours.lunch_start, selectedDayHours.lunch_end);
    let lunchStartMinutes = -1;
    let lunchEndMinutes = -1;
    if (cleanLunch.lunch_start && cleanLunch.lunch_end) {
      const [lunchStartHour, lunchStartMin] = cleanLunch.lunch_start.split(':').map(Number);
      const [lunchEndHour, lunchEndMin] = cleanLunch.lunch_end.split(':').map(Number);
      lunchStartMinutes = lunchStartHour * 60 + lunchStartMin;
      lunchEndMinutes = lunchEndHour * 60 + lunchEndMin;
    }
    const hasLunchBreak = lunchStartMinutes >= 0 && lunchEndMinutes > lunchStartMinutes;

    let currentHour = openHour;
    let currentMin = openMin;

    // Calculate total duration needed for selected services
    const totalServiceDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0) || 30;
    const closeTimeMinutes = closeHour * 60 + closeMin;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const currentMinutes = currentHour * 60 + currentMin;
      
      // Check if current time is during lunch break
      const isLunchBreak = hasLunchBreak && (
        currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes
      );

      if (!isLunchBreak) {
        const endMinutes = currentMinutes + totalServiceDuration;
        // Check appointment finishes before closing
        const fitsBeforeClose = endMinutes <= closeTimeMinutes;
        // Check appointment doesn't overlap into lunch break
        const overlapsLunch = hasLunchBreak && 
          currentMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes;
        
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
  }, [selectedDate, selectedDayHours, selectedServices, isVipOrExclusiveClient, isVipAccessLoading, isVipSubscriber, packagesLoading]);

  // Check if a date is blocked due to VIP weekly limit
  const isDateBlockedByVip = (date: Date): boolean => {
    return blockedWeekDates.some(blockedDate => 
      blockedDate.toDateString() === date.toDateString()
    );
  };

  // Disable days that are closed OR blocked by VIP weekly limit OR Saturday/weekend for VIP/exclusive clients
  const disabledDays = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    const isBlockedByVipLimit = isDateBlockedByVip(date);
    // Saturday (6) is blocked for VIP subscribers and exclusive clients, or while loading to prevent race conditions.
    // Sunday (0) is also blocked for VIP subscribers so only configured weekdays (Mon-Fri / Tue-Fri) remain available.
    const isSaturdayRestricted = dayOfWeek === 6 && (isVipOrExclusiveClient || isVipAccessLoading);
    const isSundayRestrictedForVip = dayOfWeek === 0 && (isVipSubscriber || packagesLoading);

    return isPast || !dayHours?.is_open || isBlockedByVipLimit || isSaturdayRestricted || isSundayRestrictedForVip;
  };

  // Clear selectedDate if it becomes restricted (e.g. Saturday when VIP status finishes loading)
  useEffect(() => {
    if (!selectedDate || isVipAccessLoading) return;
    const dow = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dow);
    const restrictedByVip =
      (dow === 6 && isVipOrExclusiveClient) ||
      (dow === 0 && isVipSubscriber);
    const isInBlockedWeek = blockedWeekDates.some(
      (blockedDate) => blockedDate.toDateString() === selectedDate.toDateString()
    );
    if (restrictedByVip || (businessHours.length > 0 && !dayHours?.is_open) || isInBlockedWeek) {
      onSelectDate(undefined);
    }
  }, [
    selectedDate,
    isVipAccessLoading,
    isVipOrExclusiveClient,
    isVipSubscriber,
    businessHours,
    blockedWeekDates,
    onSelectDate,
  ]);

  const scheduleSummary = useMemo(
    () =>
      getScheduleDaySummary(businessHours, {
        blockSaturday: isVipOrExclusiveClient,
        blockSunday: isVipSubscriber,
      }),
    [businessHours, isVipOrExclusiveClient, isVipSubscriber]
  );

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

      {/* VIP / Sequential / Weekday restriction banner */}
      {((isVipBooking && blockedWeekDates.length > 0) || (isVipOrExclusiveClient && !isVipAccessLoading)) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border rounded-2xl p-3 bg-yellow-500/10 border-yellow-500/30 space-y-2"
        >
          {isVipBooking && blockedWeekDates.length > 0 && (
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                {isSequentialVipBooking ? (
                  <>
                    <p className="font-medium text-yellow-600">Plano Sequencial VIP</p>
                    <p className="text-muted-foreground mt-0.5">
                      Limite de 1 atendimento por semana dentro da validade da assinatura. Semanas já utilizadas/agendadas ficam destacadas em amarelo.
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
          )}

          {isVipOrExclusiveClient && !isVipAccessLoading && (
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-yellow-600">
                  {isVipSubscriber
                    ? `Plano VIP (${scheduleSummary.openFullLabel || 'Dias úteis'})`
                    : 'Cliente Exclusivo'}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {scheduleSummary.openFullLabel
                    ? `Agendamentos disponíveis somente de ${scheduleSummary.openFullLabel}, conforme configurado no painel. Sábados são bloqueados para assinantes.`
                    : 'Nenhum dia útil aberto configurado no painel no momento.'}
                </p>
              </div>
            </div>
          )}
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
            {scheduleSummary.openShortLabel && (
              <span>🟢 {scheduleSummary.openShortLabel}</span>
            )}
            {scheduleSummary.closedShortLabel && (
              <span>🔴 {scheduleSummary.closedShortLabel}</span>
            )}
            {scheduleSummary.saturdayBlockedByVip && (
              <span>🚫 Sáb (VIP)</span>
            )}
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
          className="bg-primary/10 rounded-2xl p-4 text-center space-y-1"
        >
          <p className="text-sm text-muted-foreground">Data selecionada</p>
          <p className="text-lg font-semibold text-foreground capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          {selectedDayHours?.is_open && (
            <p className="text-xs text-muted-foreground">
              Atendimento: {formatTime(selectedDayHours.open_time)} às {formatTime(selectedDayHours.close_time)}
              {(() => {
                const cleanLunch = sanitizeLunchBreak(selectedDayHours.lunch_start, selectedDayHours.lunch_end);
                if (cleanLunch.lunch_start && cleanLunch.lunch_end) {
                  return ` · Intervalo: ${formatTime(cleanLunch.lunch_start)} às ${formatTime(cleanLunch.lunch_end)}`;
                }
                return '';
              })()}
            </p>
          )}
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

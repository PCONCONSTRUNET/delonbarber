import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Unlock, Clock, CalendarDays, Loader2, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BusinessHourRow,
  normalizeAndSyncBusinessHours,
  resolveBusinessHoursForBarber,
  sanitizeLunchBreak,
} from '@/lib/businessHours';
import { useBarbers } from '@/hooks/useBarbers';

interface BlockedSlot {
  id: string;
  barber_id?: string | null;
  blocked_date: string;
  blocked_time: string;
  reason: string | null;
  is_manual: boolean;
  appointment_id: string | null;
}

interface AppointmentSlot {
  time: string;
  clientName: string | null;
}

interface BlockedSlotsManagerProps {
  fixedBarberId?: string | null;
  defaultBarberId?: string | null;
}

export function BlockedSlotsManager({ fixedBarberId, defaultBarberId }: BlockedSlotsManagerProps = {}) {
  const { barbers } = useBarbers();
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    fixedBarberId || defaultBarberId || ''
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [rawBusinessHours, setRawBusinessHours] = useState<BusinessHourRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>([]);

  useEffect(() => {
    if (fixedBarberId) {
      setSelectedBarberId(fixedBarberId);
    } else if (!selectedBarberId && barbers.length > 0) {
      setSelectedBarberId(defaultBarberId || barbers[0].id);
    }
  }, [fixedBarberId, defaultBarberId, barbers, selectedBarberId]);

  const activeBarberId = fixedBarberId || selectedBarberId || barbers[0]?.id || null;

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  useEffect(() => {
    if (selectedDate && activeBarberId) {
      fetchBlockedSlots();
      fetchAppointments();
    }
  }, [selectedDate, activeBarberId]);

  const fetchBusinessHours = async () => {
    const { data } = await supabase.from('business_hours').select('*');
    if (data) {
      const normalized = await normalizeAndSyncBusinessHours(data);
      setRawBusinessHours(normalized);
    }
  };

  const businessHours = useMemo(
    () => resolveBusinessHoursForBarber(rawBusinessHours, activeBarberId),
    [rawBusinessHours, activeBarberId]
  );

  const fetchBlockedSlots = async () => {
    if (!activeBarberId) return;
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('blocked_date', dateStr)
      .eq('barber_id', activeBarberId);

    if (error) {
      toast.error('Erro ao carregar horários bloqueados');
    } else {
      setBlockedSlots(data || []);
    }
    setLoading(false);
  };

  const fetchAppointments = async () => {
    if (!activeBarberId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time, total_duration, guest_name, user_id, status')
      .eq('appointment_date', dateStr)
      .eq('barber_id', activeBarberId)
      .in('status', ['pending', 'confirmed']);

    if (data) {
      const slots: AppointmentSlot[] = [];
      for (const apt of data) {
        const duration = apt.total_duration || 30;
        const [h, m] = apt.appointment_time.split(':').map(Number);
        let totalMin = h * 60 + m;
        const slotsNeeded = Math.ceil(duration / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          const slotH = Math.floor(totalMin / 60);
          const slotM = totalMin % 60;
          slots.push({
            time: `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`,
            clientName: apt.guest_name || null,
          });
          totalMin += 30;
        }
      }
      setAppointmentSlots(slots);
    }
  };

  const generateTimeSlots = () => {
    const dayOfWeek = selectedDate.getDay();
    const hours = businessHours.find((h) => h.day_of_week === dayOfWeek);

    if (!hours || !hours.is_open) return [];

    const slots: string[] = [];
    const [openHour, openMin] = hours.open_time.split(':').map(Number);
    const [closeHour, closeMin] = hours.close_time.split(':').map(Number);

    const cleanLunch = sanitizeLunchBreak(hours.lunch_start, hours.lunch_end);
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

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const currentMinutes = currentHour * 60 + currentMin;
      const isLunchBreak =
        hasLunchBreak && currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes;

      if (!isLunchBreak) {
        slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
      }

      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    return slots;
  };

  const isSlotBlocked = (time: string) => {
    return blockedSlots.find((slot) => slot.blocked_time.substring(0, 5) === time);
  };

  const isSlotBooked = (time: string) => {
    return appointmentSlots.find((slot) => slot.time === time);
  };

  const toggleSlotBlock = async (time: string) => {
    if (!activeBarberId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingBlock = isSlotBlocked(time);

    if (existingBlock) {
      if (!existingBlock.is_manual) {
        toast.error('Este horário está bloqueado por um agendamento confirmado');
        return;
      }

      const { error } = await supabase.from('blocked_slots').delete().eq('id', existingBlock.id);

      if (error) {
        toast.error('Erro ao desbloquear horário');
      } else {
        toast.success('Horário desbloqueado');
        fetchBlockedSlots();
      }
    } else {
      const { error } = await supabase.from('blocked_slots').insert({
        blocked_date: dateStr,
        blocked_time: time,
        barber_id: activeBarberId,
        reason: reason || 'Bloqueio manual',
        is_manual: true,
      });

      if (error) {
        toast.error('Erro ao bloquear horário');
      } else {
        toast.success('Horário bloqueado');
        setReason('');
        fetchBlockedSlots();
      }
    }
  };

  const blockAllDay = async () => {
    if (!activeBarberId) return;
    const slots = generateTimeSlots();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const unblockedSlots = slots.filter((time) => !isSlotBlocked(time));

    if (unblockedSlots.length === 0) {
      toast.info('Todos os horários já estão bloqueados');
      return;
    }

    const { error } = await supabase.from('blocked_slots').insert(
      unblockedSlots.map((time) => ({
        blocked_date: dateStr,
        blocked_time: time,
        barber_id: activeBarberId,
        reason: reason || 'Bloqueio do dia inteiro',
        is_manual: true,
      }))
    );

    if (error) {
      toast.error('Erro ao bloquear horários');
    } else {
      toast.success(`${unblockedSlots.length} horários bloqueados`);
      setReason('');
      fetchBlockedSlots();
    }
  };

  const unblockAllManual = async () => {
    if (!activeBarberId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('blocked_date', dateStr)
      .eq('barber_id', activeBarberId)
      .eq('is_manual', true);

    if (error) {
      toast.error('Erro ao desbloquear horários');
    } else {
      toast.success('Bloqueios manuais removidos');
      fetchBlockedSlots();
    }
  };

  const timeSlots = generateTimeSlots();
  const dayOfWeek = selectedDate.getDay();
  const todayHours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  return (
    <div className="space-y-4">
      {/* Seletor de Barbeiro (no Admin quando houver vários) */}
      {!fixedBarberId && barbers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {barbers.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBarberId(b.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                activeBarberId === b.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Scissors className="h-3.5 w-3.5" />
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Selecionar Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="reason">Motivo do bloqueio (opcional)</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Feriado, Reunião..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={blockAllDay}
                  variant="destructive"
                  className="flex-1"
                  disabled={!todayHours?.is_open}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Bloquear Dia
                </Button>
                <Button onClick={unblockAllManual} variant="outline" className="flex-1">
                  <Unlock className="h-4 w-4 mr-2" />
                  Liberar Manuais
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !todayHours?.is_open ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Estabelecimento fechado neste dia</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => {
                    const blocked = isSlotBlocked(time);
                    const booked = isSlotBooked(time);
                    const isAutoBlocked = blocked && !blocked.is_manual;
                    const isOccupied = isAutoBlocked || booked;

                    return (
                      <button
                        key={time}
                        onClick={() => !isOccupied && toggleSlotBlock(time)}
                        disabled={!!isOccupied}
                        className={cn(
                          'relative p-3 rounded-lg text-sm font-medium transition-all',
                          'border-2 hover:scale-105',
                          !blocked &&
                            !booked &&
                            'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30',
                          blocked &&
                            blocked.is_manual &&
                            !booked &&
                            'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30',
                          isOccupied &&
                            'bg-amber-500/20 border-amber-500/50 text-amber-400 cursor-not-allowed opacity-75'
                        )}
                      >
                        <span>{time}</span>
                        {(blocked || booked) && <Lock className="h-3 w-3 absolute top-1 right-1" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Legenda:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500/50" />
                      <span>Disponível</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-500/50" />
                      <span>Bloqueio Manual</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-amber-500/50" />
                      <span>Agendamento</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

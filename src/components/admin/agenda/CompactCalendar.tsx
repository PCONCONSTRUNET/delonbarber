import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAppointment } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompactCalendarProps {
  appointments: AdminAppointment[];
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

export function CompactCalendar({
  appointments,
  onSelectDate,
  selectedDate,
}: CompactCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((a) => a.appointment_date === dateStr);
  };

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-card rounded-2xl p-3 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelected = isSameDay(day, selectedDate);
          const hasAppointments = dayAppointments.length > 0;
          const pendingCount = dayAppointments.filter(
            (a) => a.status === 'pending'
          ).length;
          const confirmedCount = dayAppointments.filter(
            (a) => a.status === 'confirmed'
          ).length;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-all',
                !isCurrentMonth && 'text-muted-foreground/30',
                isSelected &&
                  'bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2 ring-offset-background',
                !isSelected && isToday(day) && 'ring-1 ring-primary',
                !isSelected &&
                  hasAppointments &&
                  'bg-primary/10 font-medium',
                'active:scale-95 hover:bg-accent/50'
              )}
            >
              <span>{format(day, 'd')}</span>
              {/* Appointment dots */}
              {hasAppointments && !isSelected && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {pendingCount > 0 && (
                    <span className="w-1 h-1 rounded-full bg-warning" />
                  )}
                  {confirmedCount > 0 && (
                    <span className="w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

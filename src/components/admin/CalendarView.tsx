import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAppointment } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalendarViewProps {
  appointments: AdminAppointment[];
  view: 'day' | 'week' | 'month';
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  compact?: boolean;
}

export function CalendarView({ appointments, view, onSelectDate, selectedDate, compact }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const isMobile = useIsMobile();
  const isCompact = compact || isMobile;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => a.appointment_date === dateStr);
  };

  const weekDays = isCompact ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (isCompact) {
    return (
      <div className="rounded-xl glass-effect p-2">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <h3 className="text-xs font-semibold capitalize">
            {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Compact Week days header */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-[8px] font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Compact Calendar grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map(day => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            const hasAppointments = dayAppointments.length > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={cn(
                  "w-full aspect-square rounded text-[10px] flex items-center justify-center transition-colors relative",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isSelected && "bg-primary text-primary-foreground font-bold",
                  !isSelected && isToday(day) && "ring-1 ring-primary",
                  !isSelected && hasAppointments && "bg-primary/25 font-medium",
                  "active:scale-95"
                )}
              >
                {format(day, 'd')}
                {hasAppointments && !isSelected && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass-effect p-3 md:p-4">
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
        <h3 className="font-display text-base md:text-lg font-semibold capitalize">
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
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] md:text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const dayAppointments = getAppointmentsForDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelected = isSameDay(day, selectedDate);
          const hasAppointments = dayAppointments.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "aspect-square p-0.5 rounded-md text-xs flex flex-col items-center justify-center transition-colors relative",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday(day) && "border border-primary",
                !isSelected && hasAppointments && "bg-primary/20",
                "hover:bg-muted"
              )}
            >
              <span className="font-medium text-[11px] md:text-xs">{format(day, 'd')}</span>
              {hasAppointments && (
                <span className={cn(
                  "text-[8px] md:text-[9px]",
                  isSelected ? "text-primary-foreground" : "text-primary"
                )}>
                  {dayAppointments.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

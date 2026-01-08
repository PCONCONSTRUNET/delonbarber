import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAppointment } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarViewProps {
  appointments: AdminAppointment[];
  view: 'day' | 'week' | 'month';
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

export function CalendarView({ appointments, view, onSelectDate, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => a.appointment_date === dateStr);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="rounded-2xl glass-effect p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-display text-xl font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
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
                "aspect-square p-1 rounded-lg text-sm flex flex-col items-center justify-center transition-colors relative",
                !isCurrentMonth && "text-muted-foreground/50",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday(day) && "border border-primary",
                !isSelected && hasAppointments && "bg-primary/20",
                "hover:bg-muted"
              )}
            >
              <span className="font-medium">{format(day, 'd')}</span>
              {hasAppointments && (
                <span className={cn(
                  "text-[10px] mt-0.5",
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

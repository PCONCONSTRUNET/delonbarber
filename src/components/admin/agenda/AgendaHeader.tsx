import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointmentCount: number;
}

export function AgendaHeader({
  selectedDate,
  onDateChange,
  appointmentCount,
}: AgendaHeaderProps) {
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'EEEE', { locale: ptBR });
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={() => onDateChange(subDays(selectedDate, 1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="text-center">
        <p className="text-lg font-semibold capitalize">
          {getDateLabel(selectedDate)}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          {appointmentCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold">
              {appointmentCount}
            </span>
          )}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={() => onDateChange(addDays(selectedDate, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

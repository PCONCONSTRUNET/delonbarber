import { ChevronLeft, ChevronRight, Zap, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  appointmentCount: number;
  onSqueezeIn?: () => void;
  onRegisterExternal?: () => void;
}

export function AgendaHeader({
  selectedDate,
  onDateChange,
  appointmentCount,
  onSqueezeIn,
  onRegisterExternal,
}: AgendaHeaderProps) {
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'EEEE', { locale: ptBR });
  };

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
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

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs border-warning/30 text-warning hover:bg-warning/10"
          onClick={onSqueezeIn}
        >
          <Zap className="h-3.5 w-3.5" />
          Encaixe
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs border-success/30 text-success hover:bg-success/10"
          onClick={onRegisterExternal}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          Corte Externo
        </Button>
      </div>
    </div>
  );
}

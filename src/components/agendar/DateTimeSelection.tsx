import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';
import { BusinessHours } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

interface DateTimeSelectionProps {
  businessHours: BusinessHours[];
  bookedSlots: string[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  onSelectDate: (date: Date | undefined) => void;
  onSelectTime: (time: string) => void;
}

export function DateTimeSelection({
  businessHours,
  bookedSlots,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime
}: DateTimeSelectionProps) {

  // Generate available time slots based on business hours
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);

    if (!dayHours || !dayHours.is_open) return [];

    const slots: string[] = [];
    const [openHour, openMin] = dayHours.open_time.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close_time.split(':').map(Number);

    let currentHour = openHour;
    let currentMin = openMin;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}:00`;
      slots.push(timeStr);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }

    return slots;
  }, [selectedDate, businessHours]);

  // Disable days that are closed
  const disabledDays = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dayHours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    return isPast || !dayHours?.is_open;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <div className="space-y-6">
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
          
          <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>🟢 Ter-Sáb</span>
            <span>🔴 Dom-Seg</span>
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
              const isBooked = bookedSlots.includes(slot);
              const isSelected = selectedTime === slot;

              return (
                <motion.button
                  key={slot}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.015 }}
                  whileTap={!isBooked ? { scale: 0.95 } : {}}
                  onClick={() => !isBooked && onSelectTime(slot)}
                  disabled={isBooked}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isBooked
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

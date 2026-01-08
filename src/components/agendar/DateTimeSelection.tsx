import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';
import { BusinessHours } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

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
  const [month, setMonth] = useState(new Date());

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
    return time.slice(0, 5); // "09:00:00" -> "09:00"
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-center"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDate}
            month={month}
            onMonthChange={setMonth}
            disabled={disabledDays}
            locale={ptBR}
            className="pointer-events-auto"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-bold",
            }}
          />
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>🟢 Aberto: Terça a Sábado</p>
            <p>🔴 Fechado: Domingo e Segunda</p>
          </div>
        </div>
      </motion.div>

      {/* Time slots */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Horários Disponíveis
        </h3>

        {!selectedDate ? (
          <p className="text-muted-foreground">Selecione uma data primeiro</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-muted-foreground">Nenhum horário disponível nesta data</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {availableSlots.map((slot, index) => {
              const isBooked = bookedSlots.includes(slot);
              const isSelected = selectedTime === slot;

              return (
                <motion.button
                  key={slot}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={!isBooked ? { scale: 1.05 } : {}}
                  whileTap={!isBooked ? { scale: 0.95 } : {}}
                  onClick={() => !isBooked && onSelectTime(slot)}
                  disabled={isBooked}
                  className={cn(
                    "py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                    isBooked
                      ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                      : isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-card border border-border hover:border-primary hover:text-primary"
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

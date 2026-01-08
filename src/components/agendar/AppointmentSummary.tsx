import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, FileText, Check } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface AppointmentSummaryProps {
  selectedServices: Service[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function AppointmentSummary({
  selectedServices,
  selectedDate,
  selectedTime,
  notes,
  onNotesChange,
  onConfirm,
  isSubmitting
}: AppointmentSummaryProps) {
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const formatTime = (time: string) => time.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Services */}
      <div className="bg-card/80 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          ✂️ Serviços
        </h3>
        <div className="space-y-2">
          {selectedServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex justify-between items-center"
            >
              <span className="text-foreground text-sm">{service.name}</span>
              <span className="text-primary font-semibold text-sm">
                R$ {Number(service.price).toFixed(0)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Data</span>
          </div>
          <p className="text-foreground font-semibold text-sm">
            {selectedDate 
              ? format(selectedDate, "dd/MM", { locale: ptBR })
              : '-'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {selectedDate && format(selectedDate, "EEEE", { locale: ptBR })}
          </p>
        </div>

        <div className="bg-card/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horário</span>
          </div>
          <p className="text-foreground font-bold text-xl">
            {selectedTime ? formatTime(selectedTime) : '-'}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card/80 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileText className="w-4 h-4" />
          <span className="text-xs">Observações (opcional)</span>
        </div>
        <Textarea
          placeholder="Ex: Preferência de corte, alergias..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="resize-none bg-transparent border-0 p-0 text-sm focus-visible:ring-0 min-h-[60px]"
          rows={2}
        />
      </div>

      {/* Total */}
      <div className="bg-primary/10 rounded-2xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="text-foreground font-medium">{totalDuration} min</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">
              R$ {totalPrice.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full h-14 text-base font-bold rounded-2xl"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                ✂️
              </motion.span>
              Confirmando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Confirmar Agendamento
            </span>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

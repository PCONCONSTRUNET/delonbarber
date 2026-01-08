import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scissors, Calendar, Clock, FileText, Check } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
          Resumo do Agendamento
        </h3>

        {/* Services */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Scissors className="w-5 h-5" />
            <span className="font-semibold">Serviços Selecionados</span>
          </div>
          <div className="space-y-2 pl-7">
            {selectedServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-between items-center py-2 border-b border-border last:border-0"
              >
                <div>
                  <span className="text-foreground">{service.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({service.duration_minutes} min)
                  </span>
                </div>
                <span className="font-semibold text-primary">
                  R$ {Number(service.price).toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">Data</span>
            </div>
            <p className="text-foreground pl-7">
              {selectedDate 
                ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : '-'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Horário</span>
            </div>
            <p className="text-foreground pl-7 text-xl font-bold">
              {selectedTime ? formatTime(selectedTime) : '-'}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <Label htmlFor="notes" className="flex items-center gap-2 text-primary mb-3">
            <FileText className="w-5 h-5" />
            <span className="font-semibold">Observações (opcional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Ex: Preferência de corte, alergias, etc."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Total */}
        <div className="bg-primary/10 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-muted-foreground">Duração total</p>
              <p className="text-foreground font-semibold">{totalDuration} minutos</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Total</p>
              <p className="text-3xl font-bold text-primary">
                R$ {totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Scissors className="w-5 h-5" />
                </motion.div>
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
      </div>
    </motion.div>
  );
}

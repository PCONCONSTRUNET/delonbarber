import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, FileText, Check, QrCode, Banknote, CreditCard } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PixQRCode } from '@/components/payments/PixQRCode';
import { cn } from '@/lib/utils';

type PaymentMethod = 'pix' | 'cash' | 'card';

interface AppointmentSummaryProps {
  selectedServices: Service[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  isSubmitting: boolean;
}

const paymentMethods: { id: PaymentMethod; label: string; description: string; icon: typeof QrCode }[] = [
  { id: 'pix', label: 'PIX', description: 'Pague agora e garanta seu horário', icon: QrCode },
  { id: 'cash', label: 'Dinheiro', description: 'Pagar no local', icon: Banknote },
  { id: 'card', label: 'Cartão', description: 'Pagar no local', icon: CreditCard },
];

export function AppointmentSummary({
  selectedServices,
  selectedDate,
  selectedTime,
  notes,
  onNotesChange,
  onConfirm,
  isSubmitting
}: AppointmentSummaryProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix');
  
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const formatTime = (time: string) => time.slice(0, 5);

  // Generate a temporary ID for PIX preview
  const tempTransactionId = `preview-${Date.now()}`;

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

      {/* Payment Method Selection */}
      <div className="bg-card/80 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          💳 Forma de Pagamento
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPayment === method.id;
            
            return (
              <motion.button
                key={method.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPayment(method.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {method.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {paymentMethods.find(m => m.id === selectedPayment)?.description}
        </p>
      </div>

      {/* PIX QR Code Preview */}
      <AnimatePresence>
        {selectedPayment === 'pix' && totalPrice > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card/80 rounded-2xl p-4">
              <div className="text-center mb-3">
                <p className="text-sm font-medium text-primary">
                  💰 Pague agora para garantir seu horário
                </p>
                <p className="text-xs text-muted-foreground">
                  O QR Code será gerado após a confirmação
                </p>
              </div>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-muted/50 rounded-xl flex items-center justify-center border-2 border-dashed border-primary/30">
                  <QrCode className="h-12 w-12 text-primary/50" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          onClick={() => onConfirm(selectedPayment)}
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

import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PixQRCode } from './PixQRCode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  amount: number;
  date: Date;
  time: string;
  services: string[];
}

export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  appointmentId,
  amount,
  date,
  time,
  services,
}: PaymentConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Success Header */}
        <div className="bg-green-500/10 p-6 text-center border-b border-border">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="h-8 w-8 text-green-500" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-bold text-foreground"
          >
            Agendamento Confirmado! 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mt-1"
          >
            {services.join(', ')}
          </motion.p>
        </div>

        {/* Appointment Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 flex justify-center gap-6 border-b border-border"
        >
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {format(date, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">{time.slice(0, 5)}</span>
          </div>
        </motion.div>

        {/* PIX Payment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6"
        >
          <div className="text-center mb-4">
            <p className="text-sm font-medium text-foreground">
              💰 Pague o valor total para garantir seu horário
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O pagamento antecipado evita cancelamentos
            </p>
          </div>

          <PixQRCode
            amount={amount}
            transactionId={appointmentId}
          />
        </motion.div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
          >
            Fechar
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Você também pode pagar na hora do atendimento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

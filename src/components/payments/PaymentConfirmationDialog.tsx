import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  amount,
  date,
  time,
  services,
}: PaymentConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[340px] sm:max-w-sm p-0 overflow-hidden border-border/40 rounded-[28px] shadow-2xl bg-gradient-to-b from-card via-card to-background"
      >
        {/* Glow ambient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-5 flex flex-col items-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mb-3"
          >
            <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-bold text-foreground text-center"
          >
            Agendamento Confirmado 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-xs text-muted-foreground mt-1 text-center line-clamp-1"
          >
            {services.join(', ')}
          </motion.p>

          {/* Date & Time pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex items-center gap-2 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-full px-4 py-2"
          >
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {format(date, "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">{time.slice(0, 5)}</span>
            </div>
          </motion.div>

          {/* Amount card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="w-full mt-4 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4"
          >
            {/* Texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '12px 12px',
              }}
            />
            <div className="relative text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Valor
              </p>
              <p className="text-3xl font-bold text-primary leading-none">
                R$ {amount.toFixed(0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Pagamento no local
              </p>
            </div>
          </motion.div>

          {/* Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full mt-4"
          >
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-full font-semibold active:scale-[0.98] transition-transform"
            >
              Concluir
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

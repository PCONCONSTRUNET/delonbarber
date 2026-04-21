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
        className="max-w-[280px] p-0 overflow-hidden border-border/40 rounded-[24px] shadow-2xl bg-gradient-to-b from-card via-card to-background"
      >
        {/* Glow ambient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px]">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-4 flex flex-col items-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mb-2"
          >
            <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-bold text-foreground text-center"
          >
            Agendamento Confirmado 🎉
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-[11px] text-muted-foreground mt-0.5 text-center line-clamp-1"
          >
            {services.join(', ')}
          </motion.p>

          {/* Date & Time pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-3 flex items-center gap-1.5 bg-muted/40 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5"
          >
            <div className="flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="font-semibold text-foreground">
                {format(date, "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="h-3 w-3 text-primary" />
              <span className="font-semibold text-foreground">{time.slice(0, 5)}</span>
            </div>
          </motion.div>

          {/* Amount card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="w-full mt-3 relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-2.5"
          >
            {/* Texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                backgroundSize: '10px 10px',
              }}
            />
            <div className="relative text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                Valor
              </p>
              <p className="text-2xl font-bold text-primary leading-tight">
                R$ {amount.toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Pagamento no local
              </p>
            </div>
          </motion.div>

          {/* Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full mt-3"
          >
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-9 rounded-full text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              Concluir
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

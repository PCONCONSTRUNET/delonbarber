import { Clock, User, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TodayAppointmentsProps {
  appointments: AdminAppointment[];
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, status: string) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  confirmed: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-green-500/20 text-green-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function TodayAppointments({ appointments, onUpdateStatus, onUpdatePayment }: TodayAppointmentsProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments
    .filter(a => a.appointment_date === today)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  if (todayAppts.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-effect text-center">
        <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todayAppts.map((apt, index) => (
        <motion.div
          key={apt.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-bold text-lg">{apt.appointment_time.slice(0, 5)}</span>
                <Badge className={cn("text-xs", statusColors[apt.status])}>
                  {statusLabels[apt.status]}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                <span>{apt.profile?.name || 'Cliente'}</span>
                {apt.profile?.phone && <span>• {apt.profile.phone}</span>}
              </div>
              
              <p className="text-sm text-foreground">
                {apt.services.map(s => s.name).join(', ')}
              </p>
              
              <p className="text-primary font-semibold mt-1">
                R$ {Number(apt.total_price).toFixed(0)}
                {apt.payment_status === 'paid' && (
                  <span className="text-green-500 text-xs ml-2">✓ Pago</span>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {apt.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                    onClick={() => onUpdateStatus(apt.id, 'confirmed')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    onClick={() => onUpdateStatus(apt.id, 'cancelled')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {apt.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(apt.id, 'completed')}
                >
                  Concluir
                </Button>
              )}
              {apt.status === 'completed' && apt.payment_status !== 'paid' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500 text-green-500"
                  onClick={() => onUpdatePayment(apt.id, 'paid')}
                >
                  Pagar
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

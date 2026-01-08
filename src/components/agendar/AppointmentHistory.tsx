import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, X, CheckCircle, AlertCircle, History } from 'lucide-react';
import { Appointment } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AppointmentHistoryProps {
  appointments: Appointment[];
  onCancel: (id: string) => void;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: AlertCircle,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-500 border-green-500/30'
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
  },
  cancelled: {
    label: 'Cancelado',
    icon: X,
    className: 'bg-red-500/10 text-red-500 border-red-500/30'
  }
};

export function AppointmentHistory({ appointments, onCancel }: AppointmentHistoryProps) {
  const formatTime = (time: string) => time.slice(0, 5);

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Nenhum agendamento ainda
        </h3>
        <p className="text-muted-foreground">
          Seus agendamentos aparecerão aqui
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment, index) => {
        const status = statusConfig[appointment.status];
        const StatusIcon = status.icon;
        const canCancel = ['pending', 'confirmed'].includes(appointment.status);

        return (
          <motion.div
            key={appointment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-5 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Date & Time */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {format(new Date(appointment.appointment_date), 'dd')}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">
                    {format(new Date(appointment.appointment_date), 'MMM', { locale: ptBR })}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(new Date(appointment.appointment_date), "EEEE", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatTime(appointment.appointment_time)}
                  </div>
                </div>
              </div>

              {/* Status & Price */}
              <div className="flex items-center gap-4">
                <Badge className={cn("flex items-center gap-1", status.className)}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
                <span className="text-xl font-bold text-primary">
                  R$ {Number(appointment.total_price).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Services */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-2">
                {appointment.services.map(service => (
                  <Badge key={service.id} variant="secondary" className="text-xs">
                    {service.name}
                  </Badge>
                ))}
              </div>

              {appointment.notes && (
                <p className="mt-3 text-sm text-muted-foreground italic">
                  "{appointment.notes}"
                </p>
              )}
            </div>

            {/* Cancel button */}
            {canCancel && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(appointment.id)}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

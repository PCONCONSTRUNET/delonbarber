import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, History } from 'lucide-react';
import { Appointment } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
interface AppointmentHistoryProps {
  appointments: Appointment[];
  onCancel: (id: string) => void;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    emoji: '⏳',
    className: 'bg-yellow-500/10 text-yellow-500'
  },
  confirmed: {
    label: 'Confirmado',
    emoji: '✅',
    className: 'bg-green-500/10 text-green-500'
  },
  completed: {
    label: 'Concluído',
    emoji: '✔️',
    className: 'bg-blue-500/10 text-blue-500'
  },
  cancelled: {
    label: 'Cancelado',
    emoji: '❌',
    className: 'bg-red-500/10 text-red-500'
  }
};

export function AppointmentHistory({ appointments, onCancel }: AppointmentHistoryProps) {
  const [cancelId, setCancelId] = useState<string | null>(null);
  const formatTime = (time: string) => time.slice(0, 5);

  if (appointments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <History className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum agendamento
        </h3>
        <p className="text-muted-foreground text-sm">
          Seus agendamentos aparecerão aqui
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment, index) => {
        const status = statusConfig[appointment.status];
        const canCancel = ['pending', 'confirmed'].includes(appointment.status);

        return (
          <motion.div
            key={appointment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card/80 rounded-2xl p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-primary leading-none">
                    {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd')}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {format(new Date(appointment.appointment_date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {formatTime(appointment.appointment_time)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(new Date(appointment.appointment_date + 'T00:00:00'), 'EEEE', { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={cn("text-xs px-2 py-1 rounded-full", status.className)}>
                  {status.emoji} {status.label}
                </span>
                <p className="text-primary font-bold mt-1">
                  R$ {Number(appointment.total_price).toFixed(0)}
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="flex flex-wrap gap-1 mb-3">
              {appointment.services.map(service => (
                <span 
                  key={service.id} 
                  className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-lg"
                >
                  {service.name}
                </span>
              ))}
            </div>

            {/* Notes */}
            {appointment.notes && (
              <p className="text-xs text-muted-foreground italic mb-3 bg-muted/30 rounded-lg p-2">
                "{appointment.notes}"
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {/* Add to Calendar - only for pending/confirmed */}
              {canCancel && (
                <AddToCalendarButton
                  appointmentId={appointment.id}
                  date={appointment.appointment_date}
                  time={appointment.appointment_time}
                  durationMinutes={appointment.total_duration || 30}
                  services={appointment.services.map(s => s.name)}
                  variant="default"
                  className="flex-1"
                />
              )}
              
              {/* Cancel button */}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelId(appointment.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl px-4"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? O horário será liberado para outros clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelId) {
                  onCancel(cancelId);
                  setCancelId(null);
                }
              }}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

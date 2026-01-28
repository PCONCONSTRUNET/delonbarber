import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { Check, X, Trash2, Crown, DollarSign } from 'lucide-react';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentMethod } from '@/components/payments/PaymentMethodSelector';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { toast } from 'sonner';

interface TimelineAppointmentsProps {
  appointments: AdminAppointment[];
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, status: string, method?: string) => void;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  pending: { label: 'Pendente', bg: 'bg-warning', border: 'border-l-warning' },
  confirmed: { label: 'Confirmado', bg: 'bg-primary', border: 'border-l-primary' },
  completed: { label: 'Concluído', bg: 'bg-success', border: 'border-l-success' },
  cancelled: { label: 'Cancelado', bg: 'bg-destructive/50', border: 'border-l-destructive' },
};

// Generate time slots from 8:00 to 20:00
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function TimelineAppointments({
  appointments,
  onUpdateStatus,
  onUpdatePayment,
  onDelete,
}: TimelineAppointmentsProps) {
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    appointment: AdminAppointment | null;
  }>({ open: false, appointment: null });

  const sortedAppts = [...appointments].sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time)
  );

  // Group appointments by hour for timeline display
  const appointmentsByHour = new Map<string, AdminAppointment[]>();
  sortedAppts.forEach((apt) => {
    const hour = apt.appointment_time.slice(0, 2) + ':00';
    if (!appointmentsByHour.has(hour)) {
      appointmentsByHour.set(hour, []);
    }
    appointmentsByHour.get(hour)!.push(apt);
  });

  const handleConfirmPayment = async (method: PaymentMethod) => {
    if (paymentModal.appointment) {
      await onUpdatePayment(paymentModal.appointment.id, 'paid', method);
    }
  };

  const handleWhatsApp = (apt: AdminAppointment) => {
    const phone = (apt.guest_phone || apt.profile?.phone)?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    const clientName = apt.guest_name || apt.profile?.name || 'Cliente';
    const services = apt.services.map((s) => s.name).join(', ');
    const message = `Olá ${clientName}! 👋\n\n✂️ Serviços: ${services}\n⏰ Horário: ${apt.appointment_time.slice(0, 5)}\n💰 Valor: R$ ${Number(apt.total_price).toFixed(0)}`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  // Find current hour to auto-scroll
  const currentHour = new Date().getHours();
  const currentSlotIndex = TIME_SLOTS.findIndex(
    (slot) => parseInt(slot) >= currentHour
  );

  if (sortedAppts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">📅</span>
        </div>
        <p className="text-muted-foreground text-sm">Nenhum agendamento</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Este dia está livre</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Timeline */}
        <div className="space-y-0">
          {TIME_SLOTS.map((timeSlot, index) => {
            const hourAppts = appointmentsByHour.get(timeSlot) || [];
            const hasAppointments = hourAppts.length > 0;
            const isPast = parseInt(timeSlot) < currentHour;

            return (
              <div key={timeSlot} className="relative flex">
                {/* Time column */}
                <div
                  className={cn(
                    'w-14 flex-shrink-0 text-xs font-medium py-3 pr-3 text-right',
                    isPast ? 'text-muted-foreground/40' : 'text-muted-foreground'
                  )}
                >
                  {timeSlot}
                </div>

                {/* Vertical line */}
                <div className="absolute left-14 top-0 bottom-0 w-px bg-border" />

                {/* Content area */}
                <div className="flex-1 pl-4 min-h-[48px] py-1">
                  <AnimatePresence mode="popLayout">
                    {hourAppts.map((apt) => (
                      <SwipeableAppointmentCard
                        key={apt.id}
                        appointment={apt}
                        onUpdateStatus={onUpdateStatus}
                        onOpenPayment={() =>
                          setPaymentModal({ open: true, appointment: apt })
                        }
                        onDelete={onDelete}
                        onWhatsApp={() => handleWhatsApp(apt)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PaymentModal
        open={paymentModal.open}
        onOpenChange={(open) =>
          setPaymentModal({ open, appointment: open ? paymentModal.appointment : null })
        }
        appointmentId={paymentModal.appointment?.id || ''}
        amount={Number(paymentModal.appointment?.total_price || 0)}
        clientName={paymentModal.appointment?.guest_name || paymentModal.appointment?.profile?.name}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
}

interface SwipeableCardProps {
  appointment: AdminAppointment;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenPayment: () => void;
  onDelete?: (id: string) => void;
  onWhatsApp: () => void;
}

function SwipeableAppointmentCard({
  appointment: apt,
  onUpdateStatus,
  onOpenPayment,
  onDelete,
  onWhatsApp,
}: SwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const x = useMotionValue(0);
  const actionsOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const constraintsRef = useRef(null);

  const config = statusConfig[apt.status];
  const isSubscriber = apt.payment_method === 'subscriber' || Number(apt.total_price) === 0;
  const isPaid = apt.payment_status === 'paid';

  // Calculate end time
  const startTime = apt.appointment_time.slice(0, 5);
  const duration = apt.total_duration || 30;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const totalMinutes = startHour * 60 + startMin + duration;
  const endHour = Math.floor(totalMinutes / 60);
  const endMin = totalMinutes % 60;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  const clientName = apt.guest_name || apt.profile?.name || 'Cliente';
  const services = apt.services.map((s) => s.name).join(', ');

  const handleDragEnd = (e: any, info: PanInfo) => {
    if (info.offset.x < -50) {
      setIsRevealed(true);
    } else {
      setIsRevealed(false);
    }
  };

  const handleTap = () => {
    if (isRevealed) {
      setIsRevealed(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative mb-2 overflow-hidden rounded-xl"
      ref={constraintsRef}
    >
      {/* Actions revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <motion.div
          style={{ opacity: actionsOpacity }}
          className="flex items-center gap-1 px-2 bg-card"
        >
          {apt.status === 'pending' && (
              <>
              <button
                onClick={() => onUpdateStatus(apt.id, 'confirmed')}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => onUpdateStatus(apt.id, 'cancelled')}
                className="h-10 w-10 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
          {apt.status === 'confirmed' && (
            <>
              <button
                onClick={() => onUpdateStatus(apt.id, 'completed')}
                className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform"
              >
                <Check className="h-5 w-5" />
              </button>
              {!isPaid && (
                <button
                  onClick={onOpenPayment}
                  className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center active:scale-95 transition-transform"
                >
                  <DollarSign className="h-5 w-5" />
                </button>
              )}
            </>
          )}
          {apt.status === 'completed' && !isPaid && (
            <button
              onClick={onOpenPayment}
              className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center active:scale-95 transition-transform"
            >
              <DollarSign className="h-5 w-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(apt.id)}
              className="h-10 w-10 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center active:scale-95 transition-transform"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Main card - draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        animate={{ x: isRevealed ? -120 : 0 }}
        style={{ x }}
        className={cn(
          'relative bg-card border-l-4 rounded-xl p-3 cursor-grab active:cursor-grabbing',
          config.border,
          apt.status === 'cancelled' && 'opacity-50'
        )}
      >
        {/* Status indicator dot */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isSubscriber && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-semibold">
              <Crown className="h-2.5 w-2.5" />
              VIP
            </div>
          )}
          {isPaid ? (
            <div className="w-2 h-2 rounded-full bg-primary" title="Pago" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" title="Aguardando" />
          )}
        </div>

        {/* Content */}
        <div className="pr-16">
          {/* Time range */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">
              {startTime} - {endTime}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {duration}min
            </span>
          </div>

          {/* Client name */}
          <div className="flex items-center gap-2 mb-0.5">
            <p
              className={cn(
                'font-medium text-sm truncate',
                apt.guest_name && 'text-primary'
              )}
            >
              {clientName}
            </p>
            {(apt.guest_phone || apt.profile?.phone) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp();
                }}
                className="p-1 rounded-full hover:bg-accent/50 transition-colors"
              >
                <WhatsAppIcon size={14} />
              </button>
            )}
          </div>

          {/* Services */}
          <p className="text-xs text-muted-foreground truncate">{services}</p>

          {/* Price */}
          <p
            className={cn(
              'text-sm font-semibold mt-1',
              isSubscriber ? 'text-accent' : 'text-primary'
            )}
          >
            {isSubscriber ? 'GRÁTIS' : `R$ ${Number(apt.total_price).toFixed(0)}`}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

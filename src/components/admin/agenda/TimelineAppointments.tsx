import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { Check, X, Trash2, Crown, DollarSign, Scissors, CreditCard, Plus } from 'lucide-react';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentMethod } from '@/components/payments/PaymentMethodSelector';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { QuickBookingModal } from './QuickBookingModal';
import { toast } from 'sonner';

interface BusinessHour {
  open_time: string;
  close_time: string;
  is_open: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
}

interface TimelineAppointmentsProps {
  appointments: AdminAppointment[];
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, status: string, method?: string) => void;
  onDelete?: (id: string) => void;
  businessHours?: BusinessHour | null;
  selectedDate: string;
  onRefresh?: () => void;
}

const statusConfig = {
  pending: { label: 'Pendente', bg: 'bg-warning', border: 'border-l-warning' },
  confirmed: { label: 'Confirmado', bg: 'bg-primary', border: 'border-l-primary' },
  completed: { label: 'Concluído', bg: 'bg-success', border: 'border-l-success' },
  cancelled: { label: 'Cancelado', bg: 'bg-destructive/50', border: 'border-l-destructive' },
};

// Generate time slots based on business hours
// For admin, always generate slots even if closed (admin can book exceptions)
const generateTimeSlots = (businessHours?: BusinessHour | null) => {
  const slots: string[] = [];
  
  // Default hours if no business hours provided
  let startHour = 8;
  let endHour = 18;
  
  // Use business hours if available (even if is_open is false, for admin exceptions)
  if (businessHours) {
    startHour = parseInt(businessHours.open_time.slice(0, 2));
    endHour = parseInt(businessHours.close_time.slice(0, 2));
  }
  
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    // Add half hour slots
    if (hour < endHour) {
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }
  return slots;
};

export function TimelineAppointments({
  appointments,
  onUpdateStatus,
  onUpdatePayment,
  onDelete,
  businessHours,
  selectedDate,
  onRefresh,
}: TimelineAppointmentsProps) {
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    appointment: AdminAppointment | null;
  }>({ open: false, appointment: null });

  const [quickBookingModal, setQuickBookingModal] = useState<{
    open: boolean;
    time: string;
  }>({ open: false, time: '' });

  // Generate time slots based on business hours
  const timeSlots = generateTimeSlots(businessHours);

  const sortedAppts = [...appointments].sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time)
  );

  // Group appointments by time slot for timeline display
  const appointmentsBySlot = new Map<string, AdminAppointment[]>();
  
  // Also track which slots are blocked by appointments (including multi-slot ones)
  const blockedSlots = new Set<string>();
  
  sortedAppts.forEach((apt) => {
    // Find the matching slot (round down to nearest slot)
    const aptTime = apt.appointment_time.slice(0, 5);
    const aptHour = parseInt(aptTime.slice(0, 2));
    const aptMin = parseInt(aptTime.slice(3, 5));
    const slotMin = aptMin >= 30 ? 30 : 0;
    const slotKey = `${String(aptHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
    
    if (!appointmentsBySlot.has(slotKey)) {
      appointmentsBySlot.set(slotKey, []);
    }
    appointmentsBySlot.get(slotKey)!.push(apt);
    
    // Mark all slots this appointment occupies as blocked (only if not cancelled)
    if (apt.status !== 'cancelled') {
      const duration = apt.total_duration || 30;
      const slotsNeeded = Math.ceil(duration / 30);
      for (let i = 0; i < slotsNeeded; i++) {
        const blockedMinutes = (aptHour * 60) + slotMin + (i * 30);
        const blockedHour = Math.floor(blockedMinutes / 60);
        const blockedMin = blockedMinutes % 60;
        const blockedKey = `${String(blockedHour).padStart(2, '0')}:${String(blockedMin).padStart(2, '0')}`;
        blockedSlots.add(blockedKey);
      }
    }
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

  const handleSlotClick = (timeSlot: string) => {
    setQuickBookingModal({ open: true, time: timeSlot });
  };

  const handleBookingSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Find current hour to auto-scroll
  const currentHour = new Date().getHours();
  const currentMin = new Date().getMinutes();

  return (
    <>
      <div className="relative">
        {/* Timeline */}
        <div className="space-y-0">
          {timeSlots.map((timeSlot, index) => {
            const slotAppts = appointmentsBySlot.get(timeSlot) || [];
            const hasAppointments = slotAppts.length > 0;
            const isBlocked = blockedSlots.has(timeSlot);
            const slotHour = parseInt(timeSlot.slice(0, 2));
            const slotMin = parseInt(timeSlot.slice(3, 5));
            const isPast = slotHour < currentHour || (slotHour === currentHour && slotMin < currentMin);
            const isFreeSlot = !hasAppointments && !isBlocked && !isPast;

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
                    {slotAppts.map((apt) => (
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
                  
                  {/* Clickable free slot */}
                  {isFreeSlot && (
                    <button
                      onClick={() => handleSlotClick(timeSlot)}
                      className="w-full h-10 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                      <span className="text-xs text-muted-foreground/40 group-hover:text-primary/70 transition-colors">
                        Agendar
                      </span>
                    </button>
                  )}
                  
                  {/* Blocked indicator (occupied by another appointment but not the start slot) */}
                  {!hasAppointments && isBlocked && !isPast && (
                    <div className="w-full h-10 rounded-lg bg-muted/30 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50">Ocupado</span>
                    </div>
                  )}
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

      <QuickBookingModal
        open={quickBookingModal.open}
        onOpenChange={(open) => setQuickBookingModal({ open, time: open ? quickBookingModal.time : '' })}
        selectedDate={selectedDate}
        selectedTime={quickBookingModal.time}
        onSuccess={handleBookingSuccess}
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

  // Calculate total width needed for actions
  const getActionsWidth = () => {
    if (apt.status === 'pending') return 200; // Aceitar + Recusar + Lixeira
    if (apt.status === 'confirmed') return isPaid ? 160 : 220; // Concluir + Pagar + Lixeira
    if (apt.status === 'completed' && !isPaid) return 160; // Pagar + Lixeira
    return 56; // Apenas Lixeira
  };

  const actionsWidth = getActionsWidth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative mb-2 overflow-hidden rounded-xl"
      ref={constraintsRef}
    >
      {/* Actions revealed on swipe - fixed width container */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-card/95 backdrop-blur-sm rounded-r-xl"
        style={{ width: actionsWidth }}
      >
        <div className="flex items-center gap-2 px-2">
          {/* PENDENTE: Confirmar ou Cancelar */}
          {apt.status === 'pending' && (
            <>
              <button
                onClick={() => onUpdateStatus(apt.id, 'confirmed')}
                className="h-11 px-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
              >
                <Check className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap">Aceitar</span>
              </button>
              <button
                onClick={() => onUpdateStatus(apt.id, 'cancelled')}
                className="h-11 px-3 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
              >
                <X className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap">Recusar</span>
              </button>
            </>
          )}

          {/* CONFIRMADO: Concluir Corte e/ou Registrar Pagamento */}
          {apt.status === 'confirmed' && (
            <>
              <button
                onClick={() => onUpdateStatus(apt.id, 'completed')}
                className="h-11 px-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
              >
                <Scissors className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap">Concluir</span>
              </button>
              {!isPaid && (
                <button
                  onClick={onOpenPayment}
                  className="h-11 px-3 rounded-xl bg-success text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
                >
                  <CreditCard className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-semibold whitespace-nowrap">Pagar</span>
                </button>
              )}
            </>
          )}

          {/* CONCLUÍDO: Apenas Registrar Pagamento se não pago */}
          {apt.status === 'completed' && !isPaid && (
            <button
              onClick={onOpenPayment}
              className="h-11 px-3 rounded-xl bg-success text-white flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
            >
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-semibold whitespace-nowrap">Pagar</span>
            </button>
          )}

          {/* Excluir (sempre disponível) */}
          {onDelete && (
            <button
              onClick={() => onDelete(apt.id)}
              className="h-11 w-11 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center active:scale-95 transition-transform shadow-sm flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main card - draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -(actionsWidth - 8), right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        animate={{ x: isRevealed ? -(actionsWidth - 8) : 0 }}
        style={{ x }}
        className={cn(
          'relative bg-card border-l-4 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm',
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

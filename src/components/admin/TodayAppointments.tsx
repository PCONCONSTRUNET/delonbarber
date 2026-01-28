import { useState } from 'react';
import { Clock, User, Check, X, Trash2, CreditCard, Banknote, Smartphone, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentMethod } from '@/components/payments/PaymentMethodSelector';
import { PixIcon } from '@/components/icons/PixIcon';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { toast } from 'sonner';

interface TodayAppointmentsProps {
  appointments: AdminAppointment[];
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePayment: (id: string, status: string, method?: string) => void;
  onDelete?: (id: string) => void;
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

const paymentMethodConfig: Record<string, { label: string; color: string }> = {
  pix: { label: 'PIX', color: 'text-teal-400' },
  credit: { label: 'Crédito', color: 'text-blue-400' },
  debit: { label: 'Débito', color: 'text-purple-400' },
  cash: { label: 'Dinheiro', color: 'text-green-400' },
  card: { label: 'Cartão', color: 'text-blue-400' },
  subscriber: { label: 'Assinante', color: 'text-yellow-500' },
};

const PaymentIcon = ({ method, size = 14 }: { method: string; size?: number }) => {
  switch (method) {
    case 'pix':
      return <PixIcon size={size} />;
    case 'credit':
    case 'card':
      return <CreditCard className={`text-blue-400`} style={{ width: size, height: size }} />;
    case 'debit':
      return <Smartphone className={`text-purple-400`} style={{ width: size, height: size }} />;
    case 'cash':
      return <Banknote className={`text-green-400`} style={{ width: size, height: size }} />;
    case 'subscriber':
      return <Crown className={`text-yellow-500`} style={{ width: size, height: size }} />;
    default:
      return null;
  }
};

export function TodayAppointments({ appointments, onUpdateStatus, onUpdatePayment, onDelete }: TodayAppointmentsProps) {
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    appointment: AdminAppointment | null;
  }>({ open: false, appointment: null });

  const sortedAppts = [...appointments]
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const handleOpenPayment = (apt: AdminAppointment) => {
    setPaymentModal({ open: true, appointment: apt });
  };

  const handleConfirmPayment = async (method: PaymentMethod) => {
    if (paymentModal.appointment) {
      await onUpdatePayment(paymentModal.appointment.id, 'paid', method);
    }
  };

  const handleWhatsApp = (apt: AdminAppointment) => {
    // Prefer guest phone, fallback to profile phone
    const phone = (apt.guest_phone || apt.profile?.phone)?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente não possui telefone cadastrado');
      return;
    }

    // Prefer guest name, fallback to profile name
    const clientName = apt.guest_name || apt.profile?.name || 'Cliente';
    const services = apt.services.map(s => s.name).join(', ');
    const status = statusLabels[apt.status];
    const paymentStatus = apt.payment_status === 'paid' ? 'Pago ✅' : 'Aguardando pagamento';
    const time = apt.appointment_time.slice(0, 5);
    const price = Number(apt.total_price).toFixed(0);

    const message = `Olá ${clientName}! 👋

📋 *Resumo do seu agendamento:*

✂️ Serviços: ${services}
📅 Horário: ${time}
💰 Valor: R$ ${price}
📊 Status: ${status}
💳 Pagamento: ${paymentStatus}

Qualquer dúvida, estamos à disposição! 💈`;

    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Abrindo WhatsApp...');
  };

  if (sortedAppts.length === 0) {
    return (
      <div className="p-4 md:p-6 rounded-xl md:rounded-2xl glass-effect text-center">
        <p className="text-sm md:text-base text-muted-foreground">Nenhum agendamento para este dia</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5 md:space-y-3">
        {sortedAppts.map((apt, index) => {
          const paymentMethod = apt.payment_method;
          const methodConfig = paymentMethod ? paymentMethodConfig[paymentMethod] : null;
          // Show as subscriber if payment method is 'subscriber' OR if price is 0 (benefits were used)
          const isSubscriber = paymentMethod === 'subscriber' || Number(apt.total_price) === 0;
          
          // Calculate end time based on duration
          const startTime = apt.appointment_time.slice(0, 5);
          const duration = apt.total_duration || 30;
          const [startHour, startMin] = startTime.split(':').map(Number);
          const totalMinutes = startHour * 60 + startMin + duration;
          const endHour = Math.floor(totalMinutes / 60);
          const endMin = totalMinutes % 60;
          const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
          const slotsBlocked = Math.ceil(duration / 30);
          
          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-2 md:p-4 rounded-xl md:rounded-2xl glass-effect"
            >
              <div className="flex items-start justify-between gap-1.5 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1 md:mb-2">
                    <Clock className="h-3 md:h-4 w-3 md:w-4 text-primary shrink-0" />
                    <span className="font-bold text-sm md:text-lg">{startTime} - {endTime}</span>
                    <Badge className="bg-primary/20 text-primary text-[9px] md:text-xs px-1 py-0">
                      {duration}min
                    </Badge>
                    <Badge className={cn("text-[9px] md:text-xs px-1 md:px-2 py-0", statusColors[apt.status])}>
                      {statusLabels[apt.status]}
                    </Badge>
                    {isSubscriber && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[9px] md:text-xs gap-0.5 font-semibold px-1 py-0">
                        <Crown className="h-2 md:h-3 w-2 md:w-3" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 md:gap-2 text-[11px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">
                    <User className="h-2.5 md:h-3 w-2.5 md:w-3 shrink-0" />
                    <span className={cn("truncate max-w-[120px] md:max-w-none", apt.guest_name ? "text-amber-400 font-medium" : "")}>
                      {apt.guest_name || apt.profile?.name || 'Cliente'}
                    </span>
                    {/* WhatsApp button */}
                    {(apt.guest_phone || apt.profile?.phone) && (
                      <button
                        onClick={() => handleWhatsApp(apt)}
                        className="p-0.5 rounded-full hover:bg-accent/20 transition-colors group shrink-0"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <WhatsAppIcon size={12} className="md:w-[14px] md:h-[14px] group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[10px] md:text-sm text-foreground/80 line-clamp-1">
                    {apt.services.map(s => s.name).join(', ')}
                  </p>
                  
                  <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2 flex-wrap">
                    <p className={cn(
                      "font-semibold text-xs md:text-sm",
                      isSubscriber ? "text-yellow-500" : "text-primary"
                    )}>
                      {isSubscriber ? 'GRÁTIS' : `R$ ${Number(apt.total_price).toFixed(0)}`}
                    </p>
                    
                    {/* Payment status badge */}
                    {apt.payment_status === 'paid' ? (
                      <Badge className="bg-green-500/20 text-green-400 text-[9px] md:text-xs border border-green-500/30 px-1 py-0">
                        ✓ Pago
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-[9px] md:text-xs border border-yellow-500/30 px-1 py-0">
                        Aguard.
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:gap-2 shrink-0">
                  {apt.status === 'pending' && (
                    <div className="flex gap-0.5 md:gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 md:h-8 md:w-8 p-0 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                        onClick={() => onUpdateStatus(apt.id, 'confirmed')}
                      >
                        <Check className="h-3 md:h-3.5 w-3 md:w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 md:h-8 md:w-8 p-0 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        onClick={() => onUpdateStatus(apt.id, 'cancelled')}
                      >
                        <X className="h-3 md:h-3.5 w-3 md:w-3.5" />
                      </Button>
                    </div>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <Button
                        size="sm"
                        className="h-6 md:h-8 text-[10px] md:text-xs px-1.5 md:px-2"
                        onClick={() => onUpdateStatus(apt.id, 'completed')}
                      >
                        <Check className="h-3 md:h-3.5 w-3 md:w-3.5 mr-0.5" />
                        OK
                      </Button>
                      {apt.payment_status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 md:h-8 px-1.5 md:px-2 border-green-500 text-green-500 gap-0.5"
                          onClick={() => handleOpenPayment(apt)}
                        >
                          <PixIcon size={12} />
                        </Button>
                      )}
                    </>
                  )}
                  {apt.status === 'completed' && apt.payment_status !== 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 md:h-8 px-1.5 md:px-2 border-green-500 text-green-500 gap-0.5"
                      onClick={() => handleOpenPayment(apt)}
                    >
                      <PixIcon size={12} />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 md:h-8 md:w-8 p-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDelete(apt.id)}
                    >
                      <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <PaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal({ open, appointment: open ? paymentModal.appointment : null })}
        appointmentId={paymentModal.appointment?.id || ''}
        amount={Number(paymentModal.appointment?.total_price || 0)}
        clientName={paymentModal.appointment?.profile?.name}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
}

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
      <div className="p-6 rounded-2xl glass-effect text-center">
        <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sortedAppts.map((apt, index) => {
          const paymentMethod = apt.payment_method;
          const methodConfig = paymentMethod ? paymentMethodConfig[paymentMethod] : null;
          const isSubscriber = paymentMethod === 'subscriber';
          
          return (
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
                    {isSubscriber && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs gap-1 font-semibold">
                        <Crown className="h-3 w-3" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    {/* Show guest name if available, otherwise show profile name */}
                    <span className={apt.guest_name ? "text-amber-400 font-medium" : ""}>
                      {apt.guest_name || apt.profile?.name || 'Cliente'}
                      {apt.guest_name && <span className="text-xs ml-1">(WhatsApp)</span>}
                    </span>
                    {/* Show guest phone or profile phone */}
                    {(apt.guest_phone || apt.profile?.phone) && (
                      <>
                        <span>• {apt.guest_phone || apt.profile?.phone}</span>
                        <button
                          onClick={() => handleWhatsApp(apt)}
                          className="ml-1 p-1 rounded-full hover:bg-green-500/20 transition-colors group"
                          title="Enviar mensagem no WhatsApp"
                        >
                          <WhatsAppIcon size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm text-foreground">
                    {apt.services.map(s => s.name).join(', ')}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <p className={cn(
                      "font-semibold",
                      isSubscriber ? "text-yellow-500" : "text-primary"
                    )}>
                      {isSubscriber ? 'GRÁTIS (Pacote)' : `R$ ${Number(apt.total_price).toFixed(0)}`}
                    </p>
                    
                    {/* Payment method badge */}
                    {paymentMethod && methodConfig && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs gap-1 border-muted-foreground/30",
                          methodConfig.color
                        )}
                      >
                        <PaymentIcon method={paymentMethod} size={12} />
                        {methodConfig.label}
                      </Badge>
                    )}
                    
                    {/* Payment status badge */}
                    {apt.payment_status === 'paid' ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs border border-green-500/30">
                        ✓ Pago
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs border border-yellow-500/30">
                        Aguardando
                      </Badge>
                    )}
                  </div>
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
                    <>
                      <Button
                        size="sm"
                        onClick={() => onUpdateStatus(apt.id, 'completed')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                      {apt.payment_status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-500 gap-1"
                          onClick={() => handleOpenPayment(apt)}
                        >
                          <PixIcon size={16} />
                          Pagar
                        </Button>
                      )}
                    </>
                  )}
                  {apt.status === 'completed' && apt.payment_status !== 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-500 gap-1"
                      onClick={() => handleOpenPayment(apt)}
                    >
                      <PixIcon size={16} />
                      Pagar
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => onDelete(apt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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

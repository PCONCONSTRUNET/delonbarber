import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, FileText, Check, Banknote, CreditCard, Crown, Ban } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/badge';
import { useMyPackages } from '@/hooks/useMyPackages';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PixIcon } from '@/components/icons/PixIcon';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'pix' | 'cash' | 'card' | 'subscriber';

interface AppointmentSummaryProps {
  selectedServices: Service[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  isSubmitting: boolean;
}

interface PaymentMethodConfig {
  id: PaymentMethod;
  label: string;
  description: string;
  iconColor: string;
  isPix?: boolean;
  isSubscriber?: boolean;
}

export function AppointmentSummary({
  selectedServices,
  selectedDate,
  selectedTime,
  notes,
  onNotesChange,
  onConfirm,
  isSubmitting
}: AppointmentSummaryProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('pix');
  const { packages, getRemainingForService } = useMyPackages();

  // Calculate which services can be covered by package benefits
  const getServiceCoverage = () => {
    const coverage: Record<string, { covered: boolean; remaining: number }> = {};
    
    for (const service of selectedServices) {
      const remaining = getRemainingForService(service.id);
      coverage[service.id] = {
        covered: remaining > 0,
        remaining
      };
    }
    
    return coverage;
  };

  const serviceCoverage = getServiceCoverage();
  
  // Check if ALL selected services can be covered by subscriber benefits
  const allServicesCovered = selectedServices.every(s => serviceCoverage[s.id]?.covered);
  
  // Check if user has any active package
  const hasActivePackage = packages.some(p => p.status === 'active');
  
  // Show subscriber option only if user has package AND all services can be covered
  const showSubscriberOption = hasActivePackage && allServicesCovered && selectedServices.length > 0;

  // Calculate prices
  const originalTotal = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  
  // If subscriber payment is selected, calculate covered price
  const calculateFinalPrice = () => {
    if (selectedPayment === 'subscriber') {
      return 0; // All covered services are free
    }
    return originalTotal;
  };
  
  const finalPrice = calculateFinalPrice();
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  
  // Calculate how many 30-minute slots will be blocked
  const slotsBlocked = Math.ceil(totalDuration / 30);

  // Reset payment method if subscriber option becomes unavailable
  useEffect(() => {
    if (selectedPayment === 'subscriber' && !showSubscriberOption) {
      setSelectedPayment('pix');
    }
  }, [showSubscriberOption, selectedPayment]);

  const basePaymentMethods: PaymentMethodConfig[] = [
    { id: 'pix', label: 'PIX', description: 'Pague agora e garanta seu horário', iconColor: '', isPix: true },
    { id: 'cash', label: 'Dinheiro', description: 'Pagar no local', iconColor: 'text-green-500' },
    { id: 'card', label: 'Cartão', description: 'Pagar no local', iconColor: 'text-blue-500' },
  ];

  // Add subscriber option if available
  const paymentMethods: PaymentMethodConfig[] = showSubscriberOption
    ? [
        { id: 'subscriber', label: 'Assinante', description: 'Usar benefícios do seu pacote', iconColor: 'text-yellow-500', isSubscriber: true },
        ...basePaymentMethods,
      ]
    : basePaymentMethods;

  const formatTime = (time: string) => time.slice(0, 5);

  const renderPaymentIcon = (method: PaymentMethodConfig, isSelected: boolean) => {
    if (method.isPix) {
      return <PixIcon size={22} />;
    }
    
    if (method.isSubscriber) {
      return <Crown className="h-5 w-5 text-yellow-500" />;
    }
    
    const iconClass = cn("h-5 w-5", method.iconColor);
    
    switch (method.id) {
      case 'cash':
        return <Banknote className={iconClass} />;
      case 'card':
        return <CreditCard className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Services */}
      <div className="bg-card/80 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          ✂️ Serviços
        </h3>
        <div className="space-y-2">
          {selectedServices.map((service, index) => {
            const isCovered = serviceCoverage[service.id]?.covered;
            const showCoveredPrice = selectedPayment === 'subscriber' && isCovered;
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm">{service.name}</span>
                  {isCovered && selectedPayment === 'subscriber' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-right">
                  {showCoveredPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground line-through">
                        R$ {Number(service.price).toFixed(0)}
                      </span>
                      <span className="text-yellow-500 font-bold text-sm">
                        GRÁTIS
                      </span>
                    </div>
                  ) : (
                    <span className="text-primary font-semibold text-sm">
                      R$ {Number(service.price).toFixed(0)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Data</span>
          </div>
          <p className="text-foreground font-semibold text-sm">
            {selectedDate 
              ? format(selectedDate, "dd/MM", { locale: ptBR })
              : '-'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {selectedDate && format(selectedDate, "EEEE", { locale: ptBR })}
          </p>
        </div>

        <div className="bg-card/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Horário</span>
          </div>
          <p className="text-foreground font-bold text-xl">
            {selectedTime ? formatTime(selectedTime) : '-'}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card/80 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileText className="w-4 h-4" />
          <span className="text-xs">Observações (opcional)</span>
        </div>
        <Textarea
          placeholder="Ex: Preferência de corte, alergias..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="resize-none bg-transparent border-0 p-0 text-sm focus-visible:ring-0 min-h-[60px]"
          rows={2}
        />
      </div>

      {/* Payment Method Selection */}
      <div className="bg-card/80 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          💳 Forma de Pagamento
        </h3>
        <div className={cn(
          "grid gap-2",
          showSubscriberOption ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        )}>
          {paymentMethods.map((method) => {
            const isSelected = selectedPayment === method.id;
            
            return (
              <motion.button
                key={method.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPayment(method.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                  isSelected
                    ? method.isSubscriber
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-primary bg-primary/10"
                    : "border-border bg-card/50 hover:bg-muted/50"
                )}
              >
                {renderPaymentIcon(method, isSelected)}
                <span className={cn(
                  "text-xs font-medium",
                  isSelected 
                    ? method.isSubscriber 
                      ? "text-yellow-500" 
                      : "text-primary" 
                    : "text-foreground"
                )}>
                  {method.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {paymentMethods.find(m => m.id === selectedPayment)?.description}
        </p>
      </div>

      {/* Subscriber Benefits Info */}
      <AnimatePresence>
        {selectedPayment === 'subscriber' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-500">Usando Benefícios VIP</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Seus benefícios de assinante serão usados para cobrir os serviços selecionados.
                Após confirmar, o uso será registrado automaticamente.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIX Info - sem QR Code */}
      <AnimatePresence>
        {selectedPayment === 'pix' && originalTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <PixIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pagamento via PIX
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pague no local no dia do atendimento
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total */}
      <div className={cn(
        "rounded-2xl p-4",
        selectedPayment === 'subscriber' ? "bg-yellow-500/10" : "bg-primary/10"
      )}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="text-foreground font-medium">{totalDuration} min</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            {selectedPayment === 'subscriber' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  R$ {originalTotal.toFixed(0)}
                </span>
                <span className="text-2xl font-bold text-yellow-500">
                  GRÁTIS
                </span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-primary">
                R$ {finalPrice.toFixed(0)}
              </p>
            )}
          </div>
        </div>
        
        {/* Slots blocked info */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50">
          <Ban className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {slotsBlocked === 1 ? (
              <>Este agendamento reserva <Badge variant="secondary" className="mx-1 px-1.5 py-0">1 horário</Badge></>
            ) : (
              <>Este agendamento reserva <Badge variant="secondary" className="mx-1 px-1.5 py-0">{slotsBlocked} horários</Badge> consecutivos</>
            )}
          </span>
        </div>
      </div>
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => onConfirm(selectedPayment)}
          disabled={isSubmitting}
          className={cn(
            "w-full h-14 text-base font-bold rounded-2xl",
            selectedPayment === 'subscriber' && "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                ✂️
              </motion.span>
              Confirmando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {selectedPayment === 'subscriber' ? (
                <>
                  <Crown className="w-5 h-5" />
                  Usar Benefício VIP
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirmar Agendamento
                </>
              )}
            </span>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

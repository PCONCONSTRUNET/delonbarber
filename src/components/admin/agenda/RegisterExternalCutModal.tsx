import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, User, Phone, CreditCard, Clock, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentMethodSelector, PaymentMethod } from '@/components/payments/PaymentMethodSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface RegisterExternalCutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onSuccess: () => void;
}

export function RegisterExternalCutModal({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
}: RegisterExternalCutModalProps) {
  const isMobile = useIsMobile();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customPrice, setCustomPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [editableDate, setEditableDate] = useState(selectedDate);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedServiceDetails = services.filter(s => selectedServices.includes(s.id));
  const totalDuration = selectedServiceDetails.reduce((acc, s) => acc + s.duration_minutes, 0);
  const calculatedPrice = selectedServiceDetails.reduce((acc, s) => acc + s.price, 0);
  const finalPrice = customPrice ? parseFloat(customPrice) : calculatedPrice;

  useEffect(() => {
    if (open) {
      fetchServices();
      setSelectedServices([]);
      setClientName('');
      setClientPhone('');
      setCustomTime('');
      setPaymentMethod('cash');
      setCustomPrice('');
      setEditableDate(selectedDate);
    }
  }, [open, selectedDate]);

  async function fetchServices() {
    setLoadingServices(true);
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('is_active', true)
      .order('name');
    if (!error && data) setServices(data);
    setLoadingServices(false);
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  async function handleSubmit() {
    if (selectedServices.length === 0) { toast.error('Selecione pelo menos um serviço'); return; }
    if (!clientName.trim()) { toast.error('Digite o nome do cliente'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Sessão expirada'); setLoading(false); return; }

      let guestClientId: string | null = null;
      const phoneClean = clientPhone.replace(/\D/g, '');
      if (phoneClean) {
        const { data: existingGuest } = await supabase
          .from('guest_clients').select('id').eq('phone', phoneClean).single();
        if (existingGuest) {
          guestClientId = existingGuest.id;
        } else {
          const { data: newGuest } = await supabase
            .from('guest_clients').insert({ name: clientName.trim(), phone: phoneClean }).select('id').single();
          if (newGuest) guestClientId = newGuest.id;
        }
      }

      const timeFormatted = customTime
        ? (customTime.length === 5 ? `${customTime}:00` : customTime)
        : '00:00:00';

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          appointment_date: editableDate,
          appointment_time: timeFormatted,
          status: 'completed' as const,
          total_price: finalPrice,
          total_duration: totalDuration,
          payment_status: 'paid',
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          guest_name: clientName.trim(),
          guest_phone: phoneClean || null,
          guest_client_id: guestClientId,
          notes: '📋 Corte registrado manualmente (externo)',
          is_force_booking: true,
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.error('Error registering external cut:', appointmentError);
        toast.error('Erro ao registrar corte');
        setLoading(false);
        return;
      }

      const appointmentServices = selectedServiceDetails.map(service => ({
        appointment_id: appointment.id,
        service_id: service.id,
        price_at_booking: service.price,
      }));

      const { error: servicesError } = await supabase
        .from('appointment_services').insert(appointmentServices);

      if (servicesError) {
        await supabase.from('appointments').delete().eq('id', appointment.id);
        toast.error('Erro ao salvar serviços');
        setLoading(false);
        return;
      }

      toast.success('📋 Corte externo registrado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  const parsedDate = parse(editableDate, 'yyyy-MM-dd', new Date());

  const paymentOptions: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'pix', label: 'PIX', icon: '◆' },
    { id: 'credit', label: 'Crédito', icon: '💳' },
    { id: 'debit', label: 'Débito', icon: '📱' },
    { id: 'cash', label: 'Dinheiro', icon: '💵' },
  ];

  const formContent = (
    <div className="space-y-3 overflow-y-auto flex-1 px-1">
      {/* Date + Time + Client in compact rows */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Data</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-1.5 text-xs font-medium rounded-xl bg-muted/30 border-border/50 px-2">
                <CalendarIcon className="h-3 w-3 text-success" />
                {format(parsedDate, "dd/MM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <Calendar
                mode="single"
                selected={parsedDate}
                onSelect={(date) => {
                  if (date) {
                    setEditableDate(format(date, 'yyyy-MM-dd'));
                    setCalendarOpen(false);
                  }
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Hora</Label>
          <Input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="h-9 text-xs rounded-xl bg-muted/30 border-border/50 px-2"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Valor (R$)</Label>
          <Input
            type="number"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder={`${calculatedPrice}`}
            className="h-9 text-xs rounded-xl bg-muted/30 border-border/50 px-2"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Client */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Nome do cliente *"
          className="h-9 text-sm rounded-xl bg-muted/30 border-border/50"
        />
        <Input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Telefone"
          className="h-9 text-sm rounded-xl bg-muted/30 border-border/50"
        />
      </div>

      {/* Services - compact */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Serviços *</Label>
        <div className="flex flex-wrap gap-1.5">
          {loadingServices ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : (
            services.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-[0.96] border',
                    isSelected
                      ? 'bg-success/20 border-success/40 text-success'
                      : 'bg-muted/20 border-border/50 text-muted-foreground'
                  )}
                >
                  {service.name} • R${service.price}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Payment - inline chips */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Pagamento</Label>
        <div className="flex gap-1.5">
          {paymentOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPaymentMethod(opt.id)}
              className={cn(
                'flex-1 py-2 rounded-xl text-[11px] font-medium transition-all active:scale-[0.96] border text-center',
                paymentMethod === opt.id
                  ? 'bg-success/20 border-success/40 text-success'
                  : 'bg-muted/20 border-border/50 text-muted-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      {selectedServices.length > 0 && (
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-bold text-success text-lg">R$ {finalPrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  );

  const footerContent = (
    <div className="flex gap-2 pt-1">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={loading}
        className="flex-1 h-10 rounded-2xl text-sm font-medium"
      >
        Cancelar
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={loading || selectedServices.length === 0}
        className="flex-1 h-10 rounded-2xl text-sm font-medium bg-success text-success-foreground hover:bg-success/90 active:scale-[0.97] transition-all"
      >
        {loading ? 'Salvando...' : 'Registrar'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] px-4 pb-safe">
          <DrawerHeader className="pb-2 pt-3 px-0">
            <DrawerTitle className="flex items-center gap-2 text-base font-semibold">
              <ClipboardCheck className="h-5 w-5 text-success" />
              Registrar Corte Externo
            </DrawerTitle>
          </DrawerHeader>
          {formContent}
          <DrawerFooter className="px-0 pb-4">
            {footerContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 max-h-[85vh] flex flex-col rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="h-5 w-5 text-success" />
            Registrar Corte Externo
          </DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter className="flex-shrink-0">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { User, Phone, Zap, AlertTriangle, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface SqueezeInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onSuccess: () => void;
}

export function SqueezeInModal({
  open,
  onOpenChange,
  selectedDate,
  onSuccess,
}: SqueezeInModalProps) {
  const isMobile = useIsMobile();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [editableDate, setEditableDate] = useState(selectedDate);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedServiceDetails = services.filter(s => selectedServices.includes(s.id));
  const totalDuration = selectedServiceDetails.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = selectedServiceDetails.reduce((acc, s) => acc + s.price, 0);

  const calculateEndTime = () => {
    if (!customTime || totalDuration === 0) return '';
    const [hour, min] = customTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + totalDuration;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      fetchServices();
      setSelectedServices([]);
      setClientName('');
      setClientPhone('');
      setCustomTime('');
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
    if (!customTime) { toast.error('Informe o horário do encaixe'); return; }
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

      const timeFormatted = customTime.length === 5 ? `${customTime}:00` : customTime;

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          appointment_date: editableDate,
          appointment_time: timeFormatted,
          status: 'confirmed' as const,
          total_price: totalPrice,
          total_duration: totalDuration,
          payment_status: 'pending',
          guest_name: clientName.trim(),
          guest_phone: phoneClean || null,
          guest_client_id: guestClientId,
          notes: '⚡ Encaixe manual',
          is_force_booking: true,
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.error('Error creating squeeze-in:', appointmentError);
        toast.error('Erro ao criar encaixe');
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

      toast.success('⚡ Encaixe criado com sucesso!');
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

  const formContent = (
    <div className="space-y-3 overflow-y-auto flex-1 px-1">
      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Data</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 justify-start gap-1.5 text-xs font-medium rounded-xl bg-muted/30 border-border/50 px-2">
                <CalendarIcon className="h-3 w-3 text-warning" />
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
          <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Horário *</Label>
          <Input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="h-9 text-xs rounded-xl bg-muted/30 border-border/50 px-2"
            autoFocus
          />
        </div>
      </div>

      {customTime && totalDuration > 0 && (
        <div className="text-xs text-muted-foreground text-center font-medium">
          {customTime} → {calculateEndTime()} <span className="text-warning">({totalDuration}min)</span>
        </div>
      )}

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

      {/* Services - compact chips */}
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
                      ? 'bg-warning/20 border-warning/40 text-warning'
                      : 'bg-muted/20 border-border/50 text-muted-foreground'
                  )}
                >
                  {service.name} • {service.duration_minutes}min • R${service.price}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Total */}
      {selectedServices.length > 0 && (
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-muted-foreground">{totalDuration}min</span>
          <span className="font-bold text-warning text-lg">R$ {totalPrice}</span>
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
        disabled={loading || selectedServices.length === 0 || !customTime}
        className="flex-1 h-10 rounded-2xl text-sm font-medium bg-warning text-warning-foreground hover:bg-warning/90 active:scale-[0.97] transition-all"
      >
        {loading ? 'Salvando...' : '⚡ Encaixar'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] px-4 pb-safe">
          <DrawerHeader className="pb-2 pt-3 px-0">
            <DrawerTitle className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-5 w-5 text-warning" />
              Encaixe de Horário
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
            <Zap className="h-5 w-5 text-warning" />
            Encaixe de Horário
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

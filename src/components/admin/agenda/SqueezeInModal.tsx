import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Clock, User, Phone, Zap, AlertTriangle, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    if (!customTime) {
      toast.error('Informe o horário do encaixe');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    if (!clientName.trim()) {
      toast.error('Digite o nome do cliente');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Sessão expirada'); setLoading(false); return; }

      // Handle guest client
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
          appointment_date: selectedDate,
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

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md p-3 sm:p-6 max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            Encaixe de Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1">
          {/* Warning */}
          <div className="p-2 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Encaixe ignora conflitos de horário. Use com cuidado!
            </p>
          </div>

          {/* Date and custom time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs font-medium">{formatDate(selectedDate)}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="squeezeTime" className="text-xs">Horário *</Label>
              <Input
                id="squeezeTime"
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {customTime && totalDuration > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {customTime} → {calculateEndTime()} ({totalDuration}min)
            </div>
          )}

          {/* Client info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="squeezeName" className="flex items-center gap-1 text-xs">
                <User className="h-3 w-3" /> Nome *
              </Label>
              <Input
                id="squeezeName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="João Silva"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="squeezePhone" className="flex items-center gap-1 text-xs">
                <Phone className="h-3 w-3" /> Telefone
              </Label>
              <Input
                id="squeezePhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="11999999999"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-1">
            <Label className="text-xs">Serviços *</Label>
            <ScrollArea className="h-[120px] sm:h-[140px] border rounded-lg p-1.5">
              {loadingServices ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors',
                        selectedServices.includes(service.id)
                          ? 'bg-warning/10 border border-warning/30'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox checked={selectedServices.includes(service.id)} className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{service.name}</p>
                        <p className="text-[10px] text-muted-foreground">{service.duration_minutes}min</p>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0">
                        {service.price === 0 ? 'VIP' : `R$${service.price}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {selectedServices.length > 0 && (
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs">Duração:</span>
                <Badge variant="secondary" className="text-[10px] h-5">{totalDuration}min</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Total:</span>
                <span className="font-bold text-warning text-sm">R$ {totalPrice}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} size="sm" className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedServices.length === 0 || !customTime}
            size="sm"
            className="flex-1 sm:flex-none bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {loading ? 'Salvando...' : '⚡ Encaixar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

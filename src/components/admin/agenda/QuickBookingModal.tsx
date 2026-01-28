import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, Scissors, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface QuickBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  selectedTime: string;
  onSuccess: () => void;
}

export function QuickBookingModal({
  open,
  onOpenChange,
  selectedDate,
  selectedTime,
  onSuccess,
}: QuickBookingModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

  // Calculate totals
  const selectedServiceDetails = services.filter(s => selectedServices.includes(s.id));
  const totalDuration = selectedServiceDetails.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = selectedServiceDetails.reduce((acc, s) => acc + s.price, 0);
  const slotsNeeded = Math.ceil(totalDuration / 30);

  // Calculate end time
  const calculateEndTime = () => {
    if (!selectedTime || totalDuration === 0) return selectedTime;
    const [hour, min] = selectedTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + totalDuration;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      fetchServices();
      // Reset form
      setSelectedServices([]);
      setClientName('');
      setClientPhone('');
    }
  }, [open]);

  async function fetchServices() {
    setLoadingServices(true);
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setServices(data);
    }
    setLoadingServices(false);
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  async function handleSubmit() {
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
      // Get admin user for user_id (we need a valid user_id due to FK constraint)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sessão expirada');
        setLoading(false);
        return;
      }

      // Check or create guest client
      let guestClientId: string | null = null;
      const phoneClean = clientPhone.replace(/\D/g, '');

      if (phoneClean) {
        // Check if guest client exists
        const { data: existingGuest } = await supabase
          .from('guest_clients')
          .select('id')
          .eq('phone', phoneClean)
          .single();

        if (existingGuest) {
          guestClientId = existingGuest.id;
        } else {
          // Create new guest client
          const { data: newGuest, error: guestError } = await supabase
            .from('guest_clients')
            .insert({
              name: clientName.trim(),
              phone: phoneClean,
            })
            .select('id')
            .single();

          if (!guestError && newGuest) {
            guestClientId = newGuest.id;
          }
        }
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: 'confirmed',
          total_price: totalPrice,
          total_duration: totalDuration,
          payment_status: 'pending',
          guest_name: clientName.trim(),
          guest_phone: phoneClean || null,
          guest_client_id: guestClientId,
          notes: 'Agendamento manual via agenda',
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError);
        
        // Check for overlap conflict
        if (appointmentError.message?.includes('Conflito')) {
          toast.error('Conflito de horário: este horário já está ocupado');
        } else {
          toast.error('Erro ao criar agendamento');
        }
        setLoading(false);
        return;
      }

      // Insert appointment_services
      const appointmentServices = selectedServiceDetails.map(service => ({
        appointment_id: appointment.id,
        service_id: service.id,
        price_at_booking: service.price,
      }));

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices);

      if (servicesError) {
        console.error('Error creating appointment services:', servicesError);
        // Rollback: delete the appointment
        await supabase.from('appointments').delete().eq('id', appointment.id);
        toast.error('Erro ao salvar serviços');
        setLoading(false);
        return;
      }

      toast.success('Agendamento criado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Erro inesperado ao criar agendamento');
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time info */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {formatDate(selectedDate)} às {selectedTime}
              </p>
              {totalDuration > 0 && (
                <p className="text-xs text-muted-foreground">
                  Término: {calculateEndTime()} ({totalDuration}min)
                </p>
              )}
            </div>
          </div>

          {/* Client info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome do Cliente *
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João Silva"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone (opcional)
              </Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ex: 11999999999"
              />
            </div>
          </div>

          {/* Services selection */}
          <div className="space-y-2">
            <Label>Serviços *</Label>
            <ScrollArea className="h-[180px] border rounded-lg p-2">
              {loadingServices ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        selectedServices.includes(service.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration_minutes}min
                        </p>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold",
                        service.price === 0 ? "text-primary" : "text-foreground"
                      )}>
                        {service.price === 0 ? 'VIP' : `R$ ${service.price}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {selectedServices.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Duração total:</span>
                <Badge variant="secondary">{totalDuration}min</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Valor total:</span>
                <span className="font-bold text-primary">R$ {totalPrice}</span>
              </div>
              {slotsNeeded > 1 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Bloqueará {slotsNeeded} horários consecutivos</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedServices.length === 0}>
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

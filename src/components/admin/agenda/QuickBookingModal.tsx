import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Phone, Scissors, AlertCircle, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminClients } from '@/hooks/useAdmin';
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
  const { clients } = useAdminClients();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
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
      setClientSearch('');
      setSelectedClient(null);
      setShowSearchResults(false);
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

    if (!selectedClient && !clientName.trim()) {
      toast.error('Digite o nome do cliente ou busque um cadastrado');
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

      let guestClientId: string | null = null;
      let finalUserId = user.id;
      let finalGuestName: string | null = clientName.trim();
      let finalGuestPhone: string | null = clientPhone.replace(/\D/g, '') || null;

      if (selectedClient) {
        if (!selectedClient.is_guest) {
           finalUserId = selectedClient.user_id;
           finalGuestName = null;
           finalGuestPhone = null;
        } else {
           guestClientId = selectedClient.id;
           finalGuestName = selectedClient.name;
           finalGuestPhone = selectedClient.phone;
        }
      } else {
        if (finalGuestPhone) {
          // Check if guest client exists
          const { data: existingGuest } = await supabase
            .from('guest_clients')
            .select('id')
            .eq('phone', finalGuestPhone)
            .single();

          if (existingGuest) {
            guestClientId = existingGuest.id;
          } else {
            // Create new guest client
            const { data: newGuest, error: guestError } = await supabase
              .from('guest_clients')
              .insert({
                name: finalGuestName,
                phone: finalGuestPhone,
              })
              .select('id')
              .single();

            if (!guestError && newGuest) {
              guestClientId = newGuest.id;
            }
          }
        }
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: finalUserId,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: 'confirmed',
          total_price: totalPrice,
          total_duration: totalDuration,
          payment_status: 'pending',
          guest_name: finalGuestName,
          guest_phone: finalGuestPhone,
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
      <DialogContent className="max-w-[95vw] sm:max-w-md p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1">
          {/* Time info */}
          <div className="p-2 sm:p-3 rounded-lg bg-muted/50 flex items-center gap-2 sm:gap-3">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium">
                {formatDate(selectedDate)} às {selectedTime}
              </p>
              {totalDuration > 0 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Término: {calculateEndTime()} ({totalDuration}min)
                </p>
              )}
            </div>
          </div>

          {/* Registered Client Search */}
          <div className="space-y-2 relative">
            <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-primary">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              Cliente já cadastrado
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={selectedClient ? selectedClient.name : clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedClient(null);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="pl-9 pr-9 h-9 sm:h-10 text-sm"
              />
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch('');
                    setClientName('');
                    setClientPhone('');
                  }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {showSearchResults && clientSearch && !selectedClient && (
              <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-card border rounded-lg shadow-lg">
                {clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 ? (
                  clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5).map(c => (
                    <div
                      key={c.id}
                      className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex flex-col"
                      onClick={() => {
                        setSelectedClient(c);
                        setShowSearchResults(false);
                        setClientSearch('');
                        setClientName(c.name || '');
                        setClientPhone(c.phone || '');
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                )}
              </div>
            )}
          </div>

          <div className="py-2">
             <Label className="text-xs sm:text-sm text-muted-foreground font-semibold flex items-center gap-1">
                Cliente sem cadastro
             </Label>
          </div>

          {/* Client info - grid on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-0">
            <div className="space-y-1">
              <Label htmlFor="clientName" className="flex items-center gap-1 text-xs sm:text-sm">
                Nome {!selectedClient && '*'}
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="João Silva"
                className="h-8 sm:h-10 text-sm"
                disabled={!!selectedClient}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="clientPhone" className="flex items-center gap-1 text-xs sm:text-sm">
                Telefone
              </Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="11999999999"
                className="h-8 sm:h-10 text-sm"
                disabled={!!selectedClient}
              />
            </div>
          </div>

          {/* Services selection */}
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Serviços *</Label>
            <ScrollArea className="h-[120px] sm:h-[160px] border rounded-lg p-1.5 sm:p-2">
              {loadingServices ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs sm:text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center gap-2 p-1.5 sm:p-2 rounded-lg cursor-pointer transition-colors',
                        selectedServices.includes(service.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 active:bg-muted/70'
                      )}
                      onClick={() => toggleService(service.id)}
                    >
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{service.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {service.duration_minutes}min
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs sm:text-sm font-semibold flex-shrink-0",
                        service.price === 0 ? "text-primary" : "text-foreground"
                      )}>
                        {service.price === 0 ? 'VIP' : `R$${service.price}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary - compact */}
          {selectedServices.length > 0 && (
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm">Duração:</span>
                <Badge variant="secondary" className="text-[10px] sm:text-xs h-5">{totalDuration}min</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm">Total:</span>
                <span className="font-bold text-primary text-sm sm:text-base">R$ {totalPrice}</span>
              </div>
              {slotsNeeded > 1 && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>Bloqueará {slotsNeeded} horários</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} size="sm" className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedServices.length === 0} size="sm" className="flex-1 sm:flex-none">
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, Scissors, Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminClients } from '@/hooks/useAdmin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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

export function ManualBooking() {
  const { clients } = useAdminClients();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('pending');
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate totals
  const selectedServiceDetails = services.filter(s => selectedServices.includes(s.id));
  const totalDuration = selectedServiceDetails.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = selectedServiceDetails.reduce((acc, s) => acc + s.price, 0);

  // Calculate end time
  const calculateEndTime = () => {
    if (!selectedTime || totalDuration === 0) return '';
    const [hour, min] = selectedTime.split(':').map(Number);
    const totalMinutes = hour * 60 + min + totalDuration;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchServices();
  }, []);

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

  const resetForm = () => {
    setSelectedServices([]);
    setClientName('');
    setClientPhone('');
    setClientSearch('');
    setSelectedClient(null);
    setShowSearchResults(false);
    setPaymentMethod('pending');
    setSelectedTime('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
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

    if (!selectedDate || !selectedTime) {
      toast.error('Selecione a data e o horário do agendamento');
      return;
    }

    setLoading(true);

    try {
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
          const { data: existingGuest } = await supabase
            .from('guest_clients')
            .select('id')
            .eq('phone', finalGuestPhone)
            .single();

          if (existingGuest) {
            guestClientId = existingGuest.id;
          } else {
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

      const timeFormatted = selectedTime.length === 5 ? `${selectedTime}:00` : selectedTime;

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: finalUserId,
          appointment_date: selectedDate,
          appointment_time: timeFormatted,
          status: 'confirmed',
          total_price: totalPrice,
          total_duration: totalDuration,
          payment_status: paymentMethod === 'pending' ? 'pending' : 'paid',
          payment_method: paymentMethod === 'pending' ? null : paymentMethod,
          guest_name: finalGuestName,
          guest_phone: finalGuestPhone,
          guest_client_id: guestClientId,
          notes: 'Agendamento manual via painel',
          is_force_booking: true,
        })
        .select('id')
        .single();

      if (appointment) {
        // Mark as locally created to prevent duplicate toast/notification
        (window as any).__lastCreatedAppointmentId = appointment.id;
      }

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError);
        
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
        await supabase.from('appointments').delete().eq('id', appointment.id);
        toast.error('Erro ao salvar serviços');
        setLoading(false);
        return;
      }

      toast.success('Agendamento manual criado com sucesso!');
      resetForm();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Erro inesperado ao criar agendamento');
    } finally {
      setLoading(false);
    }
  }

  const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date());

  return (
    <div className="w-full max-w-4xl space-y-6 pb-20">
      <div className="bg-card border rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm">
        
        {/* Date and Time Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Data do Agendamento *
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                  {format(parsedDate, "dd 'de' MMMM', 'yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(format(date, 'yyyy-MM-dd'));
                      setCalendarOpen(false);
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Horário de Início *
            </Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Client Data */}
          <div className="space-y-6">
            
            {/* Registered Client Search */}
            <div className="space-y-2 relative">
              <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                <User className="h-4 w-4" />
                Cliente já cadastrado
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={selectedClient ? selectedClient.name : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClient(null);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className="pl-9 pr-9 bg-background"
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
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
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

            <div className="pt-2 pb-1 border-t">
               <Label className="text-sm text-muted-foreground font-semibold flex items-center gap-1">
                  Ou preencha (Cliente sem cadastro)
               </Label>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="flex items-center gap-1">
                  Nome do Cliente {!selectedClient && '*'}
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João Silva"
                  disabled={!!selectedClient}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="flex items-center gap-1">
                  Telefone (WhatsApp)
                </Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="11999999999"
                  disabled={!!selectedClient}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Services & Payment */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                Serviços *
              </Label>
              <ScrollArea className="h-[220px] border rounded-lg p-2 bg-muted/10">
                {loadingServices ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Carregando serviços...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                          selectedServices.includes(service.id)
                            ? 'bg-primary/10 border-primary/30 shadow-sm'
                            : 'bg-card hover:bg-muted/50 border-transparent'
                        )}
                        onClick={() => toggleService(service.id)}
                      >
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                          className="h-5 w-5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.duration_minutes} min
                          </p>
                        </div>
                        <span className={cn(
                          "font-bold flex-shrink-0 whitespace-nowrap",
                          service.price === 0 ? "text-primary" : "text-foreground"
                        )}>
                          {service.price === 0 ? 'VIP' : `R$ ${service.price.toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {selectedServices.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-primary/10">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Duração total</p>
                    <p className="font-medium">{totalDuration} min</p>
                    {selectedTime && (
                      <p className="text-xs text-primary/80">Término previsto: {calculateEndTime()}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Valor total</p>
                    <p className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Situação do Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pendente (Pagar depois)</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Limpar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || selectedServices.length === 0 || !selectedTime || !selectedDate || (!selectedClient && !clientName.trim())} 
            className="w-full sm:w-auto min-w-[200px]"
          >
            {loading ? 'Salvando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Calendar, Clock, User, Phone, MessageSquare, Scissors, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, getDay, setHours, setMinutes, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Import payment icons
import iconPix from '@/assets/icon-pix.png';
import iconCard from '@/assets/icon-card.png';
import iconCash from '@/assets/icon-cash.png';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string | null;
}

interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  is_open: boolean;
}

type PaymentMethod = 'pix' | 'card' | 'cash';

const paymentMethods = [
  { id: 'pix' as PaymentMethod, name: 'PIX', icon: iconPix, description: 'Pagamento instantâneo' },
  { id: 'card' as PaymentMethod, name: 'Cartão', icon: iconCard, description: 'Crédito ou débito' },
  { id: 'cash' as PaymentMethod, name: 'Dinheiro', icon: iconCash, description: 'Pagamento no local' },
];

const steps = [
  { id: 1, title: 'Dados', icon: User },
  { id: 2, title: 'Serviços', icon: Scissors },
  { id: 3, title: 'Data/Hora', icon: Calendar },
  { id: 4, title: 'Pagamento', icon: CreditCard },
];

const Pedido = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | undefined>();
  const [notes, setNotes] = useState('');
  
  // Data from DB
  const [services, setServices] = useState<Service[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load services and business hours
  useEffect(() => {
    const loadData = async () => {
      const [servicesRes, hoursRes] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true).eq('subscribers_only', false),
        supabase.from('business_hours').select('*'),
      ]);
      
      if (servicesRes.data) setServices(servicesRes.data);
      if (hoursRes.data) setBusinessHours(hoursRes.data);
      setLoading(false);
    };
    loadData();
  }, []);

  // Load booked slots when date changes
  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }
    
    const loadBookedSlots = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', dateStr)
        .in('status', ['pending', 'confirmed']);
      
      const { data: blockedData } = await supabase
        .from('blocked_slots')
        .select('blocked_time')
        .eq('blocked_date', dateStr);
      
      const booked = data?.map(a => a.appointment_time) || [];
      const blocked = blockedData?.map(b => b.blocked_time) || [];
      setBookedSlots([...booked, ...blocked]);
    };
    loadBookedSlots();
  }, [selectedDate]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;
      case 2: return selectedServices.length > 0;
      case 3: return selectedDate && selectedTime;
      case 4: return selectedPayment;
      default: return false;
    }
  };

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    
    const dayOfWeek = getDay(selectedDate);
    const hours = businessHours.find(h => h.day_of_week === dayOfWeek);
    
    if (!hours || !hours.is_open) return [];
    
    const slots: string[] = [];
    const [openHour, openMin] = hours.open_time.split(':').map(Number);
    const [closeHour, closeMin] = hours.close_time.split(':').map(Number);
    
    let current = setMinutes(setHours(selectedDate, openHour), openMin);
    const end = setMinutes(setHours(selectedDate, closeHour), closeMin);
    const now = new Date();
    
    while (isBefore(current, end)) {
      const timeStr = format(current, 'HH:mm');
      
      // Skip lunch break
      if (hours.lunch_start && hours.lunch_end) {
        const [lunchStartHour, lunchStartMin] = hours.lunch_start.split(':').map(Number);
        const [lunchEndHour, lunchEndMin] = hours.lunch_end.split(':').map(Number);
        const lunchStart = setMinutes(setHours(selectedDate, lunchStartHour), lunchStartMin);
        const lunchEnd = setMinutes(setHours(selectedDate, lunchEndHour), lunchEndMin);
        
        if (!isBefore(current, lunchStart) && isBefore(current, lunchEnd)) {
          current = setMinutes(current, current.getMinutes() + 30);
          continue;
        }
      }
      
      // Skip past times for today
      if (format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && isBefore(current, now)) {
        current = setMinutes(current, current.getMinutes() + 30);
        continue;
      }
      
      // Skip booked slots
      if (!bookedSlots.includes(timeStr + ':00')) {
        slots.push(timeStr);
      }
      
      current = setMinutes(current, current.getMinutes() + 30);
    }
    
    return slots;
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    
    const dayOfWeek = getDay(date);
    const hours = businessHours.find(h => h.day_of_week === dayOfWeek);
    return !hours?.is_open;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    
    try {
      // Get admin user for placeholder
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);
      
      const adminUser = adminUsers?.[0];
      
      if (!adminUser) {
        toast.error('Erro de configuração do sistema');
        return;
      }
      
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanName = name.trim();
      
      // Check if guest client already exists by phone
      let guestClientId: string | null = null;
      
      const { data: existingClient } = await supabase
        .from('guest_clients')
        .select('id, name')
        .eq('phone', cleanPhone)
        .maybeSingle();
      
      if (existingClient) {
        // Client already exists, use their ID
        guestClientId = existingClient.id;
        
        // Update name if different
        if (existingClient.name !== cleanName) {
          await supabase
            .from('guest_clients')
            .update({ name: cleanName, updated_at: new Date().toISOString() })
            .eq('id', existingClient.id);
        }
      } else {
        // Create new guest client
        const { data: newClient, error: clientError } = await supabase
          .from('guest_clients')
          .insert({
            name: cleanName,
            phone: cleanPhone,
          })
          .select('id')
          .single();
        
        if (clientError) {
          console.error('Error creating guest client:', clientError);
        } else {
          guestClientId = newClient.id;
        }
      }
      
      const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
      const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
      
      // Create appointment with guest_client_id - AUTO CONFIRMED for WhatsApp orders
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          user_id: adminUser.user_id, // Use admin as placeholder
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime + ':00',
          total_price: totalPrice,
          total_duration: totalDuration,
          status: 'confirmed', // Auto-confirm orders from WhatsApp form
          payment_status: 'pending',
          payment_method: selectedPayment,
          notes: notes ? `[Via WhatsApp] ${notes}` : '[Via WhatsApp]',
          guest_name: cleanName,
          guest_phone: cleanPhone,
          guest_client_id: guestClientId,
        })
        .select()
        .single();
      
      if (appointmentError) throw appointmentError;
      
      // Insert appointment services
      const appointmentServices = selectedServices.map(service => ({
        appointment_id: appointment.id,
        service_id: service.id,
        price_at_booking: service.price,
      }));
      
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices);
      
      if (servicesError) throw servicesError;
      
      // Block the slot
      await supabase.from('blocked_slots').insert({
        blocked_date: format(selectedDate, 'yyyy-MM-dd'),
        blocked_time: selectedTime + ':00',
        appointment_id: appointment.id,
        is_manual: false,
        reason: 'Agendamento via WhatsApp',
      });
      
      // Update guest client stats if created
      if (guestClientId) {
        await supabase
          .from('guest_clients')
          .update({ 
            last_visit_at: new Date().toISOString(),
            total_visits: (await supabase.from('guest_clients').select('total_visits').eq('id', guestClientId).single()).data?.total_visits + 1 || 1
          })
          .eq('id', guestClientId);
      }
      
      setIsSuccess(true);
      toast.success('Pedido confirmado com sucesso!');
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const timeSlots = getAvailableTimeSlots();

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AnimatedBackground />
      <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl p-8 text-center max-w-md w-full shadow-xl border border-border"
        >
          {/* Logo on success */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="mb-4"
          >
            <img 
              src="/icons/icon-192.png" 
              alt="Delon Barber" 
              className="w-16 h-16 mx-auto rounded-xl shadow-md"
            />
          </motion.div>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-green-500" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Agendamento Confirmado! ✂️
          </h1>
          <p className="text-muted-foreground mb-6">
            Seu horário está reservado. Te esperamos!
          </p>
          
          <div className="bg-muted/50 rounded-2xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horário:</span>
              <span className="font-medium">{selectedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviços:</span>
              <span className="font-medium">{selectedServices.map(s => s.name).join(', ')}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary">R$ {totalPrice.toFixed(0)}</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            💬 Você receberá uma mensagem no WhatsApp confirmando seu horário.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <AnimatedBackground />
      
      <main className="pt-4 pb-20 px-3 sm:px-4 max-w-lg mx-auto safe-area-top">
        {/* Header with Logo - More compact on mobile */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-2"
          >
            <img 
              src="/icons/icon-192.png" 
              alt="Delon Barber" 
              className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-xl shadow-lg"
            />
          </motion.div>
          
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Delon Barber
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Preencha seus dados para agendar
          </p>
        </motion.div>

        {/* Progress Steps - Compact on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center mb-4"
        >
          <div className="flex items-center gap-0.5 sm:gap-1">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all",
                      isActive || isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-6 sm:w-8 h-0.5 mx-0.5 sm:mx-1",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Selected services summary - Compact on mobile */}
        {selectedServices.length > 0 && currentStep > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 rounded-xl p-2 sm:p-3 mb-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="font-semibold text-foreground">
                {selectedServices.length}x
              </span>
              <span className="text-muted-foreground">
                {totalDuration}min
              </span>
            </div>
            <span className="text-base sm:text-lg font-bold text-primary">
              R$ {totalPrice.toFixed(0)}
            </span>
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <Card className="rounded-xl sm:rounded-2xl">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Nome completo
                    </Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-lg h-10 sm:h-12 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      WhatsApp
                    </Label>
                    <Input
                      id="phone"
                      placeholder="(48) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="rounded-lg h-10 sm:h-12 text-sm"
                      maxLength={15}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="flex items-center gap-1.5 text-sm">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Algum pedido especial?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-lg resize-none text-sm"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-2"
            >
              {loading ? (
                <div className="flex justify-center py-8">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="text-2xl"
                  >
                    ✂️
                  </motion.span>
                </div>
              ) : (
                services.map((service) => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  return (
                    <motion.div
                      key={service.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleService(service)}
                      className={cn(
                        "p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{service.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {service.duration_minutes} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-sm">
                            R$ {Number(service.price).toFixed(0)}
                          </span>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              <Card className="rounded-xl">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Escolha a data</h3>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(undefined);
                    }}
                    disabled={isDateDisabled}
                    locale={ptBR}
                    className="rounded-lg !p-1 [&_table]:w-full [&_td]:p-0.5 [&_th]:p-0.5 [&_button]:h-8 [&_button]:w-8 [&_button]:text-xs"
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 30)}
                  />
                </CardContent>
              </Card>
              
              {selectedDate && (
                <Card className="rounded-xl">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">Escolha o horário</h3>
                    </div>
                    
                    {timeSlots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-3 text-sm">
                        Nenhum horário disponível nesta data
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {timeSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className="rounded-lg h-9 text-xs px-2"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-3"
            >
              <Card className="rounded-xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Forma de pagamento</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {paymentMethods.map((method) => {
                      const isSelected = selectedPayment === method.id;
                      return (
                        <motion.div
                          key={method.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedPayment(method.id)}
                          className={cn(
                            "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 active:scale-[0.98]",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                        >
                          <img src={method.icon} alt={method.name} className="w-8 h-8" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-sm">{method.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Order Summary - Compact */}
              <Card className="rounded-xl bg-muted/30">
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-2">Resumo do pedido</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium truncate max-w-[150px]">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horário:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviços:</span>
                      <span className="font-medium text-right max-w-[150px] truncate">
                        {selectedServices.map(s => s.name).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="font-semibold text-sm">Total:</span>
                      <span className="font-bold text-primary">R$ {totalPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons - Compact on mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
          <div className="max-w-lg mx-auto flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 h-11 rounded-xl text-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="flex-1 h-11 rounded-xl text-sm"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 h-11 rounded-xl text-sm"
              >
                {isSubmitting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    ✂️
                  </motion.span>
                ) : (
                  <>
                    Confirmar
                    <Check className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pedido;

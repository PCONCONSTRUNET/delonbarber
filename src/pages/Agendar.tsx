import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, History, ArrowLeft, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceSelection } from '@/components/agendar/ServiceSelection';
import { DateTimeSelection } from '@/components/agendar/DateTimeSelection';
import { AppointmentSummary } from '@/components/agendar/AppointmentSummary';
import { AppointmentHistory } from '@/components/agendar/AppointmentHistory';
import { MyPackagesBenefits } from '@/components/client/MyPackagesBenefits';
import { PaymentConfirmationDialog } from '@/components/payments/PaymentConfirmationDialog';
import { 
  useServices, 
  useBusinessHours, 
  useAppointments, 
  useBookedSlots,
  Service 
} from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useIsAdmin } from '@/hooks/useAdmin';

const steps = [
  { id: 1, title: 'Serviços' },
  { id: 2, title: 'Data e Hora' },
  { id: 3, title: 'Confirmar' },
];

const Agendar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('agendar');
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    appointmentId: string;
    amount: number;
    date: Date;
    time: string;
    services: string[];
  } | null>(null);

  const { services, loading: servicesLoading } = useServices();
  const { businessHours, loading: hoursLoading } = useBusinessHours();
  const { appointments, loading: appointmentsLoading, createAppointment, cancelAppointment } = useAppointments();
  const bookedSlots = useBookedSlots(selectedDate);
  const { isAdmin } = useIsAdmin();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedServices.length > 0;
      case 2: return selectedDate && selectedTime;
      case 3: return true;
      default: return false;
    }
  };

  const handleConfirm = async (paymentMethod: 'pix' | 'cash' | 'card') => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    const result = await createAppointment(selectedServices, selectedDate, selectedTime, notes, paymentMethod);
    setIsSubmitting(false);

    if (result) {
      // Only show payment dialog for PIX
      if (paymentMethod === 'pix') {
        setPaymentDialog({
          open: true,
          appointmentId: result.id,
          amount: Number(result.total_price),
          date: selectedDate,
          time: selectedTime,
          services: selectedServices.map(s => s.name),
        });
      } else {
        // For cash/card, just go to history
        setActiveTab('historico');
      }

      // Reset form
      setSelectedServices([]);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes('');
      setCurrentStep(1);
    }
  };

  const handlePaymentDialogClose = (open: boolean) => {
    if (!open) {
      setPaymentDialog(null);
      setActiveTab('historico');
    }
  };


  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AnimatedBackground />
      
      <main className="pt-6 pb-16 px-4 max-w-lg mx-auto">
        {/* Header com botão voltar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cliente')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="font-display text-2xl font-bold text-foreground">
            ✂️ Agendar
          </h1>
          
          <div className="flex gap-1">
            {user && (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin')}
                    className="rounded-full text-primary"
                  >
                    <Shield className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/perfil')}
                  className="rounded-full"
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                  }}
                  className="rounded-full text-muted-foreground"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-2xl p-1">
            <TabsTrigger value="agendar" className="rounded-xl text-sm">
              📅 Agendar
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-xl text-sm">
              📋 Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agendar" className="mt-0">
            {/* My Package Benefits - compact view */}
            {user && <MyPackagesBenefits compact />}

            {/* Progress Steps - compacto */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mb-6"
            >
              <div className="flex items-center gap-1">
                {steps.map((step, index) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                          isActive || isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {step.id}
                      </div>
                      
                      {index < steps.length - 1 && (
                        <div className={cn(
                          "w-8 h-0.5 mx-1",
                          isCompleted ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Selected services summary - fixo no topo quando tem seleção */}
            {selectedServices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 rounded-2xl p-3 mb-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">
                    {selectedServices.length}x
                  </span>
                  <span className="text-muted-foreground">
                    {totalDuration}min
                  </span>
                </div>
                <span className="text-lg font-bold text-primary">
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
                >
                  {servicesLoading ? (
                    <div className="flex justify-center py-12">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="text-3xl"
                      >
                        ✂️
                      </motion.span>
                    </div>
                  ) : (
                    <ServiceSelection
                      services={services}
                      selectedServices={selectedServices}
                      onToggleService={toggleService}
                    />
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {hoursLoading ? (
                    <div className="flex justify-center py-12">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="text-3xl"
                      >
                        ✂️
                      </motion.span>
                    </div>
                  ) : (
                    <DateTimeSelection
                      businessHours={businessHours}
                      bookedSlots={bookedSlots}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onSelectDate={handleDateSelect}
                      onSelectTime={setSelectedTime}
                    />
                  )}
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <AppointmentSummary
                    selectedServices={selectedServices}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    notes={notes}
                    onNotesChange={setNotes}
                    onConfirm={handleConfirm}
                    isSubmitting={isSubmitting}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons - fixos no bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
              <div className="max-w-lg mx-auto flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 1}
                  className="flex-1 h-12 rounded-2xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>

                {currentStep < 3 && (
                  <Button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceed()}
                    className="flex-1 h-12 rounded-2xl"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            {!user ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <History className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Faça login
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Para ver seus agendamentos
                </p>
                <Button onClick={() => navigate('/login')} className="rounded-2xl">
                  Entrar
                </Button>
              </motion.div>
            ) : appointmentsLoading ? (
              <div className="flex justify-center py-12">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="text-3xl"
                >
                  ✂️
                </motion.span>
              </div>
            ) : (
              <AppointmentHistory
                appointments={appointments}
                onCancel={cancelAppointment}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Confirmation Dialog */}
      {paymentDialog && (
        <PaymentConfirmationDialog
          open={paymentDialog.open}
          onOpenChange={handlePaymentDialogClose}
          appointmentId={paymentDialog.appointmentId}
          amount={paymentDialog.amount}
          date={paymentDialog.date}
          time={paymentDialog.time}
          services={paymentDialog.services}
        />
      )}
    </div>
  );
};

export default Agendar;

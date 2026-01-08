import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, ChevronRight, ChevronLeft, CalendarDays, History } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceSelection } from '@/components/agendar/ServiceSelection';
import { DateTimeSelection } from '@/components/agendar/DateTimeSelection';
import { AppointmentSummary } from '@/components/agendar/AppointmentSummary';
import { AppointmentHistory } from '@/components/agendar/AppointmentHistory';
import { 
  useServices, 
  useBusinessHours, 
  useAppointments, 
  useBookedSlots,
  Service 
} from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const steps = [
  { id: 1, title: 'Serviços', icon: Scissors },
  { id: 2, title: 'Data e Hora', icon: CalendarDays },
  { id: 3, title: 'Confirmar', icon: ChevronRight },
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

  const { services, loading: servicesLoading } = useServices();
  const { businessHours, loading: hoursLoading } = useBusinessHours();
  const { appointments, loading: appointmentsLoading, createAppointment, cancelAppointment } = useAppointments();
  const bookedSlots = useBookedSlots(selectedDate);

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

  const handleConfirm = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    const result = await createAppointment(selectedServices, selectedDate, selectedTime, notes);
    setIsSubmitting(false);

    if (result) {
      // Reset form
      setSelectedServices([]);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setNotes('');
      setCurrentStep(1);
      setActiveTab('historico');
    }
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Agende seu <span className="text-gradient">Horário</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Escolha seus serviços e agende seu horário
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="agendar" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Novo Agendamento
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="w-4 h-4" />
                Meu Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agendar">
              {/* Progress Steps */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mb-10"
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                      <div key={step.id} className="flex items-center">
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isActive ? 1.1 : 1,
                            backgroundColor: isActive || isCompleted ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-full"
                        >
                          <StepIcon className={`w-5 h-5 ${isActive || isCompleted ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                          <span className={`hidden sm:inline text-sm font-medium ${isActive || isCompleted ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {step.title}
                          </span>
                        </motion.div>
                        
                        {index < steps.length - 1 && (
                          <ChevronRight className="w-5 h-5 text-muted-foreground mx-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Selected services summary bar */}
              {selectedServices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-foreground">
                      <strong>{selectedServices.length}</strong> serviço(s) selecionado(s)
                    </span>
                    <span className="text-sm text-muted-foreground">|</span>
                    <span className="text-sm text-foreground">
                      ⏱️ {totalDuration} min
                    </span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </motion.div>
              )}

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {servicesLoading ? (
                      <div className="flex justify-center py-12">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <Scissors className="w-8 h-8 text-primary" />
                        </motion.div>
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {hoursLoading ? (
                      <div className="flex justify-center py-12">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <Scissors className="w-8 h-8 text-primary" />
                        </motion.div>
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
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
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

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>

                {currentStep < 3 && (
                  <Button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceed()}
                    className="gap-2"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Login prompt */}
              {!user && currentStep === 3 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-muted-foreground mt-4"
                >
                  Você será redirecionado para fazer login ao confirmar
                </motion.p>
              )}
            </TabsContent>

            <TabsContent value="historico">
              {!user ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Faça login para ver seu histórico
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Você precisa estar logado para ver seus agendamentos
                  </p>
                  <Button onClick={() => navigate('/login')}>
                    Fazer Login
                  </Button>
                </motion.div>
              ) : appointmentsLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Scissors className="w-8 h-8 text-primary" />
                  </motion.div>
                </div>
              ) : (
                <AppointmentHistory
                  appointments={appointments}
                  onCancel={cancelAppointment}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Agendar;

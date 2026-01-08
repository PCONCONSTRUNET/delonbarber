import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Scissors, 
  Crown, 
  Droplet, 
  Sparkles,
  Check,
  User,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  { id: "classic", icon: Scissors, title: "Corte Clássico", price: "R$ 45" },
  { id: "premium", icon: Crown, title: "Corte Premium", price: "R$ 65" },
  { id: "beard", icon: Droplet, title: "Barba Completa", price: "R$ 35" },
  { id: "combo", icon: Sparkles, title: "Combo Especial", price: "R$ 95" },
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

const Agendar = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const canProceed = () => {
    if (step === 1) return selectedService !== null;
    if (step === 2) return selectedDate !== undefined;
    if (step === 3) return selectedTime !== null;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      <Navbar />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Agende seu <span className="text-gradient">Horário</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Escolha o serviço, data e horário que melhor se encaixam na sua agenda.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors",
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "w-16 h-1 mx-2 rounded-full transition-colors",
                      step > s ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="max-w-4xl mx-auto">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-semibold text-center mb-8">
                  Escolha o Serviço
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={cn(
                        "p-6 rounded-xl glass-effect text-left transition-all duration-300",
                        selectedService === service.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <service.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{service.title}</h3>
                          <p className="text-primary font-bold">{service.price}</p>
                        </div>
                        {selectedService === service.id && (
                          <Check className="h-6 w-6 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Date */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-semibold text-center mb-8">
                  Escolha a Data
                </h2>
                <Card className="max-w-md mx-auto glass-effect border-border">
                  <CardContent className="p-6">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Select Time */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-semibold text-center mb-8">
                  Escolha o Horário
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        "p-3 rounded-lg font-medium transition-all duration-200",
                        selectedTime === time
                          ? "bg-primary text-primary-foreground"
                          : "glass-effect hover:border-primary/50"
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                Voltar
              </Button>
              
              {step < 3 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/login">
                  <Button disabled={!canProceed()} className="gap-2">
                    <User className="h-4 w-4" />
                    Fazer Login para Confirmar
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Agendar;

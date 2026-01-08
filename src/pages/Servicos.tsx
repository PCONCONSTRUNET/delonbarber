import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Scissors, 
  Sparkles, 
  Crown, 
  Droplet, 
  Flame,
  Clock,
  Star
} from "lucide-react";

const services = [
  {
    icon: Scissors,
    title: "Corte Clássico",
    description: "Corte tradicional com acabamento impecável. Inclui lavagem e finalização.",
    duration: "30 min",
    price: "R$ 45",
    popular: false,
  },
  {
    icon: Crown,
    title: "Corte Premium",
    description: "Consultoria de estilo personalizada, corte exclusivo com técnicas avançadas e tratamento capilar.",
    duration: "45 min",
    price: "R$ 65",
    popular: true,
  },
  {
    icon: Droplet,
    title: "Barba Completa",
    description: "Modelagem completa, hidratação e tratamento com toalha quente.",
    duration: "25 min",
    price: "R$ 35",
    popular: false,
  },
  {
    icon: Flame,
    title: "Barba com Navalha",
    description: "Técnica tradicional com navalha, espuma especial e toalha quente.",
    duration: "35 min",
    price: "R$ 50",
    popular: false,
  },
  {
    icon: Sparkles,
    title: "Combo Especial",
    description: "Corte + Barba + Tratamento capilar + Hidratação facial. A experiência completa.",
    duration: "75 min",
    price: "R$ 95",
    popular: true,
  },
  {
    icon: Star,
    title: "Tratamento VIP",
    description: "Experiência exclusiva com todos os serviços, massagem relaxante e bebida premium.",
    duration: "120 min",
    price: "R$ 180",
    popular: false,
  },
];

const Servicos = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
              Nossos <span className="text-gradient">Serviços</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Cada serviço é uma experiência única, combinando técnica impecável 
              com produtos premium para resultados excepcionais.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="group relative p-8 rounded-2xl glass-effect hover:border-primary/50 transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Popular badge */}
                {service.popular && (
                  <div className="absolute -top-3 right-6 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Popular
                  </div>
                )}

                {/* Icon */}
                <div className="mb-6 p-4 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                  <service.icon className="h-8 w-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-semibold mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  {service.description}
                </p>

                {/* Duration */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration}</span>
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-2xl font-bold text-primary">
                    {service.price}
                  </span>
                  <Link to="/agendar">
                    <Button size="sm" variant="outline" className="border-primary/50 hover:bg-primary hover:text-primary-foreground">
                      Agendar
                    </Button>
                  </Link>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-6">
              Não encontrou o que procura? Entre em contato conosco!
            </p>
            <Link to="/agendar">
              <Button size="lg" className="glow-effect">
                Agendar Horário
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Servicos;

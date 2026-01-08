import { Link } from "react-router-dom";
import { Scissors, Sparkles, Crown, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Scissors,
    title: "Corte Clássico",
    description: "Cortes tradicionais com técnicas modernas",
    price: "R$ 45",
  },
  {
    icon: Crown,
    title: "Corte Premium",
    description: "Consultoria de estilo personalizada",
    price: "R$ 65",
  },
  {
    icon: Droplet,
    title: "Barba Completa",
    description: "Modelagem e tratamento premium",
    price: "R$ 35",
  },
  {
    icon: Sparkles,
    title: "Combo Especial",
    description: "Corte + Barba + Tratamento",
    price: "R$ 95",
  },
];

export function ServicesPreview() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Nossos <span className="text-gradient">Serviços</span>
          </h2>
          <p className="text-muted-foreground">
            Serviços exclusivos para o homem que busca excelência
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group relative p-6 rounded-xl glass-effect hover:border-primary/50 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="mb-4 p-3 rounded-lg bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                <service.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="font-display text-lg font-semibold mb-2">
                {service.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {service.description}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  {service.price}
                </span>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/servicos">
            <Button variant="outline" size="lg" className="border-primary/50 hover:bg-primary hover:text-primary-foreground">
              Ver Todos os Serviços
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

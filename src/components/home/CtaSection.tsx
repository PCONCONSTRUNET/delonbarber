import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/20 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Pronto para uma <span className="text-gradient">transformação</span>?
          </h2>
          
          <p className="text-lg text-muted-foreground">
            Agende seu horário agora e descubra o que significa uma experiência 
            de barbearia verdadeiramente premium.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendar">
              <Button size="lg" className="gap-2 glow-effect text-lg px-8">
                <Calendar className="h-5 w-5" />
                Agendar Agora
              </Button>
            </Link>
            <Link to="/servicos">
              <Button variant="ghost" size="lg" className="gap-2 text-lg">
                Conhecer Serviços
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

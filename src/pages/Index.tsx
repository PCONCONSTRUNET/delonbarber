import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Instagram, Smartphone, MessageSquare } from "lucide-react";
import barberPhoto from "@/assets/barber-photo.png";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      {/* Install App Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button variant="outline" size="sm" className="gap-2 glass-effect border-border/50">
          <Smartphone className="h-4 w-4" />
          Instalar App
        </Button>
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
          {/* Profile Photo with Ring */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/50 to-primary/20 blur-xl opacity-60 animate-pulse-glow" />
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full p-1 bg-gradient-to-br from-primary to-primary/50">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-background">
                <img 
                  src={barberPhoto} 
                  alt="Barbearia Alan Delon" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6 mb-4">
            <a 
              href="https://instagram.com/delon_barber_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-4 w-4" />
              <span className="text-sm">@delon_barber_</span>
            </a>
            <a 
              href="https://wa.me/5548999520220" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-sm">(48) 9952-0220</span>
            </a>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-500 text-sm font-medium">Aberto</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl font-bold text-center mb-4 tracking-tight">
            Barbearia
            <br />
            <span className="text-gradient">Alan Delon</span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-center text-lg md:text-xl max-w-md mb-10">
            Agende seu horário de forma rápida e exclusiva
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="min-w-[180px] text-lg font-semibold"
              onClick={() => navigate("/login")}
            >
              Criar Conta
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="min-w-[180px] text-lg border-foreground/20 hover:bg-foreground/5"
              onClick={() => navigate("/login")}
            >
              Já tenho conta
            </Button>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-16 px-4">
          <div className="container max-w-4xl mx-auto">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-primary rounded-full" />
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-xl font-semibold">Avaliações dos Clientes</h2>
            </div>

            {/* Reviews Card */}
            <div className="glass-effect rounded-2xl p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Ainda não há avaliações.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

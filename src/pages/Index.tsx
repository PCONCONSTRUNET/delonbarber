import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Instagram, MessageSquare, Smartphone } from "lucide-react";
import barberPhoto from "@/assets/barber-photo.png";

const Index = () => {
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

          {/* Instagram Handle */}
          <a 
            href="https://instagram.com/alandelon_barber" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <Instagram className="h-4 w-4" />
            <span className="text-sm">@alandelon_barber</span>
          </a>

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
            <Link to="/login">
              <Button size="lg" className="min-w-[180px] text-lg font-semibold">
                Criar Conta
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="min-w-[180px] text-lg border-foreground/20 hover:bg-foreground/5">
                Já tenho conta
              </Button>
            </Link>
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

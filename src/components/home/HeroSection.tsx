import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-barbershop.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Barbearia Alan Delon"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/80" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 py-32 md:py-40">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">
              Experiência Premium em Barbearia
            </span>
          </div>

          {/* Title */}
          <h1 
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="block">BARBEARIA</span>
            <span className="text-gradient">ALAN DELON</span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Tradição e estilo em cada corte. Onde o clássico encontra o moderno 
            para transformar sua imagem.
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <Link to="/login">
              <Button size="lg" className="gap-2 glow-effect text-lg px-8">
                <User className="h-5 w-5" />
                Entrar
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 border-foreground/20 hover:bg-foreground/5">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex justify-center pt-2">
          <div className="w-1 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

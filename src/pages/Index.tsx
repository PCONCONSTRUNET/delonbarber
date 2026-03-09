import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { PublicRatings } from "@/components/ratings/PublicRatings";
import { InstallAppDialog } from "@/components/pwa/InstallAppDialog";
import { Button } from "@/components/ui/button";
import { Instagram, Smartphone } from "lucide-react";
import barberPhoto from "@/assets/barber-photo.png";

const Index = () => {
  const navigate = useNavigate();
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AnimatedBackground />
      
      {/* Install App Button - mobile optimized */}
      <div className="fixed top-3 right-3 z-50 safe-area-top">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 glass-effect border-border/50 h-9 px-3 text-xs sm:text-sm sm:h-10 sm:px-4"
          onClick={() => setInstallDialogOpen(true)}
        >
          <Smartphone className="h-4 w-4" />
          <span className="hidden xs:inline">Instalar</span> App
      </Button>
      </div>

      <InstallAppDialog open={installDialogOpen} onOpenChange={setInstallDialogOpen} />

      <main className="relative z-10">
        {/* Hero Section - mobile optimized */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-3 xs:px-4 py-12 sm:py-16">
          {/* Profile Photo with Ring - responsive sizing */}
          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/50 to-primary/20 blur-xl opacity-60 animate-pulse-glow" />
            <div className="relative w-28 h-28 xs:w-32 xs:h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-br from-primary to-primary/50">
              <div className="w-full h-full rounded-full overflow-hidden border-2 xs:border-3 sm:border-4 border-background">
                <img 
                  src={barberPhoto} 
                  alt="Barbearia Alan Delon" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Social Links - mobile stacked on very small screens */}
          <div className="flex flex-row items-center gap-4 xs:gap-6 mb-2 sm:mb-4">
            <a 
              href="https://instagram.com/delon_barber_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            >
              <Instagram className="h-4 w-4" />
              <span className="text-xs xs:text-sm">@delon_barber_</span>
            </a>
            <a 
              href="https://wa.me/5548999520220" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-green-500 transition-colors active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-xs xs:text-sm">(48) 9952-0220</span>
            </a>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-5 sm:mb-8">
            <span className="relative flex h-2 w-2 xs:h-2.5 xs:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 xs:h-2.5 xs:w-2.5 bg-green-500"></span>
            </span>
            <span className="text-green-500 text-xs xs:text-sm font-medium">Aberto</span>
          </div>

          {/* Title - responsive font sizes */}
          <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-bold text-center mb-2 sm:mb-4 tracking-tight leading-tight">
            Barbearia
            <br />
            <span className="text-gradient">Alan Delon</span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-center text-sm xs:text-base sm:text-lg max-w-xs xs:max-w-md mb-6 sm:mb-10 px-2">
            Agende seu horário de forma rápida e exclusiva
          </p>

          {/* CTA Buttons - always stacked on mobile */}
          <div className="flex flex-col w-full max-w-[280px] xs:max-w-xs sm:max-w-none sm:w-auto sm:flex-row gap-2.5 sm:gap-4">
            <Button 
              size="lg" 
              className="w-full sm:min-w-[180px] h-12 sm:h-14 text-sm xs:text-base sm:text-lg font-semibold rounded-2xl"
              onClick={() => navigate("/login?tab=signup")}
            >
              Criar Conta
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:min-w-[180px] h-12 sm:h-14 text-sm xs:text-base sm:text-lg border-foreground/20 hover:bg-foreground/5 rounded-2xl"
              onClick={() => navigate("/login?tab=login")}
            >
              Já tenho conta
            </Button>
          </div>
        </section>

        {/* Public Ratings Section */}
        <PublicRatings />
      </main>

      <Footer />
    </div>
  );
};

export default Index;

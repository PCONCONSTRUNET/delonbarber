import { Scissors, Instagram, Facebook, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-semibold tracking-wider">
                ALAN DELON
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tradição e estilo em cada corte. Sua barbearia premium para o homem moderno.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-display text-sm font-semibold tracking-wider uppercase">
              Navegação
            </h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                Home
              </Link>
              <Link to="/servicos" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                Serviços
              </Link>
              <Link to="/agendar" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                Agendar
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display text-sm font-semibold tracking-wider uppercase">
              Contato
            </h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm transition-colors">
                <MapPin className="h-4 w-4" />
                Rua da Barbearia, 123
              </a>
              <a href="tel:+5511999999999" className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm transition-colors">
                <Phone className="h-4 w-4" />
                (11) 99999-9999
              </a>
              <div className="flex items-center gap-4 pt-2">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-center text-muted-foreground text-sm">
            © 2026 Barbearia Alan Delon. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

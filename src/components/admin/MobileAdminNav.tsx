import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign,
  Crown,
  MoreHorizontal,
  Star,
  Gift,
  ExternalLink
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdminNotificationBell } from './AdminNotificationBell';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

// Custom component to render WhatsApp icon with same size as lucide icons
const WhatsAppMenuItem = ({ className }: { className?: string }) => (
  <WhatsAppIcon size={24} className={className} />
);

const mainItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/admin' },
  { icon: Calendar, label: 'Agenda', path: '/admin/agenda' },
  { icon: Users, label: 'Clientes', path: '/admin/clientes' },
  { icon: DollarSign, label: 'Finanças', path: '/admin/financeiro' },
];

const moreItems = [
  { icon: Scissors, label: 'Serviços', path: '/admin/servicos' },
  { icon: Crown, label: 'Pacotes', path: '/admin/pacotes' },
  { icon: Star, label: 'Avaliações', path: '/admin/avaliacoes' },
  { icon: Gift, label: 'Fidelidade', path: '/admin/fidelidade' },
  { icon: WhatsAppMenuItem, label: 'IA WhatsApp', path: '/admin/ia' },
];

export function MobileAdminNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Top Header for mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-4">
        <h1 className="font-display text-lg font-bold">Admin</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/cliente')}
            className="h-8 px-2 text-xs gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Cliente
          </Button>
          <AdminNotificationBell />
        </div>
      </header>

      {/* Bottom Navigation for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around h-full px-2">
          {mainItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    isActive && "bg-primary/10"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          
          {/* More Menu */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-muted-foreground">
                <div className="p-1.5 rounded-xl">
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-left font-display">Mais opções</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 pb-6">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                      isActive 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}

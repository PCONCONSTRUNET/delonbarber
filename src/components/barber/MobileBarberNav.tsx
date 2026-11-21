import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  MoreHorizontal,
  ExternalLink,
  CalendarPlus,
  LogOut,
  Scissors,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Barber } from '@/hooks/useBarbers';

const mainItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/barbeiro' },
  { icon: Calendar, label: 'Agenda', path: '/barbeiro/agenda' },
  { icon: Users, label: 'Clientes', path: '/barbeiro/clientes' },
  { icon: DollarSign, label: 'Finanças', path: '/barbeiro/financeiro' },
];

interface MobileBarberNavProps {
  barber: Barber;
}

export function MobileBarberNav({ barber }: MobileBarberNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMoreOpen(false);
    await supabase.auth.signOut();
    navigate('/barbeiro/login');
  };

  return (
    <>
      {/* Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Scissors className="h-4 w-4 text-primary shrink-0" />
          <h1 className="font-display text-base font-bold truncate">{barber.name}</h1>
        </div>
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

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="flex items-center justify-around h-full px-2">
          {mainItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/barbeiro'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-primary/10')}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More Sheet */}
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
                <NavLink
                  to="/barbeiro/agendamento-manual"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 p-4 rounded-2xl border transition-all',
                      isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted/50'
                    )
                  }
                >
                  <CalendarPlus className="h-6 w-6" />
                  <span className="font-medium text-sm">Agendamento manual</span>
                </NavLink>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="h-6 w-6" />
                  <span className="font-medium text-sm">Sair</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}

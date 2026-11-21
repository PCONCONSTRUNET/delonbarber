import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  LogOut,
  ChevronLeft,
  CalendarPlus,
  ExternalLink,
  Scissors,
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { Barber, getBarberBasePath } from '@/hooks/useBarbers';

const menuDefs = [
  { icon: LayoutDashboard, label: 'Dashboard', suffix: '' },
  { icon: Calendar, label: 'Minha Agenda', suffix: '/agenda' },
  { icon: Users, label: 'Meus Clientes', suffix: '/clientes' },
  { icon: DollarSign, label: 'Financeiro', suffix: '/financeiro' },
  { icon: CalendarPlus, label: 'Agendamento manual', suffix: '/agendamento-manual' },
];

let barberSidebarCollapsedCache = false;

interface BarberSidebarProps {
  barber: Barber;
}

export function BarberSidebar({ barber }: BarberSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = getBarberBasePath(pathname);
  const menuItems = menuDefs.map((m) => ({ ...m, path: `${basePath}${m.suffix}` }));
  const [collapsed, setCollapsedState] = useState(barberSidebarCollapsedCache);
  const setCollapsed = (value: boolean) => {
    barberSidebarCollapsedCache = value;
    setCollapsedState(value);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`${basePath}/login`);
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-sidebar-foreground flex items-center gap-1.5 truncate">
              <Scissors className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{barber.name}</span>
            </h1>
            <p className="text-[11px] text-sidebar-foreground/60">Painel do Barbeiro</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <AdminNotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.suffix === ''}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}

        <Separator className="my-3 bg-sidebar-border" />
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => navigate('/cliente')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Área do Cliente</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

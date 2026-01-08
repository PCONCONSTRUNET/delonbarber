import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign,
  MessageSquare,
  Crown,
  LogOut,
  ChevronLeft,
  CalendarPlus,
  ExternalLink
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { AdminNotificationBell } from './AdminNotificationBell';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Calendar, label: 'Agenda', path: '/admin/agenda' },
  { icon: Users, label: 'Clientes', path: '/admin/clientes' },
  { icon: Scissors, label: 'Serviços', path: '/admin/servicos' },
  { icon: Crown, label: 'Pacotes', path: '/admin/pacotes' },
  { icon: DollarSign, label: 'Financeiro', path: '/admin/financeiro' },
  { icon: MessageSquare, label: 'IA WhatsApp', path: '/admin/ia' },
];

const clientLinks = [
  { icon: CalendarPlus, label: 'Agendar', path: '/agendar' },
  { icon: Crown, label: 'Pacotes VIP', path: '/pacotes' },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <h1 className="font-display text-xl font-bold text-sidebar-foreground">
            Admin
          </h1>
        )}
        <div className="flex items-center gap-1">
          <AdminNotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              isActive 
                ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}

        {/* Separator */}
        <Separator className="my-3 bg-sidebar-border" />
        
        {/* Client Area Links */}
        {!collapsed && (
          <p className="px-3 py-1 text-xs font-medium text-sidebar-foreground/50 uppercase">
            Área do Cliente
          </p>
        )}
        {clientLinks.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent group"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors",
            "text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

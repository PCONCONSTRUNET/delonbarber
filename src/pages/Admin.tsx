import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileAdminNav } from '@/components/admin/MobileAdminNav';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { TodayAppointments } from '@/components/admin/TodayAppointments';
import { CalendarView } from '@/components/admin/CalendarView';
import { TimelineAppointments } from '@/components/admin/agenda/TimelineAppointments';
import { CompactCalendar } from '@/components/admin/agenda/CompactCalendar';
import { AgendaHeader } from '@/components/admin/agenda/AgendaHeader';
import { SqueezeInModal } from '@/components/admin/agenda/SqueezeInModal';
import { RegisterExternalCutModal } from '@/components/admin/agenda/RegisterExternalCutModal';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { ClientList } from '@/components/admin/ClientList';
import { FinancialReport } from '@/components/admin/FinancialReport';
import { ReportExport } from '@/components/admin/ReportExport';
import { WhatsAppAI } from '@/components/admin/WhatsAppAI';
import { PackageForm } from '@/components/admin/PackageForm';
import { PackageList } from '@/components/admin/PackageList';
import { ClientPackagesList } from '@/components/admin/ClientPackagesList';
import { BlockedSlotsManager } from '@/components/admin/BlockedSlotsManager';
import { CalendarSubscription } from '@/components/admin/CalendarSubscription';
import { BusinessHoursManager } from '@/components/admin/BusinessHoursManager';
import { RatingsManager } from '@/components/admin/RatingsManager';
import { LoyaltyManager } from '@/components/admin/LoyaltyManager';
import { PushNotificationSetup } from '@/components/admin/PushNotificationSetup';
import { PushToggle } from '@/components/push/PushToggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useIsAdmin, useAdminAppointments, useAdminClients, useAdminServices, useBusinessStatus } from '@/hooks/useAdmin';
import { useAdminPackages, useClientPackages } from '@/hooks/usePackages';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Pencil, Trash2, Bell, Crown, Download, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileAdminNav />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { appointments, loading, updateAppointmentStatus, updatePaymentStatus, deleteAppointment, fetchAppointments } = useAdminAppointments();
  const { isOpen, toggleStatus } = useBusinessStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminUserId(data.user?.id ?? null));
  }, []);

  // Enable real-time notifications for new appointments
  useAdminNotifications({
    enabled: isAdmin,
    onNewAppointment: () => {
      // Refresh appointments list when new one arrives
      fetchAppointments();
    }
  });

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl md:text-3xl font-bold">Dashboard</h1>
            <span title="Notificações ativas" className="hidden md:inline">
              <Bell className="h-5 w-5 text-green-500 animate-pulse" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{isOpen ? 'Aberta' : 'Fechada'}</span>
            <Switch checked={isOpen} onCheckedChange={toggleStatus} />
          </div>
        </div>
        
        {/* Push Notification Setup Cards */}
        <div className="grid gap-3 md:grid-cols-2">
          <PushNotificationSetup />
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Push (OneSignal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Notificações nativas para receber alertas mesmo com o app fechado em iOS e Android.
              </p>
              <PushToggle role="admin" userId={adminUserId} />
            </CardContent>
          </Card>
        </div>
        
        <DashboardStats appointments={appointments} />
        
        {/* Charts Section */}
        <DashboardCharts appointments={appointments} />
        
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">
              Agendamentos de {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </h2>
            {loading ? <Loader2 className="animate-spin" /> : (
              <TodayAppointments 
                appointments={appointments.filter(a => a.appointment_date === format(selectedDate, 'yyyy-MM-dd'))}
                onUpdateStatus={(id, status) => updateAppointmentStatus(id, status as any)}
                onUpdatePayment={updatePaymentStatus}
                onDelete={deleteAppointment}
              />
            )}
          </div>
          <div className="hidden lg:block">
            <CalendarView appointments={appointments} view="month" onSelectDate={setSelectedDate} selectedDate={selectedDate} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export function AdminAgenda() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { appointments, loading, updateAppointmentStatus, updatePaymentStatus, deleteAppointment, fetchAppointments } = useAdminAppointments();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('agendamentos');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [squeezeInOpen, setSqueezeInOpen] = useState(false);
  const [externalCutOpen, setExternalCutOpen] = useState(false);

  // Auto-complete appointments every 60 seconds
  useEffect(() => {
    const autoComplete = async () => {
      try {
        const { data, error } = await supabase.rpc('auto_complete_appointments');
        if (!error && data && data > 0) {
          console.log(`Auto-completed ${data} appointment(s)`);
          fetchAppointments();
        }
      } catch (e) {
        console.error('Auto-complete error:', e);
      }
    };

    // Run immediately on mount
    autoComplete();

    // Then run every 60 seconds
    const interval = setInterval(autoComplete, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch business hours
  useEffect(() => {
    async function fetchHours() {
      const { data } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });
      if (data) setBusinessHours(data);
    }
    fetchHours();
  }, []);

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);
  
  // Get business hours for the selected day (0=Sunday, 1=Monday, etc.)
  const dayOfWeek = selectedDate.getDay();
  const todayHours = businessHours.find(h => h.day_of_week === dayOfWeek);

  return (
    <AdminLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="agendamentos" className="text-xs px-2">Agenda</TabsTrigger>
            <TabsTrigger value="horarios" className="text-xs px-2">Bloquear</TabsTrigger>
            <TabsTrigger value="config" className="text-xs px-2">Horários</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            {/* Calendar button - opens sheet with full calendar */}
            <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Calendar className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
                <div className="pt-2 pb-6">
                  <h3 className="font-semibold text-center mb-4">Selecionar Data</h3>
                  <CompactCalendar
                    appointments={appointments}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            <CalendarSubscription />
          </div>
        </div>

        <TabsContent value="agendamentos" className="mt-0">
          {/* Clean iPhone-style agenda */}
          <div className="space-y-4">
            {/* Date navigation header */}
            <AgendaHeader
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              appointmentCount={dayAppointments.length}
              onSqueezeIn={() => setSqueezeInOpen(true)}
              onRegisterExternal={() => setExternalCutOpen(true)}
            />

            <SqueezeInModal
              open={squeezeInOpen}
              onOpenChange={setSqueezeInOpen}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onSuccess={fetchAppointments}
            />

            <RegisterExternalCutModal
              open={externalCutOpen}
              onOpenChange={setExternalCutOpen}
              selectedDate={format(selectedDate, 'yyyy-MM-dd')}
              onSuccess={fetchAppointments}
            />

            {/* Timeline appointments */}
            <ScrollArea className="h-[calc(100vh-280px)] md:h-[calc(100vh-240px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : (
                <TimelineAppointments
                  appointments={dayAppointments}
                  onUpdateStatus={(id, status) => updateAppointmentStatus(id, status as any)}
                  onUpdatePayment={updatePaymentStatus}
                  onDelete={deleteAppointment}
                  businessHours={todayHours}
                  selectedDate={format(selectedDate, 'yyyy-MM-dd')}
                  onRefresh={fetchAppointments}
                />
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="horarios" className="mt-0">
          <BlockedSlotsManager />
        </TabsContent>

        <TabsContent value="config" className="mt-0">
          <ScrollArea className="h-[calc(100vh-180px)] md:h-[calc(100vh-140px)]">
            <BusinessHoursManager />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

export function AdminClientes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { clients, loading, deleteClient } = useAdminClients();
  const [searchTerm, setSearchTerm] = useState('');

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  // Filter clients by search term
  const filteredClients = clients.filter(client => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (client.name || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  const exportToCSV = () => {
    if (filteredClients.length === 0) return;

    const headers = ['Nome', 'Telefone', 'Tipo', 'Agendamentos', 'Total Gasto (R$)', 'Última Visita', 'Data Cadastro'];
    
    const rows = filteredClients.map(client => [
      client.name || 'Sem nome',
      client.phone || 'Sem telefone',
      client.is_guest ? 'Formulário' : 'Conta',
      client.total_appointments.toString(),
      client.total_spent.toFixed(2).replace('.', ','),
      client.last_appointment || 'Nunca',
      new Date(client.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Clientes</h1>
        <Button onClick={exportToCSV} variant="outline" size="sm" disabled={loading || filteredClients.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Exportar</span> CSV
        </Button>
      </div>
      
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </div>
      
      {/* Results count */}
      {searchTerm && (
        <p className="text-sm text-muted-foreground mb-3">
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </p>
      )}
      
      {loading ? <Loader2 className="animate-spin" /> : <ClientList clients={filteredClients} onDeleteClient={deleteClient} />}
    </AdminLayout>
  );
}

export function AdminServicos() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { services, loading, createService, updateService, deleteService } = useAdminServices();
  const [editingService, setEditingService] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const handleSubmit = async (data: any) => {
    if (editingService) await updateService(editingService.id, data);
    else await createService(data);
    setShowForm(false);
    setEditingService(null);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Serviços</h1>
        <Button size="sm" onClick={() => { setEditingService(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Novo</span> Serviço
        </Button>
      </div>
      
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {services.map(service => (
            <div key={service.id} className={`p-3 md:p-4 rounded-2xl glass-effect relative ${!service.is_active ? 'opacity-50' : ''}`}>
              {service.subscribers_only && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-medium">
                    <Crown className="h-3 w-3" />
                    VIP
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-sm md:text-base">{service.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{service.description}</p>
              <p className="text-primary font-bold mt-2">R$ {Number(service.price).toFixed(0)}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => { setEditingService(service); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteService(service.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingService ? 'Editar' : 'Novo'} Serviço</DialogTitle>
          </DialogHeader>
          <ServiceForm service={editingService} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export function AdminFinanceiro() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { appointments, loading } = useAdminAppointments();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Financeiro</h1>
        <ReportExport appointments={appointments} />
      </div>
      {loading ? <Loader2 className="animate-spin" /> : <FinancialReport appointments={appointments} />}
    </AdminLayout>
  );
}

export function AdminIA() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-4 md:mb-6">IA WhatsApp</h1>
      <WhatsAppAI />
    </AdminLayout>
  );
}

export function AdminPacotes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { packages, loading: packagesLoading, createPackage, updatePackage, deletePackage } = useAdminPackages();
  const { subscriptions, loading: subsLoading, addSubscription, confirmSubscription, cancelSubscription, deleteSubscription, registerUsage } = useClientPackages();
  const { clients, loading: clientsLoading } = useAdminClients();
  const [showForm, setShowForm] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('pacotes');

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const handleSubmit = async (data: any) => {
    await createPackage(data);
    setShowForm(false);
  };

  const handleViewSubscribers = (packageId: string) => {
    setSelectedPackageId(packageId);
    setActiveTab('assinantes');
  };

  const activePackages = packages.filter(p => p.is_active);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">Pacotes VIP</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 h-10 md:h-11">
          <TabsTrigger value="pacotes" className="text-xs md:text-sm">Pacotes</TabsTrigger>
          <TabsTrigger value="assinantes" className="text-xs md:text-sm">Assinantes</TabsTrigger>
        </TabsList>

        <TabsContent value="pacotes">
          {packagesLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PackageList
              packages={activePackages}
              onUpdate={updatePackage}
              onDelete={deletePackage}
              onViewSubscribers={handleViewSubscribers}
            />
          )}
        </TabsContent>

        <TabsContent value="assinantes">
          {subsLoading || clientsLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ClientPackagesList
              subscriptions={subscriptions}
              packages={activePackages}
              clients={clients}
              selectedPackageId={selectedPackageId}
              onAddSubscription={addSubscription}
              onConfirmSubscription={confirmSubscription}
              onCancelSubscription={cancelSubscription}
              onDeleteSubscription={deleteSubscription}
              onRegisterUsage={registerUsage}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Novo Pacote</DialogTitle>
          </DialogHeader>
          <PackageForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

export function AdminAvaliacoes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-4 md:mb-6">Avaliações</h1>
      <RatingsManager />
    </AdminLayout>
  );
}

export function AdminFidelidade() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-4 md:mb-6">Programa de Fidelidade</h1>
      <LoyaltyManager />
    </AdminLayout>
  );
}

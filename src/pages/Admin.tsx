import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { TodayAppointments } from '@/components/admin/TodayAppointments';
import { CalendarView } from '@/components/admin/CalendarView';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { ClientList } from '@/components/admin/ClientList';
import { FinancialReport } from '@/components/admin/FinancialReport';
import { ReportExport } from '@/components/admin/ReportExport';
import { WhatsAppAI } from '@/components/admin/WhatsAppAI';
import { PackageForm } from '@/components/admin/PackageForm';
import { PackageList } from '@/components/admin/PackageList';
import { ClientPackagesList } from '@/components/admin/ClientPackagesList';
import { BlockedSlotsManager } from '@/components/admin/BlockedSlotsManager';
import { useIsAdmin, useAdminAppointments, useAdminClients, useAdminServices, useBusinessStatus } from '@/hooks/useAdmin';
import { useAdminPackages, useClientPackages } from '@/hooks/usePackages';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Pencil, Trash2, Bell, Crown, Download } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { appointments, loading, updateAppointmentStatus, updatePaymentStatus, deleteAppointment, fetchAppointments } = useAdminAppointments();
  const { isOpen, toggleStatus } = useBusinessStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <span title="Notificações ativas">
              <Bell className="h-5 w-5 text-green-500 animate-pulse" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{isOpen ? 'Aberta' : 'Fechada'}</span>
            <Switch checked={isOpen} onCheckedChange={toggleStatus} />
          </div>
        </div>
        
        <DashboardStats appointments={appointments} />
        
        {/* Charts Section */}
        <DashboardCharts appointments={appointments} />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-4">Agendamentos de Hoje</h2>
            {loading ? <Loader2 className="animate-spin" /> : (
              <TodayAppointments 
                appointments={appointments}
                onUpdateStatus={(id, status) => updateAppointmentStatus(id, status as any)}
                onUpdatePayment={updatePaymentStatus}
                onDelete={deleteAppointment}
              />
            )}
          </div>
          <CalendarView appointments={appointments} view="month" onSelectDate={setSelectedDate} selectedDate={selectedDate} />
        </div>
      </div>
    </AdminLayout>
  );
}

export function AdminAgenda() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { appointments, loading, updateAppointmentStatus, updatePaymentStatus, deleteAppointment } = useAdminAppointments();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('agendamentos');

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Agenda</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="horarios">Bloquear Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="agendamentos">
          <div className="grid lg:grid-cols-2 gap-6">
            <CalendarView appointments={appointments} view="month" onSelectDate={setSelectedDate} selectedDate={selectedDate} />
            <div>
              <h2 className="font-semibold mb-4">{selectedDate.toLocaleDateString('pt-BR', { dateStyle: 'long' })}</h2>
              {loading ? <Loader2 className="animate-spin" /> : (
                <TodayAppointments 
                  appointments={dayAppointments.length ? dayAppointments.map(a => ({ ...a, appointment_date: dateStr })) : []}
                  onUpdateStatus={(id, status) => updateAppointmentStatus(id, status as any)}
                  onUpdatePayment={updatePaymentStatus}
                  onDelete={deleteAppointment}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="horarios">
          <BlockedSlotsManager />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

export function AdminClientes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { clients, loading, deleteClient } = useAdminClients();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const exportToCSV = () => {
    if (clients.length === 0) return;

    const headers = ['Nome', 'Telefone', 'Agendamentos', 'Total Gasto (R$)', 'Última Visita', 'Data Cadastro'];
    
    const rows = clients.map(client => [
      client.name || 'Sem nome',
      client.phone || 'Sem telefone',
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Clientes</h1>
        <Button onClick={exportToCSV} variant="outline" disabled={loading || clients.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>
      {loading ? <Loader2 className="animate-spin" /> : <ClientList clients={clients} onDeleteClient={deleteClient} />}
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Serviços</h1>
        <Button onClick={() => { setEditingService(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" />Novo Serviço</Button>
      </div>
      
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <div key={service.id} className={`p-4 rounded-2xl glass-effect relative ${!service.is_active ? 'opacity-50' : ''}`}>
              {service.subscribers_only && (
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-medium">
                    <Crown className="h-3 w-3" />
                    Exclusivo
                  </span>
                </div>
              )}
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
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
        <DialogContent><DialogHeader><DialogTitle>{editingService ? 'Editar' : 'Novo'} Serviço</DialogTitle></DialogHeader>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl font-bold">Financeiro</h1>
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
      <h1 className="font-display text-3xl font-bold mb-6">IA WhatsApp</h1>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Pacotes Premium</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
          <TabsTrigger value="assinantes">Assinantes</TabsTrigger>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pacote</DialogTitle>
          </DialogHeader>
          <PackageForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

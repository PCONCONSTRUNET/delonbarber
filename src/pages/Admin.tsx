import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { TodayAppointments } from '@/components/admin/TodayAppointments';
import { CalendarView } from '@/components/admin/CalendarView';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { ClientList } from '@/components/admin/ClientList';
import { FinancialReport } from '@/components/admin/FinancialReport';
import { WhatsAppAI } from '@/components/admin/WhatsAppAI';
import { useIsAdmin, useAdminAppointments, useAdminClients, useAdminServices, useBusinessStatus } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

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
  const { appointments, loading, updateAppointmentStatus, updatePaymentStatus, deleteAppointment } = useAdminAppointments();
  const { isOpen, toggleStatus } = useBusinessStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{isOpen ? 'Aberta' : 'Fechada'}</span>
            <Switch checked={isOpen} onCheckedChange={toggleStatus} />
          </div>
        </div>
        
        <DashboardStats appointments={appointments} />
        
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

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Agenda</h1>
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
    </AdminLayout>
  );
}

export function AdminClientes() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { clients, loading } = useAdminClients();

  if (adminLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold mb-6">Clientes</h1>
      {loading ? <Loader2 className="animate-spin" /> : <ClientList clients={clients} />}
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
            <div key={service.id} className={`p-4 rounded-2xl glass-effect ${!service.is_active ? 'opacity-50' : ''}`}>
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
      <h1 className="font-display text-3xl font-bold mb-6">Financeiro</h1>
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

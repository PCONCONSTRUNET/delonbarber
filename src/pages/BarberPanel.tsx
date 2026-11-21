import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Navigate, useLocation } from 'react-router-dom';
import { BarberSidebar } from '@/components/barber/BarberSidebar';
import { MobileBarberNav } from '@/components/barber/MobileBarberNav';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { TodayAppointments } from '@/components/admin/TodayAppointments';
import { CalendarView } from '@/components/admin/CalendarView';
import { TimelineAppointments } from '@/components/admin/agenda/TimelineAppointments';
import { CompactCalendar } from '@/components/admin/agenda/CompactCalendar';
import { AgendaHeader } from '@/components/admin/agenda/AgendaHeader';
import { SqueezeInModal } from '@/components/admin/agenda/SqueezeInModal';
import { RegisterExternalCutModal } from '@/components/admin/agenda/RegisterExternalCutModal';
import { ClientList } from '@/components/admin/ClientList';
import { BarberFinancialReport } from '@/components/admin/BarberFinancialReport';
import { ManualBooking } from '@/components/admin/ManualBooking';
import { BlockedSlotsManager } from '@/components/admin/BlockedSlotsManager';
import { CalendarSubscription } from '@/components/admin/CalendarSubscription';
import { BusinessHoursManager } from '@/components/admin/BusinessHoursManager';
import { PushToggle } from '@/components/push/PushToggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAdminAppointments, useAdminClients } from '@/hooks/useAdmin';
import { useBusinessHours } from '@/hooks/useAppointments';
import { useMyBarber, Barber, getBarberBasePath } from '@/hooks/useBarbers';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, Download, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

function BarberLayout({ barber, children }: { barber: Barber; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden md:block">
        <BarberSidebar barber={barber} />
      </div>

      <MobileBarberNav barber={barber} />

      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function BarberLoginRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={`${getBarberBasePath(pathname)}/login`} replace />;
}

export function BarberDashboard() {
  const { barber, loading: barberLoading, toggleMyStatus } = useMyBarber();
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (barberLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!barber) return <BarberLoginRedirect />;

  return <BarberDashboardContent barber={barber} selectedDate={selectedDate} onSelectDate={setSelectedDate} onToggleStatus={toggleMyStatus} />;
}

function BarberDashboardContent({
  barber,
  selectedDate,
  onSelectDate,
  onToggleStatus,
}: {
  barber: Barber;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onToggleStatus: () => Promise<boolean | null>;
}) {
  const {
    appointments,
    loading,
    updateAppointmentStatus,
    updatePaymentStatus,
    deleteAppointment,
  } = useAdminAppointments(barber.id);

  return (
    <BarberLayout barber={barber}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Olá, {barber.name}
            </h1>
            {!barber.is_owner && (
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-500">
                Comissão: {barber.commission_percent}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {barber.is_open_today ? 'Cadeira Aberta' : 'Cadeira Fechada'}
            </span>
            <Switch checked={barber.is_open_today} onCheckedChange={onToggleStatus} />
          </div>
        </div>

        {/* Push Notification Setup */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações da sua Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Receba alertas quando clientes marcarem ou cancelarem horários com você.
            </p>
            <PushToggle role="barber" userId={barber.user_id} />
          </CardContent>
        </Card>

        <DashboardStats appointments={appointments} />

        <DashboardCharts appointments={appointments} />

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">
              Seus agendamentos de{' '}
              {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </h2>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <TodayAppointments
                appointments={appointments.filter(
                  (a) => a.appointment_date === format(selectedDate, 'yyyy-MM-dd')
                )}
                onUpdateStatus={(id, status) => updateAppointmentStatus(id, status as any)}
                onUpdatePayment={updatePaymentStatus}
                onDelete={deleteAppointment}
              />
            )}
          </div>
          <div className="hidden lg:block">
            <CalendarView
              appointments={appointments}
              view="month"
              onSelectDate={onSelectDate}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
    </BarberLayout>
  );
}

export function BarberAgenda() {
  const { barber, loading: barberLoading } = useMyBarber();

  if (barberLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!barber) return <BarberLoginRedirect />;

  return <BarberAgendaContent barber={barber} />;
}

function BarberAgendaContent({ barber }: { barber: Barber }) {
  const {
    appointments,
    loading,
    updateAppointmentStatus,
    updatePaymentStatus,
    deleteAppointment,
    fetchAppointments,
  } = useAdminAppointments(barber.id);
  const { businessHours, refreshBusinessHours } = useBusinessHours(barber.id);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('agendamentos');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [squeezeInOpen, setSqueezeInOpen] = useState(false);
  const [externalCutOpen, setExternalCutOpen] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayAppointments = appointments.filter((a) => a.appointment_date === dateStr);
  const dayOfWeek = selectedDate.getDay();
  const todayHours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  return (
    <BarberLayout barber={barber}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-2 mb-4">
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="agendamentos" className="text-xs px-2">Agenda</TabsTrigger>
            <TabsTrigger value="horarios" className="text-xs px-2">Bloquear</TabsTrigger>
            <TabsTrigger value="config" className="text-xs px-2">Horários</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
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

            <CalendarSubscription barberId={barber.id} />
          </div>
        </div>

        <TabsContent value="agendamentos" className="mt-0">
          <div className="space-y-4">
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
              selectedDate={dateStr}
              onSuccess={fetchAppointments}
              fixedBarberId={barber.id}
            />

            <RegisterExternalCutModal
              open={externalCutOpen}
              onOpenChange={setExternalCutOpen}
              selectedDate={dateStr}
              onSuccess={fetchAppointments}
              fixedBarberId={barber.id}
            />

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
                  selectedDate={dateStr}
                  onRefresh={fetchAppointments}
                  fixedBarberId={barber.id}
                />
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="horarios" className="mt-0">
          <BlockedSlotsManager fixedBarberId={barber.id} />
        </TabsContent>

        <TabsContent value="config" className="mt-0">
          <ScrollArea className="h-[calc(100vh-180px)] md:h-[calc(100vh-140px)]">
            <BusinessHoursManager fixedBarberId={barber.id} onSaved={refreshBusinessHours} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </BarberLayout>
  );
}

export function BarberClientes() {
  const { barber, loading: barberLoading } = useMyBarber();

  if (barberLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!barber) return <BarberLoginRedirect />;

  return <BarberClientesContent barber={barber} />;
}

function BarberClientesContent({ barber }: { barber: Barber }) {
  const { clients, loading } = useAdminClients(barber.id);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter((client) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (client.name || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  const exportToCSV = () => {
    if (filteredClients.length === 0) return;
    const headers = ['Nome', 'Telefone', 'Tipo', 'Agendamentos', 'Total Gasto (R$)', 'Última Visita'];
    const rows = filteredClients.map((client) => [
      client.name || 'Sem nome',
      client.phone || 'Sem telefone',
      client.is_guest ? 'Formulário' : 'Conta',
      client.total_appointments.toString(),
      client.total_spent.toFixed(2).replace('.', ','),
      client.last_appointment || 'Nunca',
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meus_clientes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <BarberLayout barber={barber}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Meus Clientes</h1>
          <p className="text-xs text-muted-foreground">Clientes que agendaram ou assinam com você</p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          size="sm"
          disabled={loading || filteredClients.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Exportar</span> CSV
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {loading ? <Loader2 className="animate-spin" /> : <ClientList clients={filteredClients} />}
    </BarberLayout>
  );
}

export function BarberFinanceiro() {
  const { barber, loading: barberLoading } = useMyBarber();

  if (barberLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!barber) return <BarberLoginRedirect />;

  return <BarberFinanceiroContent barber={barber} />;
}

function BarberFinanceiroContent({ barber }: { barber: Barber }) {
  const { appointments, loading } = useAdminAppointments(barber.id);

  return (
    <BarberLayout barber={barber}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Meu Financeiro</h1>
          <p className="text-xs text-muted-foreground">
            Seus cortes e cálculo automático da sua comissão ({barber.commission_percent}%)
          </p>
        </div>
      </div>

      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <BarberFinancialReport appointments={appointments} fixedBarber={barber} />
      )}
    </BarberLayout>
  );
}

export function BarberManualBooking() {
  const { barber, loading: barberLoading } = useMyBarber();

  if (barberLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (!barber) return <BarberLoginRedirect />;

  return (
    <BarberLayout barber={barber}>
      <h1 className="font-display text-2xl md:text-3xl font-bold mb-4 md:mb-6">
        Agendamento Manual
      </h1>
      <ManualBooking fixedBarberId={barber.id} />
    </BarberLayout>
  );
}

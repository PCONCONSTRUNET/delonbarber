import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentHistory } from '@/components/agendar/AppointmentHistory';
import { supabase } from '@/integrations/supabase/client';
import { useAuthReady } from '@/hooks/useAuthReady';
import { toast } from 'sonner';
import { notifyAdmin } from '@/lib/oneSignalPush';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Historico() {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && !user) navigate('/login', { replace: true });
  }, [isReady, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        setLoading(false);
        return;
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Fetch all appointment services in a single query
      const appointmentIds = appointmentsData.map(a => a.id);
      const { data: allServicesData } = await supabase
        .from('appointment_services')
        .select('appointment_id, service_id, price_at_booking, services(*)')
        .in('appointment_id', appointmentIds);

      // Group services by appointment_id
      const servicesByAppointment: Record<string, any[]> = {};
      (allServicesData || []).forEach((s: any) => {
        if (!servicesByAppointment[s.appointment_id]) {
          servicesByAppointment[s.appointment_id] = [];
        }
        servicesByAppointment[s.appointment_id].push(s.services);
      });

      const appointmentsWithServices = appointmentsData.map(apt => ({
        ...apt,
        services: servicesByAppointment[apt.id] || []
      }));

      setAppointments(appointmentsWithServices);
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const handleCancelAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) {
      toast.error("Não foi possível cancelar o agendamento.");
      return;
    }

    await supabase
      .from('blocked_slots')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('is_manual', false);

    const cancelled = appointments.find(a => a.id === appointmentId);
    if (cancelled) {
      const dateStr = format(new Date(cancelled.appointment_date + 'T00:00:00'), 'dd/MM', { locale: ptBR });
      notifyAdmin(
        '❌ Agendamento Cancelado',
        `Cliente cancelou o agendamento de ${dateStr} às ${cancelled.appointment_time.slice(0, 5)}`,
        '/admin/agenda'
      );
    }

    toast.success("Agendamento cancelado e horário liberado!");
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled' } : a));
  };

  if (!isReady || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  // Separate upcoming and past appointments
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of day for comparison
  const nowStr = format(now, 'yyyy-MM-dd');
  
  const upcomingAppointments = appointments.filter(a => 
    a.appointment_date >= nowStr && ['pending', 'confirmed'].includes(a.status)
  ).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time));
  
  const pastAppointments = appointments.filter(a => 
    !(a.appointment_date >= nowStr && ['pending', 'confirmed'].includes(a.status))
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <main className="pt-16 pb-20 px-4 max-w-lg mx-auto safe-area-top safe-area-bottom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cliente')}
            className="rounded-full shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Meu <span className="text-gradient">Histórico</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe seus agendamentos
            </p>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {appointments.length === 0 ? (
            <div className="text-center py-16 bg-card/50 rounded-3xl border border-border/50">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum agendamento
              </h3>
              <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                Você ainda não tem histórico de serviços conosco.
              </p>
              <Button 
                onClick={() => navigate('/agendar')}
                className="mt-6 rounded-full"
              >
                Agendar Horário
              </Button>
            </div>
          ) : (
            <>
              {/* Upcoming */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Próximos Horários
                  </h2>
                  <AppointmentHistory 
                    appointments={upcomingAppointments} 
                    onCancel={handleCancelAppointment} 
                  />
                </div>
              )}

              {/* Past */}
              {pastAppointments.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico Anteriores
                  </h2>
                  <AppointmentHistory 
                    appointments={pastAppointments} 
                    onCancel={handleCancelAppointment} 
                  />
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

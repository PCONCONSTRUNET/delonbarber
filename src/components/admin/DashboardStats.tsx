import { Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';

interface DashboardStatsProps {
  appointments: AdminAppointment[];
}

export function DashboardStats({ appointments }: DashboardStatsProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const todayAppointments = appointments.filter(a => a.appointment_date === today);
  const pendingPayments = appointments.filter(a => a.payment_status === 'pending' && a.status === 'completed');
  const totalRevenue = appointments
    .filter(a => a.payment_status === 'paid' && a.status !== 'no_show')
    .reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  
  const uniqueClients = new Set(appointments.map(a => a.user_id)).size;

  const stats = [
    {
      icon: Calendar,
      label: 'Agendamentos Hoje',
      value: todayAppointments.length,
      color: 'text-primary'
    },
    {
      icon: Clock,
      label: 'Pagamentos Pendentes',
      value: pendingPayments.length,
      color: 'text-yellow-500'
    },
    {
      icon: DollarSign,
      label: 'Faturamento Total',
      value: `R$ ${totalRevenue.toFixed(0)}`,
      color: 'text-green-500'
    },
    {
      icon: Users,
      label: 'Total de Clientes',
      value: uniqueClients,
      color: 'text-accent'
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

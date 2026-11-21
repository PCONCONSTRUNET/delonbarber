import { Calendar, DollarSign, Users, Clock, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';

interface DashboardStatsProps {
  appointments: AdminAppointment[];
  /** Quando informado no painel de barbeiro comissionado, exibe o card de comissão logo no Dashboard */
  commissionPercent?: number;
}

export function DashboardStats({ appointments, commissionPercent }: DashboardStatsProps) {
  const today = new Date().toISOString().split('T')[0];

  const todayAppointments = appointments.filter(a => a.appointment_date === today);
  const pendingPayments = appointments.filter(a => a.payment_status === 'pending' && a.status === 'completed');
  const paidAppointments = appointments.filter(
    a => a.payment_status === 'paid' && a.status !== 'no_show' && a.status !== 'cancelled' && a.payment_method !== 'subscriber'
  );
  const totalRevenue = paidAppointments.reduce((sum, a) => sum + Number(a.total_price || 0), 0);

  const paidCommission =
    commissionPercent != null
      ? paidAppointments.reduce((sum, a) => {
          const rate = a.commission_percent_at_booking != null ? Number(a.commission_percent_at_booking) : commissionPercent;
          return sum + (Number(a.total_price || 0) * rate) / 100;
        }, 0)
      : 0;

  const forecastCommission =
    commissionPercent != null
      ? appointments
          .filter(
            a =>
              a.payment_status !== 'paid' &&
              a.status !== 'no_show' &&
              a.status !== 'cancelled' &&
              a.payment_method !== 'subscriber'
          )
          .reduce((sum, a) => {
            const rate = a.commission_percent_at_booking != null ? Number(a.commission_percent_at_booking) : commissionPercent;
            return sum + (Number(a.total_price || 0) * rate) / 100;
          }, 0)
      : 0;

  const uniqueClients = new Set(appointments.map(a => a.user_id)).size;

  const stats = [
    {
      icon: Calendar,
      label: 'Agendamentos Hoje',
      value: todayAppointments.length,
      sub: undefined as string | undefined,
      color: 'text-primary'
    },
    {
      icon: Clock,
      label: 'Pagamentos Pendentes',
      value: pendingPayments.length,
      sub: undefined as string | undefined,
      color: 'text-yellow-500'
    },
    commissionPercent != null
      ? {
          icon: Wallet,
          label: `Sua Comissão (${commissionPercent}%)`,
          value: `R$ ${paidCommission.toFixed(2)}`,
          sub: forecastCommission > 0
            ? `Prev. agendados: +R$ ${forecastCommission.toFixed(2)}`
            : `Bruto: R$ ${totalRevenue.toFixed(0)}`,
          color: 'text-amber-500'
        }
      : {
          icon: DollarSign,
          label: 'Faturamento Total',
          value: `R$ ${totalRevenue.toFixed(0)}`,
          sub: undefined as string | undefined,
          color: 'text-green-500'
        },
    {
      icon: Users,
      label: 'Total de Clientes',
      value: uniqueClients,
      sub: undefined as string | undefined,
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
          {stat.sub && (
            <p className="text-[11px] text-amber-500/90 mt-0.5">{stat.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

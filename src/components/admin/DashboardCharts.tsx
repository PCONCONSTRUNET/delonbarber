import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, Scissors, Clock, DollarSign } from 'lucide-react';
import { AdminAppointment } from '@/hooks/useAdmin';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardChartsProps {
  appointments: AdminAppointment[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function DashboardCharts({ appointments }: DashboardChartsProps) {
  // Monthly revenue data (last 6 months simulation using current month data)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const paidAppointments = appointments.filter(a => a.payment_status === 'paid');
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const revenue = paidAppointments
        .filter(a => a.appointment_date === dayStr)
        .reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      return {
        date: format(day, 'dd', { locale: ptBR }),
        revenue,
      };
    }).filter((_, i) => i <= now.getDate()); // Only show days up to today
  }, [appointments]);

  // Most popular services
  const popularServices = useMemo(() => {
    const serviceCount: Record<string, { name: string; count: number; revenue: number }> = {};
    
    appointments.forEach(apt => {
      apt.services.forEach(service => {
        if (!serviceCount[service.id]) {
          serviceCount[service.id] = { name: service.name, count: 0, revenue: 0 };
        }
        serviceCount[service.id].count += 1;
        serviceCount[service.id].revenue += Number(service.price || 0);
      });
    });
    
    return Object.values(serviceCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  // Peak hours analysis
  const peakHours = useMemo(() => {
    const hourCount: Record<string, number> = {};
    
    appointments.forEach(apt => {
      const hour = apt.appointment_time.slice(0, 2) + ':00';
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
    
    return Object.entries(hourCount)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [appointments]);

  // Weekly comparison
  const weeklyData = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);
      const paidRevenue = dayAppointments
        .filter(a => a.payment_status === 'paid')
        .reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      
      return {
        day: format(date, 'EEE', { locale: ptBR }),
        agendamentos: dayAppointments.length,
        faturamento: paidRevenue,
      };
    });
    
    return last7Days;
  }, [appointments]);

  const totalMonthRevenue = monthlyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalAppointments = appointments.length;

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl glass-effect"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Faturamento do Mês</h3>
            </div>
            <span className="text-2xl font-bold text-green-500">R$ {totalMonthRevenue.toFixed(0)}</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(0)}`, 'Faturamento']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Popular Services Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Serviços Mais Populares</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularServices}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={3}
                  >
                    {popularServices.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {popularServices.map((service, index) => (
                <div key={service.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate max-w-24">{service.name}</span>
                  </div>
                  <span className="font-medium">{service.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Peak Hours Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">Horários de Pico</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, 'Agendamentos']}
                />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Últimos 7 Dias</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'faturamento') return [`R$ ${value}`, 'Faturamento'];
                    return [value, 'Agendamentos'];
                  }}
                />
                <Bar dataKey="agendamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="agendamentos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

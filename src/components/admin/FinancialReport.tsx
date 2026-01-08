import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialReportProps {
  appointments: AdminAppointment[];
}

export function FinancialReport({ appointments }: FinancialReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const monthAppointments = appointments.filter(a => {
    const date = new Date(a.appointment_date);
    return date >= monthStart && date <= monthEnd;
  });

  const paidAppointments = monthAppointments.filter(a => a.payment_status === 'paid');
  const pendingAppointments = monthAppointments.filter(a => a.payment_status === 'pending' && a.status === 'completed');

  const totalRevenue = paidAppointments.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const pendingRevenue = pendingAppointments.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const completedCount = monthAppointments.filter(a => a.status === 'completed').length;

  // Daily breakdown
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dailyRevenue = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayPaid = paidAppointments
      .filter(a => a.appointment_date === dayStr)
      .reduce((sum, a) => sum + Number(a.total_price || 0), 0);
    return { date: day, revenue: dayPaid };
  });

  const generateReceipt = (apt: AdminAppointment) => {
    const receipt = `
═══════════════════════════════
     BARBEARIA ALAN DELON
        RECIBO DE PAGAMENTO
═══════════════════════════════

Data: ${format(new Date(apt.appointment_date), "dd/MM/yyyy")}
Hora: ${apt.appointment_time.slice(0, 5)}

Cliente: ${apt.profile?.name || 'N/A'}

Serviços:
${apt.services.map(s => `  • ${s.name} - R$ ${Number(s.price).toFixed(2)}`).join('\n')}

───────────────────────────────
TOTAL: R$ ${Number(apt.total_price).toFixed(2)}
───────────────────────────────

Pagamento: ${apt.payment_method || 'N/A'}
Status: PAGO

═══════════════════════════════
    Obrigado pela preferência!
═══════════════════════════════
    `.trim();

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${apt.id.slice(0, 8)}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
        >
          Mês Anterior
        </Button>
        <h2 className="font-display text-xl font-semibold capitalize">
          {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Faturado</span>
          </div>
          <p className="text-2xl font-bold text-green-500">R$ {totalRevenue.toFixed(0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">R$ {pendingRevenue.toFixed(0)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Atendimentos</span>
          </div>
          <p className="text-2xl font-bold">{completedCount}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-2xl glass-effect"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-2xl font-bold">
            R$ {completedCount > 0 ? (totalRevenue / completedCount).toFixed(0) : 0}
          </p>
        </motion.div>
      </div>

      {/* Paid appointments list */}
      <div className="rounded-2xl glass-effect p-4">
        <h3 className="font-semibold mb-4">Pagamentos Recebidos</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {paidAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum pagamento neste mês
            </p>
          ) : (
            paidAppointments.map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{apt.profile?.name || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.appointment_date), 'dd/MM')} - {apt.services.map(s => s.name).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-500">R$ {Number(apt.total_price).toFixed(0)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => generateReceipt(apt)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

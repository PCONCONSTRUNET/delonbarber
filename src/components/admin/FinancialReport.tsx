import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, QrCode, CreditCard, Banknote, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PixQRCode } from '@/components/payments/PixQRCode';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialReportProps {
  appointments: AdminAppointment[];
}

const paymentMethodIcons: Record<string, typeof QrCode> = {
  pix: QrCode,
  credit: CreditCard,
  debit: CreditCard,
  cash: Banknote,
  card: CreditCard,
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  card: 'Cartão',
};

const paymentMethodColors: Record<string, string> = {
  pix: 'text-cyan-500 bg-cyan-500/20',
  credit: 'text-purple-500 bg-purple-500/20',
  debit: 'text-blue-500 bg-blue-500/20',
  cash: 'text-green-500 bg-green-500/20',
  card: 'text-purple-500 bg-purple-500/20',
};

export function FinancialReport({ appointments }: FinancialReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [pixModal, setPixModal] = useState<{ open: boolean; appointment: AdminAppointment | null }>({
    open: false,
    appointment: null,
  });

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

  // Payment method breakdown with count
  const paymentBreakdown = paidAppointments.reduce((acc, apt) => {
    const method = apt.payment_method || 'other';
    if (!acc[method]) {
      acc[method] = { amount: 0, count: 0 };
    }
    acc[method].amount += Number(apt.total_price || 0);
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  // Group paid appointments by payment method
  const appointmentsByMethod = paidAppointments.reduce((acc, apt) => {
    const method = apt.payment_method || 'other';
    if (!acc[method]) {
      acc[method] = [];
    }
    acc[method].push(apt);
    return acc;
  }, {} as Record<string, AdminAppointment[]>);
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

Pagamento: ${apt.payment_method ? paymentMethodLabels[apt.payment_method] : 'N/A'}
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

      {/* Payment Methods Breakdown Cards */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['pix', 'cash', 'card'].map((method) => {
            const data = paymentBreakdown[method];
            if (!data) return null;
            
            const Icon = paymentMethodIcons[method] || DollarSign;
            const colorClasses = paymentMethodColors[method] || 'text-gray-500 bg-gray-500/20';
            const [textColor, bgColor] = colorClasses.split(' ');
            
            return (
              <motion.div
                key={method}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl glass-effect p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                      <Icon className={`h-5 w-5 ${textColor}`} />
                    </div>
                    <h4 className="font-semibold">{paymentMethodLabels[method]}</h4>
                  </div>
                  <Badge variant="secondary">{data.count} pedido(s)</Badge>
                </div>
                <p className={`text-2xl font-bold ${textColor}`}>
                  R$ {data.amount.toFixed(0)}
                </p>
                
                {/* List appointments for this method */}
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {appointmentsByMethod[method]?.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">{apt.profile?.name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(apt.appointment_date), 'dd/MM')} • {apt.appointment_time.slice(0, 5)}
                        </p>
                      </div>
                      <span className="font-semibold">R$ {Number(apt.total_price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pending payments with PIX */}
      {pendingAppointments.length > 0 && (
        <div className="rounded-2xl glass-effect p-4 border-2 border-yellow-500/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            Pagamentos Pendentes
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pendingAppointments.map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                <div>
                  <p className="font-medium">{apt.profile?.name || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.appointment_date), 'dd/MM')} - {apt.services.map(s => s.name).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-yellow-500">R$ {Number(apt.total_price).toFixed(0)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setPixModal({ open: true, appointment: apt })}
                  >
                    <QrCode className="h-4 w-4" />
                    PIX
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid appointments list */}
      <div className="rounded-2xl glass-effect p-4">
        <h3 className="font-semibold mb-4">Pagamentos Recebidos</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {paidAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum pagamento neste mês
            </p>
          ) : (
            paidAppointments.map(apt => {
              const PaymentIcon = apt.payment_method ? paymentMethodIcons[apt.payment_method] : DollarSign;
              return (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <PaymentIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{apt.profile?.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointment_date), 'dd/MM')} - {apt.services.map(s => s.name).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="font-bold text-green-500">R$ {Number(apt.total_price).toFixed(0)}</span>
                      {apt.payment_method && (
                        <p className="text-xs text-muted-foreground">
                          {paymentMethodLabels[apt.payment_method]}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => generateReceipt(apt)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PIX Modal */}
      <Dialog open={pixModal.open} onOpenChange={(open) => setPixModal({ open, appointment: open ? pixModal.appointment : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar PIX para Pagamento</DialogTitle>
          </DialogHeader>
          {pixModal.appointment && (
            <PixQRCode
              amount={Number(pixModal.appointment.total_price)}
              transactionId={pixModal.appointment.id}
              clientName={pixModal.appointment.profile?.name || undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

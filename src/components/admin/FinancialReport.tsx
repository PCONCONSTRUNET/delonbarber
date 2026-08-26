import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Download, QrCode, CreditCard, Banknote, CalendarDays, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { PixQRCode } from '@/components/payments/PixQRCode';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';

type FilterType = 'today' | 'weekly' | 'monthly' | 'custom';

interface FinancialReportProps {
  appointments: AdminAppointment[];
}

const paymentMethodIcons: Record<string, typeof QrCode> = {
  pix: QrCode,
  credit: CreditCard,
  debit: CreditCard,
  cash: Banknote,
  card: CreditCard,
  subscriber: Crown,
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  card: 'Cartão',
  subscriber: 'VIP',
};

const paymentMethodColors: Record<string, string> = {
  pix: 'text-cyan-500 bg-cyan-500/20',
  credit: 'text-purple-500 bg-purple-500/20',
  debit: 'text-blue-500 bg-blue-500/20',
  cash: 'text-green-500 bg-green-500/20',
  card: 'text-purple-500 bg-purple-500/20',
  subscriber: 'text-yellow-500 bg-yellow-500/20',
};

const filterLabels: Record<FilterType, string> = {
  today: 'Hoje',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Data',
};

export function FinancialReport({ appointments }: FinancialReportProps) {
  const [filter, setFilter] = useState<FilterType>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pixModal, setPixModal] = useState<{ open: boolean; appointment: AdminAppointment | null }>({
    open: false,
    appointment: null,
  });

  const now = new Date();

  const getDateRange = (): { start: Date; end: Date } => {
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        if (customDateRange?.from) {
          return { 
            start: startOfDay(customDateRange.from), 
            end: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from) 
          };
        }
        return { start: startOfDay(now), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const { start: periodStart, end: periodEnd } = getDateRange();

  const filteredAppointments = appointments.filter(a => {
    try {
      const dateStr = a.appointment_date;
      if (!dateStr) return false;
      // Use string comparison to avoid all timezone issues
      const { start, end } = getDateRange();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      return dateStr >= startStr && dateStr <= endStr;
    } catch {
      return false;
    }
  });

  const sortByDateDesc = (a: AdminAppointment, b: AdminAppointment) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time || '00:00:00'}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time || '00:00:00'}`);
    return dateB.getTime() - dateA.getTime();
  };

  const paidAppointments = filteredAppointments
    .filter(a => a.payment_status === 'paid' && a.status !== 'no_show')
    .sort(sortByDateDesc);
    
  const pendingAppointments = filteredAppointments
    .filter(a => a.payment_status === 'pending' && (a.status === 'completed' || a.status === 'confirmed'))
    .sort(sortByDateDesc);

  const totalRevenue = paidAppointments.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const pendingRevenue = pendingAppointments.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const completedCount = filteredAppointments.filter(a => a.status === 'completed').length;

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

  const getPeriodLabel = () => {
    switch (filter) {
      case 'today':
        return format(now, "dd 'de' MMMM", { locale: ptBR });
      case 'weekly':
        return `${format(periodStart, 'dd/MM')} - ${format(periodEnd, 'dd/MM')}`;
      case 'monthly':
        return format(now, 'MMMM yyyy', { locale: ptBR });
      case 'custom':
        if (customDateRange?.from) {
          if (customDateRange.to) {
            return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`;
          }
          return format(customDateRange.from, "dd 'de' MMMM", { locale: ptBR });
        }
        return 'Data Personalizada';
    }
  };

  const handleSelectDateRange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from) {
      setFilter('custom');
    }
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  const generateReceipt = (apt: AdminAppointment) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150] // Formato de cupom não fiscal (80mm)
    });

    let y = 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BARBEARIA ALAN DELON", 40, y, { align: "center" });
    
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RECIBO DE PAGAMENTO", 40, y, { align: "center" });
    
    y += 10;
    doc.setFontSize(9);
    doc.text(`Data: ${format(parseISO(apt.appointment_date + 'T12:00:00'), "dd/MM/yyyy")}`, 5, y);
    doc.text(`Hora: ${apt.appointment_time.slice(0, 5)}`, 45, y);
    
    y += 8;
    doc.text(`Cliente: ${apt.guest_name || apt.profile?.name || 'N/A'}`, 5, y);
    
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Serviços:", 5, y);
    doc.setFont("helvetica", "normal");
    
    y += 6;
    apt.services.forEach(s => {
      doc.text(`• ${s.name}`, 5, y);
      doc.text(`R$ ${Number(s.price).toFixed(2)}`, 75, y, { align: "right" });
      y += 6;
    });
    
    y += 4;
    doc.line(5, y, 75, y);
    
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`R$ ${Number(apt.total_price).toFixed(2)}`, 75, y, { align: "right" });
    
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Pagamento: ${apt.payment_method ? paymentMethodLabels[apt.payment_method] : 'N/A'}`, 5, y);
    
    y += 6;
    doc.text("Status: PAGO", 5, y);
    
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Obrigado pela preferência!", 40, y, { align: "center" });

    doc.save(`recibo-${apt.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filter selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['today', 'weekly', 'monthly'] as FilterType[]).map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              onClick={() => setFilter(type)}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              {filterLabels[type]}
            </Button>
          ))}
          
          {/* Custom Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 sm:flex-none gap-1"
              >
                <CalendarDays className="h-4 w-4" />
                {filter === 'custom' && customDateRange?.from
                  ? customDateRange.to 
                    ? `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`
                    : format(customDateRange.from, 'dd/MM')
                  : 'Data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
              <CalendarComponent
                mode="range"
                selected={customDateRange}
                onSelect={handleSelectDateRange}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <h2 className="font-display text-lg sm:text-xl font-semibold capitalize text-muted-foreground">
          {getPeriodLabel()}
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
            <CalendarIcon className="h-5 w-5 text-primary" />
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
          {Object.keys(paymentBreakdown).map((method) => {
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
                    <h4 className="font-semibold">{paymentMethodLabels[method] || 'Outros'}</h4>
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
                        <p className="font-medium">{apt.guest_name || apt.profile?.name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(apt.appointment_date + 'T12:00:00'), 'dd/MM')} • {apt.appointment_time.slice(0, 5)}
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
                  <p className="font-medium">{apt.guest_name || apt.profile?.name || 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(apt.appointment_date + 'T12:00:00'), 'dd/MM')} - {apt.services.map(s => s.name).join(', ')}
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
              const PaymentIcon = (apt.payment_method && paymentMethodIcons[apt.payment_method]) || DollarSign;
              return (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <PaymentIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">{apt.guest_name || apt.profile?.name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(apt.appointment_date + 'T12:00:00'), 'dd/MM')} - {apt.services.map(s => s.name).join(', ')}
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
        <DialogContent className="sm:max-w-md flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Gerar PIX para Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {pixModal.appointment && (
              <PixQRCode
                amount={Number(pixModal.appointment.total_price)}
                transactionId={pixModal.appointment.id}
                clientName={pixModal.appointment.guest_name || pixModal.appointment.profile?.name || undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

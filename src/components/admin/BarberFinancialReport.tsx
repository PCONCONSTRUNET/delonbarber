import { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  Scissors,
  CalendarDays,
  Crown,
  QrCode,
  CreditCard,
  Banknote,
  Download,
  TrendingUp,
  Check,
  Wallet,
} from 'lucide-react';
import { AdminAppointment } from '@/hooks/useAdmin';
import { Barber, useAdminBarbers } from '@/hooks/useBarbers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'today' | 'weekly' | 'monthly' | 'custom';

interface BarberFinancialReportProps {
  appointments: AdminAppointment[];
  /** Se fornecido (painel exclusivo do barbeiro), fixa o relatório neste barbeiro sem seletor ou edição de comissão. */
  fixedBarber?: Barber;
}

const filterLabels: Record<FilterType, string> = {
  today: 'Hoje',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Data',
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  card: 'Cartão',
  subscriber: 'VIP',
};

const paymentMethodIcons: Record<string, typeof QrCode> = {
  pix: QrCode,
  credit: CreditCard,
  debit: CreditCard,
  cash: Banknote,
  card: CreditCard,
  subscriber: Crown,
};

export function BarberFinancialReport({ appointments, fixedBarber }: BarberFinancialReportProps) {
  const isAdminView = !fixedBarber;
  const { barbers: allBarbers, updateBarber } = useAdminBarbers();
  const barbersList = useMemo(
    () => (fixedBarber ? [fixedBarber] : allBarbers),
    [fixedBarber, allBarbers]
  );

  const [selectedBarberId, setSelectedBarberId] = useState<string>(fixedBarber?.id || '');
  const [filter, setFilter] = useState<FilterType>('monthly');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Quick commission edit state (admin only)
  const [editingCommission, setEditingCommission] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [includePending, setIncludePending] = useState(false);

  // Auto-select first commissioned barber (or first barber) on admin load
  useEffect(() => {
    if (fixedBarber) {
      setSelectedBarberId(fixedBarber.id);
      return;
    }
    if (!selectedBarberId && barbersList.length > 0) {
      const commissioned = barbersList.find((b) => !b.is_owner && b.is_active);
      setSelectedBarberId((commissioned || barbersList[0]).id);
    }
  }, [barbersList, fixedBarber, selectedBarberId]);

  const activeBarber = useMemo(
    () => barbersList.find((b) => b.id === selectedBarberId) || fixedBarber || barbersList[0] || null,
    [barbersList, selectedBarberId, fixedBarber]
  );

  useEffect(() => {
    if (activeBarber) {
      setEditingCommission(String(activeBarber.commission_percent ?? 50));
    }
  }, [activeBarber?.id, activeBarber?.commission_percent]);

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
            end: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from),
          };
        }
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start: periodStart, end: periodEnd } = getDateRange();
  const startStr = format(periodStart, 'yyyy-MM-dd');
  const endStr = format(periodEnd, 'yyyy-MM-dd');

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
          return customDateRange.to
            ? `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`
            : format(customDateRange.from, "dd 'de' MMMM", { locale: ptBR });
        }
        return 'Data Personalizada';
    }
  };

  const handleSelectDateRange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from) setFilter('custom');
    if (range?.from && range?.to) setCalendarOpen(false);
  };

  const getAptCommissionRate = (apt: AdminAppointment, barber: Barber) => {
    if (apt.commission_percent_at_booking != null) {
      return Number(apt.commission_percent_at_booking);
    }
    return barber.is_owner ? 100 : Number(barber.commission_percent ?? 50);
  };

  // Resumo rápido de todos os barbeiros no período (somente no modo Admin)
  const barberSummaries = useMemo(() => {
    return barbersList.map((b) => {
      const bAppts = appointments.filter(
        (a) =>
          a.barber_id === b.id &&
          a.appointment_date >= startStr &&
          a.appointment_date <= endStr
      );
      const paid = bAppts.filter(
        (a) => a.payment_status === 'paid' && a.status !== 'no_show' && a.status !== 'cancelled' && a.payment_method !== 'subscriber'
      );
      const gross = paid.reduce((s, a) => s + Number(a.total_price || 0), 0);
      const rate = b.is_owner ? 100 : Number(b.commission_percent ?? 50);
      const commissionAmount = paid.reduce(
        (s, a) => s + (Number(a.total_price || 0) * getAptCommissionRate(a, b)) / 100,
        0
      );
      const completed = bAppts.filter((a) => a.status === 'completed').length;
      const vipCount = bAppts.filter(
        (a) => a.payment_method === 'subscriber' && a.status !== 'cancelled' && a.status !== 'no_show'
      ).length;
      return {
        barber: b,
        gross,
        rate,
        commissionAmount,
        shopShare: gross - commissionAmount,
        completed,
        vipCount,
      };
    });
  }, [barbersList, appointments, startStr, endStr]);

  // Dados detalhados do barbeiro selecionado
  const barberAppointments = useMemo(() => {
    if (!activeBarber) return [];
    return appointments
      .filter(
        (a) =>
          a.barber_id === activeBarber.id &&
          a.appointment_date >= startStr &&
          a.appointment_date <= endStr
      )
      .sort((a, b) => {
        const dtA = `${a.appointment_date}T${a.appointment_time || '00:00:00'}`;
        const dtB = `${b.appointment_date}T${b.appointment_time || '00:00:00'}`;
        return dtB.localeCompare(dtA);
      });
  }, [appointments, activeBarber, startStr, endStr]);

  const paidCuts = barberAppointments.filter(
    (a) => a.payment_status === 'paid' && a.status !== 'no_show' && a.status !== 'cancelled' && a.payment_method !== 'subscriber'
  );
  const pendingCuts = barberAppointments.filter(
    (a) => a.payment_status !== 'paid' && a.status !== 'cancelled' && a.status !== 'no_show' && a.payment_method !== 'subscriber'
  );
  const vipCuts = barberAppointments.filter(
    (a) => a.payment_method === 'subscriber' && a.status !== 'cancelled' && a.status !== 'no_show'
  );

  const commissionRate = activeBarber
    ? activeBarber.is_owner
      ? 100
      : Number(activeBarber.commission_percent ?? 50)
    : 0;

  const totalGross = paidCuts.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const totalCommission = activeBarber
    ? paidCuts.reduce(
        (sum, a) => sum + (Number(a.total_price || 0) * getAptCommissionRate(a, activeBarber)) / 100,
        0
      )
    : 0;
  const pendingAmount = pendingCuts.reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const pendingCommission = activeBarber
    ? pendingCuts.reduce(
        (sum, a) => sum + (Number(a.total_price || 0) * getAptCommissionRate(a, activeBarber)) / 100,
        0
      )
    : 0;
  const displayedCommission = includePending ? totalCommission + pendingCommission : totalCommission;
  const shopShare = totalGross - totalCommission;
  const completedCount = barberAppointments.filter((a) => a.status === 'completed').length;

  const paymentBreakdown = paidCuts.reduce((acc, apt) => {
    const method = apt.payment_method || 'other';
    if (!acc[method]) acc[method] = { amount: 0, commission: 0, count: 0 };
    const price = Number(apt.total_price || 0);
    const rate = activeBarber ? getAptCommissionRate(apt, activeBarber) : commissionRate;
    acc[method].amount += price;
    acc[method].commission += (price * rate) / 100;
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; commission: number; count: number }>);

  const handleSaveCommission = async () => {
    if (!activeBarber || activeBarber.is_owner) return;
    const val = Number(editingCommission);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Informe uma porcentagem entre 0 e 100%');
      return;
    }
    setSavingCommission(true);
    await updateBarber(activeBarber.id, { commission_percent: val });
    setSavingCommission(false);
  };

  const exportBarberPDF = () => {
    if (!activeBarber) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Financeiro & Comissão — ${activeBarber.name}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${getPeriodLabel()}`, 14, 28);
    doc.text(`Comissão atual: ${commissionRate}% (cada corte preserva o % da data)`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [['Indicador', 'Valor']],
      body: [
        ['Faturamento Bruto (Pagos)', `R$ ${totalGross.toFixed(2)}`],
        ['Comissão Total no Período', `R$ ${totalCommission.toFixed(2)}`],
        ['Parte da Barbearia', `R$ ${shopShare.toFixed(2)}`],
        ['Pagamentos Pendentes', `R$ ${pendingAmount.toFixed(2)}`],
        ['Cortes Concluídos', String(completedCount)],
        ['Atendimentos VIP', String(vipCuts.length)],
      ],
      theme: 'striped',
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Data', 'Hora', 'Cliente', 'Serviços', 'Pag.', 'Bruto', '%', 'Comissão']],
      body: [...paidCuts, ...vipCuts].map((apt) => {
        const price = Number(apt.total_price || 0);
        const cutRate = getAptCommissionRate(apt, activeBarber);
        const comm = apt.payment_method === 'subscriber' ? 0 : (price * cutRate) / 100;
        return [
          format(parseISO(apt.appointment_date + 'T12:00:00'), 'dd/MM/yyyy'),
          apt.appointment_time.slice(0, 5),
          apt.guest_name || apt.profile?.name || 'Cliente',
          apt.services.map((s) => s.name).join(', '),
          apt.payment_method ? paymentMethodLabels[apt.payment_method] || apt.payment_method : '-',
          apt.payment_method === 'subscriber' ? 'VIP' : `R$ ${price.toFixed(2)}`,
          apt.payment_method === 'subscriber' ? '-' : `${cutRate}%`,
          apt.payment_method === 'subscriber' ? 'VIP' : `R$ ${comm.toFixed(2)}`,
        ];
      }),
      theme: 'grid',
    });

    doc.save(`comissao_${activeBarber.name.toLowerCase().replace(/\s+/g, '_')}_${startStr}.pdf`);
    toast.success('Relatório em PDF exportado!');
  };

  if (barbersList.length === 0) {
    return (
      <div className="p-8 rounded-2xl glass-effect text-center text-muted-foreground">
        Nenhum barbeiro cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(['today', 'weekly', 'monthly'] as FilterType[]).map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              onClick={() => setFilter(type)}
              size="sm"
            >
              {filterLabels[type]}
            </Button>
          ))}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant={filter === 'custom' ? 'default' : 'outline'} size="sm" className="gap-1">
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Switch
              id="include-pending-commission"
              checked={includePending}
              onCheckedChange={setIncludePending}
            />
            <Label htmlFor="include-pending-commission" className="text-xs cursor-pointer text-amber-500 font-medium">
              Já somar pendentes na comissão
            </Label>
          </div>
          <span className="text-sm font-medium capitalize text-muted-foreground">
            {getPeriodLabel()}
          </span>
          {activeBarber && (
            <Button variant="outline" size="sm" onClick={exportBarberPDF} className="gap-1.5">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Resumo comparativo entre barbeiros (somente Admin) */}
      {isAdminView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {barberSummaries.map(({ barber, gross, rate, commissionAmount, completed, vipCount }) => {
            const isSelected = activeBarber?.id === barber.id;
            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => setSelectedBarberId(barber.id)}
                className={cn(
                  'text-left p-4 rounded-2xl glass-effect border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 border border-primary/40">
                    <AvatarImage src={barber.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                      {barber.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{barber.name}</p>
                      {barber.is_owner && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary">Dono</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completed} cortes {vipCount > 0 ? `· ${vipCount} VIP` : ''} · {rate}% comissão
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Faturado</p>
                    <p className="font-bold text-base text-green-500">R$ {gross.toFixed(2)}</p>
                  </div>
                  {!barber.is_owner && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Comissão</p>
                      <p className="font-bold text-base text-amber-500">R$ {commissionAmount.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Controle de Porcentagem de Comissão (Admin, apenas para barbeiros não-donos) */}
      {isAdminView && activeBarber && !activeBarber.is_owner && (
        <div className="p-4 rounded-2xl glass-effect border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                Porcentagem de Comissão — {activeBarber.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Define quanto do faturamento pago fica com este barbeiro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={editingCommission}
                onChange={(e) => setEditingCommission(e.target.value)}
                className="pr-7 h-9 font-mono text-center"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <Button
              size="sm"
              onClick={handleSaveCommission}
              disabled={savingCommission || Number(editingCommission) === Number(activeBarber.commission_percent)}
              className="gap-1.5 h-9"
            >
              <Check className="h-4 w-4" />
              Aplicar
            </Button>
          </div>
        </div>
      )}

      {/* KPIs do barbeiro selecionado */}
      {activeBarber && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl glass-effect">
              <div className="flex items-center gap-2 mb-1.5">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Faturamento Bruto</span>
              </div>
              <p className="text-2xl font-bold text-green-500">R$ {totalGross.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {paidCuts.length} corte(s) pago(s)
              </p>
            </div>

            <div className="p-4 rounded-2xl glass-effect border border-amber-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">
                  {fixedBarber ? `Sua Comissão (${commissionRate}%)` : `Comissão (${commissionRate}%)`}
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-500">R$ {displayedCommission.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {includePending
                  ? `Pagos: R$ ${totalCommission.toFixed(2)} + Prev.: R$ ${pendingCommission.toFixed(2)}`
                  : pendingCommission > 0
                  ? `Pagos · Prev. pendentes: +R$ ${pendingCommission.toFixed(2)}`
                  : 'Sobre faturamento pago'}
              </p>
            </div>

            {isAdminView ? (
              <div className="p-4 rounded-2xl glass-effect">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Líquido Barbearia</span>
                </div>
                <p className="text-2xl font-bold text-primary">R$ {shopShare.toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {pendingCommission > 0 ? `Pendente: R$ ${pendingAmount.toFixed(2)}` : 'Após comissão de cada corte'}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl glass-effect">
                <div className="flex items-center gap-2 mb-1.5">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Pendente (Agendados)</span>
                </div>
                <p className="text-2xl font-bold text-yellow-500">R$ {pendingAmount.toFixed(2)}</p>
                <p className="text-[11px] text-amber-500 mt-1">
                  {pendingCuts.length} corte(s) · Sua com.: R$ {pendingCommission.toFixed(2)}
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl glass-effect">
              <div className="flex items-center gap-2 mb-1.5">
                <Scissors className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cortes / VIP</span>
              </div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                + {vipCuts.length} atend. VIP
              </p>
            </div>
          </div>

          {/* Breakdown por forma de pagamento */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(paymentBreakdown).map(([method, info]) => {
                const Icon = paymentMethodIcons[method] || DollarSign;
                return (
                  <div key={method} className="p-4 rounded-2xl glass-effect flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{paymentMethodLabels[method] || method}</p>
                        <p className="text-xs text-muted-foreground">{info.count} atendimento(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">R$ {info.amount.toFixed(2)}</p>
                      <p className="text-[11px] text-amber-500">
                        Com.: R$ {info.commission.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista detalhada de cortes */}
          <div className="rounded-2xl glass-effect p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Cortes Realizados — {activeBarber.name}
              </h3>
              <Badge variant="secondary">{barberAppointments.length} registro(s)</Badge>
            </div>

            {barberAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum atendimento neste período para este barbeiro.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {barberAppointments.map((apt) => {
                  const isVip = apt.payment_method === 'subscriber';
                  const isActiveNonVip = !isVip && apt.status !== 'cancelled' && apt.status !== 'no_show';
                  const isPaid = apt.payment_status === 'paid' && isActiveNonVip;
                  const isForecast = apt.payment_status !== 'paid' && isActiveNonVip;
                  const price = Number(apt.total_price || 0);
                  const cutRate = getAptCommissionRate(apt, activeBarber);
                  const cutCommission = isActiveNonVip ? (price * cutRate) / 100 : 0;
                  const clientName = apt.guest_name || apt.profile?.name || 'Cliente';

                  return (
                    <div
                      key={apt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/40 border border-border/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{clientName}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {format(parseISO(apt.appointment_date + 'T12:00:00'), 'dd/MM')} • {apt.appointment_time.slice(0, 5)}
                          </Badge>
                          {isVip && (
                            <Badge className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0">
                              VIP
                            </Badge>
                          )}
                          {apt.status === 'cancelled' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Cancelado
                            </Badge>
                          )}
                          {apt.status === 'no_show' && (
                            <Badge className="bg-orange-500/20 text-orange-500 text-[10px] px-1.5 py-0">
                              Falta
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {apt.services.map((s) => s.name).join(', ') || 'Serviço'}
                          {apt.payment_method && ` • ${paymentMethodLabels[apt.payment_method] || apt.payment_method}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="font-semibold text-sm">
                            {isVip ? 'VIP' : `R$ ${price.toFixed(2)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {isPaid ? `Comissão (${cutRate}%)` : isForecast ? `Com. Prevista (${cutRate}%)` : 'Comissão'}
                          </p>
                          <p
                            className={cn(
                              'font-bold text-sm',
                              isPaid ? 'text-amber-500' : isForecast ? 'text-amber-500/70' : 'text-muted-foreground'
                            )}
                          >
                            {isPaid || isForecast ? `R$ ${cutCommission.toFixed(2)}` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

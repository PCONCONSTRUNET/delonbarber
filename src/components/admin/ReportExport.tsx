import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminAppointment } from '@/hooks/useAdmin';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ReportExportProps {
  appointments: AdminAppointment[];
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  card: 'Cartão',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function ReportExport({ appointments }: ReportExportProps) {
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [isExporting, setIsExporting] = useState(false);

  const getMonthRange = () => {
    const now = new Date();
    if (selectedMonth === 'current') {
      return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM_yyyy', { locale: ptBR }) };
    } else if (selectedMonth === 'previous') {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev), label: format(prev, 'MMMM_yyyy', { locale: ptBR }) };
    } else {
      const prev2 = subMonths(now, 2);
      return { start: startOfMonth(prev2), end: endOfMonth(prev2), label: format(prev2, 'MMMM_yyyy', { locale: ptBR }) };
    }
  };

  const getFilteredAppointments = () => {
    const { start, end } = getMonthRange();
    return appointments.filter(a => {
      const date = new Date(a.appointment_date);
      return date >= start && date <= end;
    });
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const filtered = getFilteredAppointments();
      const { label } = getMonthRange();

      const headers = ['Data', 'Horário', 'Cliente', 'Telefone', 'Serviços', 'Valor', 'Status', 'Pagamento', 'Método'];
      
      const rows = filtered.map(apt => [
        format(new Date(apt.appointment_date), 'dd/MM/yyyy'),
        apt.appointment_time.slice(0, 5),
        apt.guest_name || apt.profile?.name || 'N/A',
        apt.guest_phone || apt.profile?.phone || 'N/A',
        apt.services.map(s => s.name).join('; '),
        `R$ ${Number(apt.total_price || 0).toFixed(2)}`,
        statusLabels[apt.status] || apt.status,
        apt.payment_status === 'paid' ? 'Pago' : 'Pendente',
        apt.payment_method ? paymentMethodLabels[apt.payment_method] || apt.payment_method : 'N/A',
      ]);

      // Add summary
      const paidTotal = filtered.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      const pendingTotal = filtered.filter(a => a.payment_status !== 'paid' && a.status === 'completed').reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      
      rows.push([]);
      rows.push(['RESUMO']);
      rows.push(['Total de Agendamentos', filtered.length.toString()]);
      rows.push(['Total Faturado', `R$ ${paidTotal.toFixed(2)}`]);
      rows.push(['Total Pendente', `R$ ${pendingTotal.toFixed(2)}`]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${label}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Relatório CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const filtered = getFilteredAppointments();
      const { label } = getMonthRange();

      const paidTotal = filtered.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      const pendingTotal = filtered.filter(a => a.payment_status !== 'paid' && a.status === 'completed').reduce((sum, a) => sum + Number(a.total_price || 0), 0);
      const completedCount = filtered.filter(a => a.status === 'completed').length;
      const cancelledCount = filtered.filter(a => a.status === 'cancelled').length;

      // Payment breakdown
      const paymentBreakdown = filtered
        .filter(a => a.payment_status === 'paid')
        .reduce((acc, apt) => {
          const method = apt.payment_method || 'other';
          acc[method] = (acc[method] || 0) + Number(apt.total_price || 0);
          return acc;
        }, {} as Record<string, number>);

      const report = `
╔══════════════════════════════════════════════════════════════╗
║              RELATÓRIO FINANCEIRO - BARBEARIA                ║
║                     ${label.toUpperCase().padStart(20).padEnd(35)}║
╠══════════════════════════════════════════════════════════════╣

📊 RESUMO GERAL
───────────────────────────────────────────────────────────────
  Total de Agendamentos:        ${filtered.length}
  Atendimentos Concluídos:      ${completedCount}
  Cancelamentos:                ${cancelledCount}
  
💰 FINANCEIRO
───────────────────────────────────────────────────────────────
  Total Faturado:               R$ ${paidTotal.toFixed(2)}
  Pagamentos Pendentes:         R$ ${pendingTotal.toFixed(2)}
  Ticket Médio:                 R$ ${completedCount > 0 ? (paidTotal / completedCount).toFixed(2) : '0.00'}

💳 FATURAMENTO POR MÉTODO DE PAGAMENTO
───────────────────────────────────────────────────────────────
${Object.entries(paymentBreakdown).map(([method, amount]) => 
  `  ${(paymentMethodLabels[method] || method).padEnd(25)} R$ ${amount.toFixed(2)}`
).join('\n')}

📋 LISTA DE ATENDIMENTOS
═══════════════════════════════════════════════════════════════
${filtered.map(apt => `
  ${format(new Date(apt.appointment_date), 'dd/MM')} ${apt.appointment_time.slice(0, 5)} | ${(apt.guest_name || apt.profile?.name || 'Cliente').padEnd(20)} | R$ ${Number(apt.total_price || 0).toFixed(0).padStart(6)} | ${statusLabels[apt.status] || apt.status}`
).join('')}

═══════════════════════════════════════════════════════════════
  Relatório gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
═══════════════════════════════════════════════════════════════
      `.trim();

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${label}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Selecione o mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Mês Atual</SelectItem>
          <SelectItem value="previous">Mês Anterior</SelectItem>
          <SelectItem value="previous2">2 Meses Atrás</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={exportToCSV}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        Exportar CSV
      </Button>

      <Button
        variant="outline"
        onClick={exportToPDF}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Exportar Relatório
      </Button>
    </div>
  );
}

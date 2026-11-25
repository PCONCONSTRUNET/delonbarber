export interface BusinessHourRow {
  id?: string;
  barber_id?: string | null;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

export const SHORT_DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const FULL_DAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/**
 * Agrupa índices de dias da semana (0..6) consecutivos em faixas legíveis.
 * Ex: [1,2,3,4,5] -> "Seg-Sex" (ou "Segunda a Sexta" com separador " a ").
 */
export function formatDayGroups(
  days: number[],
  names: readonly string[] = SHORT_DAY_NAMES,
  rangeSeparator = '-'
): string {
  if (!days || days.length === 0) return '';
  const sorted = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const groups: { start: number; end: number }[] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.end === d - 1) {
      last.end = d;
    } else {
      groups.push({ start: d, end: d });
    }
  }

  return groups
    .map((g) =>
      g.start === g.end
        ? names[g.start]
        : `${names[g.start]}${rangeSeparator}${names[g.end]}`
    )
    .join(', ');
}

export interface ScheduleDaySummary {
  openDays: number[];
  closedDays: number[];
  saturdayBlockedByVip: boolean;
  sundayBlockedByVip: boolean;
  openShortLabel: string;
  openFullLabel: string;
  closedShortLabel: string;
}

/**
 * Gera resumo dinâmico dos dias abertos/fechados a partir dos horários do painel,
 * aplicando a restrição de sábado/fim de semana para clientes VIP / exclusivos.
 */
export function getScheduleDaySummary(
  businessHours: BusinessHourRow[],
  options?: { blockSaturday?: boolean; blockSunday?: boolean }
): ScheduleDaySummary {
  const blockSaturday = Boolean(options?.blockSaturday);
  const blockSunday = Boolean(options?.blockSunday);

  const openDays: number[] = [];
  const closedDays: number[] = [];
  let saturdayBlockedByVip = false;
  let sundayBlockedByVip = false;

  for (let day = 0; day <= 6; day++) {
    const row = businessHours.find((h) => h.day_of_week === day);
    const panelOpen = Boolean(row?.is_open);

    if (day === 6 && blockSaturday) {
      if (panelOpen) saturdayBlockedByVip = true;
      else closedDays.push(day);
      continue;
    }

    if (day === 0 && blockSunday) {
      if (panelOpen) sundayBlockedByVip = true;
      else closedDays.push(day);
      continue;
    }

    if (panelOpen) openDays.push(day);
    else closedDays.push(day);
  }

  return {
    openDays,
    closedDays,
    saturdayBlockedByVip,
    sundayBlockedByVip,
    openShortLabel: formatDayGroups(openDays, SHORT_DAY_NAMES, '-'),
    openFullLabel: formatDayGroups(openDays, FULL_DAY_NAMES, ' a '),
    closedShortLabel: formatDayGroups(closedDays, SHORT_DAY_NAMES, '-'),
  };
}

/**
 * Normaliza o par de intervalo de almoço:
 * valores vazios, '00:00' / '00:00:00' ou onde início >= fim retornam null.
 */
export function sanitizeLunchBreak(
  lunchStart: string | null | undefined,
  lunchEnd: string | null | undefined
): { lunch_start: string | null; lunch_end: string | null } {
  if (!lunchStart || !lunchEnd) {
    return { lunch_start: null, lunch_end: null };
  }
  const s = lunchStart.slice(0, 5);
  const e = lunchEnd.slice(0, 5);
  if ((s === '00:00' && e === '00:00') || s >= e) {
    return { lunch_start: null, lunch_end: null };
  }
  return {
    lunch_start: lunchStart.length === 5 ? `${lunchStart}:00` : lunchStart,
    lunch_end: lunchEnd.length === 5 ? `${lunchEnd}:00` : lunchEnd,
  };
}

/**
 * Normaliza (somente em memória) os horários vindos do banco.
 * IMPORTANTE: não altera nem grava nada no banco — o que o admin/barbeiro salvar
 * no painel é exatamente o que vale para a agenda dos clientes.
 */
export async function normalizeAndSyncBusinessHours<T extends BusinessHourRow>(
  rawRows: T[]
): Promise<T[]> {
  if (!rawRows || rawRows.length === 0) return [];
  return rawRows.map((row) => {
    const cleanLunch = sanitizeLunchBreak(row.lunch_start, row.lunch_end);
    return { ...row, lunch_start: cleanLunch.lunch_start, lunch_end: cleanLunch.lunch_end };
  });
}

/**
 * Resolve os horários de atendimento para um barbeiro específico (0..6).
 * Se o barbeiro tiver linhas customizadas em `business_hours` (barber_id = barberId),
 * usa-as dia a dia; caso contrário, faz fallback para o horário geral (barber_id IS NULL).
 */
export function resolveBusinessHoursForBarber<T extends BusinessHourRow>(
  allRows: T[],
  barberId?: string | null
): T[] {
  const globalRows = allRows.filter((r) => !r.barber_id);
  if (!barberId) {
    return [...globalRows].sort((a, b) => a.day_of_week - b.day_of_week);
  }
  const barberRows = allRows.filter((r) => r.barber_id === barberId);
  if (barberRows.length === 0) {
    return [...globalRows].sort((a, b) => a.day_of_week - b.day_of_week);
  }
  const resolved: T[] = [];
  for (let day = 0; day <= 6; day++) {
    const specific = barberRows.find((r) => r.day_of_week === day);
    const fallback = globalRows.find((r) => r.day_of_week === day);
    if (specific) resolved.push(specific);
    else if (fallback) resolved.push(fallback);
  }
  return resolved;
}

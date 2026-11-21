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

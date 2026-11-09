import { supabase } from '@/integrations/supabase/client';

export interface BusinessHourRow {
  id?: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
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
 * Detecta se os registros vindos do banco ainda estão com os horários antigos
 * antes do ajuste geral (Terça a Sexta 08:00-15:00, intervalo 12:00-13:00).
 */
function hasLegacyTueFriHours(rows: BusinessHourRow[]): boolean {
  const d2 = rows.find((r) => r.day_of_week === 2);
  const d3 = rows.find((r) => r.day_of_week === 3);
  const d4 = rows.find((r) => r.day_of_week === 4);
  const d5 = rows.find((r) => r.day_of_week === 5);

  return Boolean(
    (d2 && d2.open_time.slice(0, 5) === '14:00' && d2.close_time.slice(0, 5) === '18:00') ||
    (d3 && d3.open_time.slice(0, 5) === '14:00' && d3.close_time.slice(0, 5) === '20:30') ||
    (d4 && d4.open_time.slice(0, 5) === '08:00' && d4.close_time.slice(0, 5) === '16:00') ||
    (d5 && d5.open_time.slice(0, 5) === '07:30' && d5.close_time.slice(0, 5) === '19:00')
  );
}

/**
 * Normaliza os horários de atendimento e, caso o banco ainda contenha os horários
 * antigos pré-ajuste, aplica o padrão de Terça a Sexta (08:00 às 15:00, intervalo 12:00 às 13:00)
 * e sincroniza silenciosamente com o Supabase quando houver sessão de admin.
 */
export async function normalizeAndSyncBusinessHours<T extends BusinessHourRow>(
  rawRows: T[]
): Promise<T[]> {
  if (!rawRows || rawRows.length === 0) return [];

  const needsMigrationSync = hasLegacyTueFriHours(rawRows);
  const rowsToPersist: T[] = [];

  const normalized = rawRows.map((row) => {
    const cleanLunch = sanitizeLunchBreak(row.lunch_start, row.lunch_end);
    let updated: T = {
      ...row,
      lunch_start: cleanLunch.lunch_start,
      lunch_end: cleanLunch.lunch_end,
    };

    if (needsMigrationSync && row.day_of_week >= 2 && row.day_of_week <= 5) {
      updated = {
        ...updated,
        is_open: true,
        open_time: '08:00:00',
        close_time: '15:00:00',
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
      };
    }

    if (
      updated.open_time !== row.open_time ||
      updated.close_time !== row.close_time ||
      updated.is_open !== row.is_open ||
      updated.lunch_start !== row.lunch_start ||
      updated.lunch_end !== row.lunch_end
    ) {
      rowsToPersist.push(updated);
    }

    return updated;
  });

  // Se houver diferenças (ex: migração pendente no banco) e usuário logado, tenta persistir no banco
  if (rowsToPersist.length > 0) {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      for (const r of rowsToPersist) {
        const query = supabase.from('business_hours').update({
          is_open: r.is_open,
          open_time: r.open_time,
          close_time: r.close_time,
          lunch_start: r.lunch_start,
          lunch_end: r.lunch_end,
        });
        if (r.id) {
          await query.eq('id', r.id);
        } else {
          await query.eq('day_of_week', r.day_of_week);
        }
      }
    }).catch(() => {
      // Ignora silenciosamente se usuário não for admin
    });
  }

  return normalized;
}


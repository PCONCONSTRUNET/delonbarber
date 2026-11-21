import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Loader2, Coffee, ChevronDown, X, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BusinessHourRow,
  normalizeAndSyncBusinessHours,
  resolveBusinessHoursForBarber,
  sanitizeLunchBreak,
} from '@/lib/businessHours';
import { useBarbers } from '@/hooks/useBarbers';

interface BusinessHour {
  id: string;
  barber_id?: string | null;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
  isCustom?: boolean;
}

interface BusinessHoursManagerProps {
  onSaved?: () => void;
  /** Quando definido (ex: Painel do Barbeiro), edita somente os horários deste barbeiro */
  fixedBarberId?: string | null;
  /** Barbeiro inicial pré-selecionado no Admin */
  defaultBarberId?: string | null;
}

const DAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const DAY_ABBREVIATIONS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function BusinessHoursManager({
  onSaved,
  fixedBarberId,
  defaultBarberId,
}: BusinessHoursManagerProps = {}) {
  const { barbers } = useBarbers();
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(
    fixedBarberId ?? defaultBarberId ?? null
  );
  const [allHours, setAllHours] = useState<BusinessHourRow[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const activeTargetBarberId = fixedBarberId !== undefined ? fixedBarberId : selectedBarberId;

  useEffect(() => {
    if (fixedBarberId !== undefined) {
      setSelectedBarberId(fixedBarberId);
    }
  }, [fixedBarberId]);

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  useEffect(() => {
    if (allHours.length === 0) return;
    const resolved = resolveBusinessHoursForBarber(allHours, activeTargetBarberId);
    setHours(
      resolved.map((r) => ({
        id: r.id || `temp-${r.day_of_week}`,
        barber_id: r.barber_id ?? null,
        day_of_week: r.day_of_week,
        open_time: r.open_time,
        close_time: r.close_time,
        is_open: Boolean(r.is_open),
        lunch_start: r.lunch_start,
        lunch_end: r.lunch_end,
        isCustom: Boolean(activeTargetBarberId && r.barber_id === activeTargetBarberId),
      }))
    );
    setHasChanges(false);
  }, [allHours, activeTargetBarberId]);

  async function fetchBusinessHours() {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching business hours:', error);
      toast.error('Erro ao carregar horários');
    } else {
      const normalized = await normalizeAndSyncBusinessHours(data || []);
      setAllHours(normalized);
    }
    setLoading(false);
  }

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h))
    );
    setHasChanges(true);
  };

  const formatTimeForInput = (time: string | null): string => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const formatTimeForDB = (time: string): string => {
    if (time.length === 5) return `${time}:00`;
    return time;
  };

  function validateHours(): string | null {
    for (const hour of hours) {
      if (!hour.is_open) continue;
      const name = DAY_NAMES[hour.day_of_week];
      const open = (hour.open_time || '').slice(0, 5);
      const close = (hour.close_time || '').slice(0, 5);
      if (!open || !close) return `${name}: preencha o horário de abertura e fechamento.`;
      if (open >= close) return `${name}: o horário de abertura deve ser antes do fechamento.`;

      const ls = (hour.lunch_start || '').slice(0, 5);
      const le = (hour.lunch_end || '').slice(0, 5);
      if ((ls && !le) || (!ls && le)) {
        return `${name}: preencha início e fim do intervalo (ou clique em "Sem intervalo").`;
      }
      if (ls && le) {
        if (ls >= le) return `${name}: o início do intervalo deve ser antes do fim.`;
        if (ls < open || le > close) {
          return `${name}: o intervalo precisa estar dentro do horário de trabalho.`;
        }
      }
    }
    return null;
  }

  async function saveChanges() {
    const validationError = validateHours();
    if (validationError) {
      toast.error('Verifique os horários', { description: validationError });
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      for (const hour of hours) {
        const cleanLunch = sanitizeLunchBreak(hour.lunch_start, hour.lunch_end);
        const payload = {
          open_time: formatTimeForDB(hour.open_time),
          close_time: formatTimeForDB(hour.close_time),
          is_open: hour.is_open,
          lunch_start: cleanLunch.lunch_start,
          lunch_end: cleanLunch.lunch_end,
        };

        if (activeTargetBarberId) {
          // Verifica se já existe linha específica para este barbeiro neste dia
          const existing = allHours.find(
            (r) => r.barber_id === activeTargetBarberId && r.day_of_week === hour.day_of_week
          );
          if (existing?.id) {
            const { data, error } = await supabase
              .from('business_hours')
              .update(payload)
              .eq('id', existing.id)
              .select('id');
            if (error) throw error;
            if (!data || data.length === 0) {
              throw new Error('Sem permissão para salvar horários.');
            }
          } else {
            const { error } = await supabase.from('business_hours').insert({
              ...payload,
              day_of_week: hour.day_of_week,
              barber_id: activeTargetBarberId,
            });
            if (error) throw error;
          }
        } else {
          const { data, error } = await supabase
            .from('business_hours')
            .update(payload)
            .eq('id', hour.id)
            .select('id');

          if (error) throw error;
          if (!data || data.length === 0) {
            throw new Error('Sem permissão para salvar. Confirme se está logado com a conta de administrador.');
          }
        }
      }

      toast.success('Horários salvos!', {
        description: 'Alterações aplicadas na agenda dos clientes.',
      });
      setHasChanges(false);
      await fetchBusinessHours();
      onSaved?.();
    } catch (error: any) {
      console.error('Error saving business hours:', error);
      toast.error('Erro ao salvar horários', {
        description: error?.message || 'Tente novamente.',
      });
    }

    setSaving(false);
  }

  const toggleExpand = (dayOfWeek: number) => {
    setExpandedDay(expandedDay === dayOfWeek ? null : dayOfWeek);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedBarberObj = barbers.find((b) => b.id === activeTargetBarberId);

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mx-1 px-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                {selectedBarberObj ? `Horários — ${selectedBarberObj.name}` : 'Horários Gerais'}
              </h2>
              {fixedBarberId && (
                <p className="text-[11px] text-muted-foreground">
                  Altera apenas sua própria agenda
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            size="sm"
            className="h-9 gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden xs:inline">Salvar</span>
          </Button>
        </div>

        {/* Seletor de Barbeiro (apenas no Admin quando há múltiplos barbeiros) */}
        {fixedBarberId === undefined && barbers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setSelectedBarberId(null)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                selectedBarberId === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              Padrão Geral
            </button>
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBarberId(b.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1',
                  selectedBarberId === b.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                )}
              >
                <Scissors className="h-3 w-3" />
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Days list */}
      <div className="space-y-2">
        {hours.map((hour, index) => {
          const isExpanded = expandedDay === hour.day_of_week;

          return (
            <motion.div
              key={`${activeTargetBarberId || 'global'}-${hour.day_of_week}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div
                className={cn(
                  'rounded-xl border transition-all overflow-hidden',
                  hour.is_open ? 'bg-card border-border' : 'bg-muted/30 border-border/50'
                )}
              >
                <button
                  onClick={() => hour.is_open && toggleExpand(hour.day_of_week)}
                  className={cn(
                    'w-full p-3 flex items-center justify-between',
                    hour.is_open && 'cursor-pointer active:bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold',
                        hour.is_open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {DAY_ABBREVIATIONS[hour.day_of_week]}
                    </div>

                    <div className="text-left">
                      <p className={cn('font-medium text-sm', !hour.is_open && 'text-muted-foreground')}>
                        {DAY_NAMES[hour.day_of_week]}
                      </p>
                      {hour.is_open ? (
                        <p className="text-xs text-muted-foreground">
                          {formatTimeForInput(hour.open_time)} - {formatTimeForInput(hour.close_time)}
                          {(() => {
                            const clean = sanitizeLunchBreak(hour.lunch_start, hour.lunch_end);
                            if (clean.lunch_start && clean.lunch_end) {
                              return (
                                <span className="text-primary/70 ml-1">
                                  · Intervalo {formatTimeForInput(clean.lunch_start)}-
                                  {formatTimeForInput(clean.lunch_end)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">Fechado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hour.is_open}
                      onCheckedChange={(checked) => {
                        updateHour(hour.day_of_week, 'is_open', checked);
                        if (checked) setExpandedDay(hour.day_of_week);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {hour.is_open && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {hour.is_open && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Horário de Trabalho
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.open_time)}
                              onChange={(e) => updateHour(hour.day_of_week, 'open_time', e.target.value)}
                              className="h-10 text-center font-mono"
                            />
                            <span className="text-muted-foreground text-sm flex-shrink-0">às</span>
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.close_time)}
                              onChange={(e) => updateHour(hour.day_of_week, 'close_time', e.target.value)}
                              className="h-10 text-center font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Coffee className="h-3 w-3" />
                              Intervalo de Almoço
                            </Label>
                            {(hour.lunch_start || hour.lunch_end) && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateHour(hour.day_of_week, 'lunch_start', null);
                                  updateHour(hour.day_of_week, 'lunch_end', null);
                                }}
                                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Sem intervalo
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.lunch_start)}
                              onChange={(e) =>
                                updateHour(hour.day_of_week, 'lunch_start', e.target.value || null)
                              }
                              className="h-10 text-center font-mono"
                              placeholder="--:--"
                            />
                            <span className="text-muted-foreground text-sm flex-shrink-0">às</span>
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.lunch_end)}
                              onChange={(e) =>
                                updateHour(hour.day_of_week, 'lunch_end', e.target.value || null)
                              }
                              className="h-10 text-center font-mono"
                              placeholder="--:--"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground/60">
                            Deixe vazio se não tiver intervalo
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-0 right-0 flex justify-center md:hidden z-50 pointer-events-none"
          >
            <Button
              onClick={saveChanges}
              disabled={saving}
              size="lg"
              className="shadow-lg gap-2 pointer-events-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Loader2, Coffee, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
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

export function BusinessHoursManager() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    fetchBusinessHours();
  }, []);

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
      setHours(data || []);
    }
    setLoading(false);
  }

  const updateHour = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
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

  async function saveChanges() {
    setSaving(true);

    try {
      for (const hour of hours) {
        const { error } = await supabase
          .from('business_hours')
          .update({
            open_time: formatTimeForDB(hour.open_time),
            close_time: formatTimeForDB(hour.close_time),
            is_open: hour.is_open,
            lunch_start: hour.lunch_start ? formatTimeForDB(hour.lunch_start) : null,
            lunch_end: hour.lunch_end ? formatTimeForDB(hour.lunch_end) : null,
          })
          .eq('id', hour.id);

        if (error) {
          throw error;
        }
      }

      toast.success('Horários salvos!', {
        description: 'Alterações aplicadas na agenda.',
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast.error('Erro ao salvar horários');
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

  return (
    <div className="space-y-3 pb-4">
      {/* Header - sticky on mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mx-1 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-semibold">Horários</h2>
          </div>
          <Button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            size="sm"
            className="h-9 gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden xs:inline">Salvar</span>
          </Button>
        </div>
      </div>

      {/* Days list - compact cards */}
      <div className="space-y-2">
        {hours.map((hour, index) => {
          const isExpanded = expandedDay === hour.day_of_week;
          
          return (
            <motion.div
              key={hour.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div
                className={cn(
                  'rounded-xl border transition-all overflow-hidden',
                  hour.is_open 
                    ? 'bg-card border-border' 
                    : 'bg-muted/30 border-border/50'
                )}
              >
                {/* Compact header - always visible */}
                <button
                  onClick={() => hour.is_open && toggleExpand(hour.day_of_week)}
                  className={cn(
                    'w-full p-3 flex items-center justify-between',
                    hour.is_open && 'cursor-pointer active:bg-accent/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Day badge */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold',
                        hour.is_open
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {DAY_ABBREVIATIONS[hour.day_of_week]}
                    </div>
                    
                    {/* Day info */}
                    <div className="text-left">
                      <p className={cn(
                        'font-medium text-sm',
                        !hour.is_open && 'text-muted-foreground'
                      )}>
                        {DAY_NAMES[hour.day_of_week]}
                      </p>
                      {hour.is_open ? (
                        <p className="text-xs text-muted-foreground">
                          {formatTimeForInput(hour.open_time)} - {formatTimeForInput(hour.close_time)}
                          {hour.lunch_start && hour.lunch_end && (
                            <span className="text-primary/70 ml-1">
                              · {formatTimeForInput(hour.lunch_start)}-{formatTimeForInput(hour.lunch_end)}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">Fechado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <Switch
                      checked={hour.is_open}
                      onCheckedChange={(checked) => {
                        updateHour(hour.day_of_week, 'is_open', checked);
                        if (checked) setExpandedDay(hour.day_of_week);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    {/* Expand indicator */}
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

                {/* Expandable time inputs */}
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
                        {/* Working hours */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Horário de Trabalho
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.open_time)}
                              onChange={(e) =>
                                updateHour(hour.day_of_week, 'open_time', e.target.value)
                              }
                              className="h-10 text-center font-mono"
                            />
                            <span className="text-muted-foreground text-sm flex-shrink-0">às</span>
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.close_time)}
                              onChange={(e) =>
                                updateHour(hour.day_of_week, 'close_time', e.target.value)
                              }
                              className="h-10 text-center font-mono"
                            />
                          </div>
                        </div>

                        {/* Lunch break */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Coffee className="h-3 w-3" />
                            Intervalo de Almoço
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.lunch_start)}
                              onChange={(e) =>
                                updateHour(
                                  hour.day_of_week,
                                  'lunch_start',
                                  e.target.value || null
                                )
                              }
                              className="h-10 text-center font-mono"
                              placeholder="--:--"
                            />
                            <span className="text-muted-foreground text-sm flex-shrink-0">às</span>
                            <Input
                              type="time"
                              value={formatTimeForInput(hour.lunch_end)}
                              onChange={(e) =>
                                updateHour(
                                  hour.day_of_week,
                                  'lunch_end',
                                  e.target.value || null
                                )
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

      {/* Floating save button when has changes */}
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

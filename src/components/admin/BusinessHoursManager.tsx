import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Save, Loader2, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const DAY_ABBREVIATIONS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BusinessHoursManager() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
    // Remove seconds if present (HH:MM:SS -> HH:MM)
    return time.slice(0, 5);
  };

  const formatTimeForDB = (time: string): string => {
    // Add seconds if not present (HH:MM -> HH:MM:SS)
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

      toast.success('Horários salvos com sucesso!', {
        description: 'As alterações já estão disponíveis para os clientes.',
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast.error('Erro ao salvar horários');
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Horários de Funcionamento</h2>
        </div>
        <Button
          onClick={saveChanges}
          disabled={!hasChanges || saving}
          size="sm"
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure os horários de funcionamento. As alterações serão aplicadas imediatamente na agenda dos clientes.
      </p>

      {/* Days list */}
      <div className="space-y-2">
        {hours.map((hour, index) => (
          <motion.div
            key={hour.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                'transition-all',
                !hour.is_open && 'opacity-50'
              )}
            >
              <CardContent className="p-3 space-y-3">
                {/* Day header with toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                        hour.is_open
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {DAY_ABBREVIATIONS[hour.day_of_week]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {DAY_NAMES[hour.day_of_week]}
                      </p>
                      {hour.is_open && (
                        <p className="text-xs text-muted-foreground">
                          {formatTimeForInput(hour.open_time)} - {formatTimeForInput(hour.close_time)}
                          {hour.lunch_start && hour.lunch_end && (
                            <span className="ml-1">
                              (almoço: {formatTimeForInput(hour.lunch_start)} - {formatTimeForInput(hour.lunch_end)})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`open-${hour.day_of_week}`} className="text-xs text-muted-foreground">
                      {hour.is_open ? 'Aberto' : 'Fechado'}
                    </Label>
                    <Switch
                      id={`open-${hour.day_of_week}`}
                      checked={hour.is_open}
                      onCheckedChange={(checked) =>
                        updateHour(hour.day_of_week, 'is_open', checked)
                      }
                    />
                  </div>
                </div>

                {/* Time inputs (only show when open) */}
                {hour.is_open && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    {/* Opening hours */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Horário
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={formatTimeForInput(hour.open_time)}
                          onChange={(e) =>
                            updateHour(hour.day_of_week, 'open_time', e.target.value)
                          }
                          className="h-9 text-sm"
                        />
                        <span className="text-muted-foreground text-sm">às</span>
                        <Input
                          type="time"
                          value={formatTimeForInput(hour.close_time)}
                          onChange={(e) =>
                            updateHour(hour.day_of_week, 'close_time', e.target.value)
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Lunch break */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coffee className="h-3 w-3" />
                        Almoço (opcional)
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
                          className="h-9 text-sm"
                          placeholder="--:--"
                        />
                        <span className="text-muted-foreground text-sm">às</span>
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
                          className="h-9 text-sm"
                          placeholder="--:--"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Os horários configurados aqui definem quando os clientes podem agendar. 
          Alterações são aplicadas imediatamente.
        </p>
      </div>
    </div>
  );
}

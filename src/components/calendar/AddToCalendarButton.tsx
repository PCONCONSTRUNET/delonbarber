import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Check, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadICS, createAppointmentEvent } from '@/lib/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddToCalendarButtonProps {
  appointmentId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm:ss
  durationMinutes: number;
  services: string[];
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export function AddToCalendarButton({
  appointmentId,
  date,
  time,
  durationMinutes,
  services,
  variant = 'default',
  className
}: AddToCalendarButtonProps) {
  const [added, setAdded] = useState(false);

  const handleAddToCalendar = () => {
    try {
      const event = createAppointmentEvent(
        date,
        time,
        durationMinutes,
        services,
        appointmentId
      );

      downloadICS(event, `delon-barber-${date}.ics`);
      
      setAdded(true);
      toast.success('Arquivo de calendário baixado!', {
        description: 'Abra o arquivo para adicionar ao seu calendário.',
      });

      // Reset after 3 seconds
      setTimeout(() => setAdded(false), 3000);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast.error('Erro ao criar evento', {
        description: 'Tente novamente.',
      });
    }
  };

  if (variant === 'icon') {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleAddToCalendar}
        className={cn(
          "p-2 rounded-xl transition-colors",
          added 
            ? "bg-accent text-accent-foreground" 
            : "bg-primary/10 text-primary hover:bg-primary/20",
          className
        )}
        title="Adicionar ao Calendário"
      >
        {added ? (
          <Check className="w-4 h-4" />
        ) : (
          <CalendarPlus className="w-4 h-4" />
        )}
      </motion.button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddToCalendar}
        className={cn(
          "text-xs gap-1.5 rounded-xl",
          added 
            ? "text-accent-foreground" 
            : "text-primary hover:text-primary",
          className
        )}
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Adicionado!
          </>
        ) : (
          <>
            <CalendarPlus className="w-3.5 h-3.5" />
            Calendário
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleAddToCalendar}
      className={cn(
        "gap-2 rounded-xl border-primary/30",
        added 
          ? "bg-accent border-accent text-accent-foreground hover:bg-accent/80" 
          : "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
        className
      )}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" />
          Adicionado!
        </>
      ) : (
        <>
          <Smartphone className="w-4 h-4" />
          <CalendarPlus className="w-4 h-4" />
          Calendário
        </>
      )}
    </Button>
  );
}

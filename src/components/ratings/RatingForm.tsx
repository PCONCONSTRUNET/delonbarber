import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Send, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RatingStars } from './RatingStars';

interface RatingFormProps {
  appointment: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    services: string[];
  };
  onSubmit: (appointmentId: string, rating: number, comment: string, isPublic: boolean) => Promise<boolean>;
  onDismiss: () => void;
}

export function RatingForm({ appointment, onSubmit, onDismiss }: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    const success = await onSubmit(appointment.id, rating, comment, isPublic);
    setIsSubmitting(false);
    
    if (success) {
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-card border border-border rounded-2xl p-4 shadow-lg"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Como foi seu atendimento?
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(appointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })} • {appointment.services.join(', ')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center mb-4">
        <RatingStars
          rating={rating}
          size="lg"
          interactive
          onRatingChange={setRating}
        />
      </div>

      <Textarea
        placeholder="Deixe um comentário (opcional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="resize-none mb-3"
        rows={2}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Globe className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="public" className="text-sm text-muted-foreground">
            {isPublic ? 'Avaliação pública' : 'Avaliação privada'}
          </Label>
        </div>
        <Switch
          id="public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={rating === 0 || isSubmitting}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
      </Button>
    </motion.div>
  );
}

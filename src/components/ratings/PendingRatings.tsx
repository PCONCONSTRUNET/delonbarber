import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMyRatings } from '@/hooks/useRatings';
import { RatingForm } from './RatingForm';

export function PendingRatings() {
  const { pendingAppointments, submitRating } = useMyRatings();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleAppointments = pendingAppointments.filter(
    apt => !dismissedIds.includes(apt.id)
  );

  if (visibleAppointments.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  // Only show the first pending rating
  const appointment = visibleAppointments[0];

  return (
    <div className="mb-4">
      <AnimatePresence mode="wait">
        <RatingForm
          key={appointment.id}
          appointment={appointment}
          onSubmit={submitRating}
          onDismiss={() => handleDismiss(appointment.id)}
        />
      </AnimatePresence>
    </div>
  );
}

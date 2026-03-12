import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { useRatings, useAverageRating } from '@/hooks/useRatings';
import { RatingStars } from './RatingStars';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';

export function PublicRatings() {
  const { ratings, loading } = useRatings();
  const { average, count } = useAverageRating();

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-64 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (ratings.length === 0) {
    return null;
  }

  return (
    <section className="py-10 sm:py-16 px-3 xs:px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6 sm:mb-10"
        >
          <h2 className="font-display text-2xl xs:text-3xl font-bold text-foreground mb-2">
            O que nossos clientes dizem
          </h2>
          {average !== null && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <RatingStars rating={Math.round(average)} size="sm" />
              <span className="text-base xs:text-lg font-bold text-yellow-400">
                {average.toFixed(1)}
              </span>
              <span className="text-xs xs:text-sm text-muted-foreground">
                ({count} avaliações)
              </span>
            </div>
          )}
        </motion.div>

        <Carousel
          opts={{ align: 'start', loop: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {ratings.map((rating, index) => (
              <CarouselItem
                key={rating.id}
                className="pl-3 basis-[85%] xs:basis-[70%] sm:basis-1/2 lg:basis-1/3"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 xs:p-4 sm:p-5 relative h-full"
                >
                  <Quote className="absolute top-3 right-3 h-5 w-5 xs:h-6 xs:w-6 text-primary/20" />
                  
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs xs:text-sm">
                      {rating.profile?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-xs xs:text-sm truncate">
                        {rating.profile?.name || 'Cliente'}
                      </p>
                      <p className="text-[10px] xs:text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </div>

                  <RatingStars rating={rating.rating} size="sm" />

                  {rating.comment && (
                    <p className="text-xs xs:text-sm text-muted-foreground mt-2 line-clamp-3">
                      "{rating.comment}"
                    </p>
                  )}
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex items-center justify-center gap-2 mt-4">
            <CarouselPrevious className="static translate-y-0 h-9 w-9 rounded-full border-border" />
            <CarouselNext className="static translate-y-0 h-9 w-9 rounded-full border-border" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}

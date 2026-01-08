import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';

interface ServiceSelectionProps {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
}

const categoryLabels: Record<string, string> = {
  corte: '✂️ Cortes',
  barba: '🧔 Barba',
  sobrancelha: '👁️ Sobrancelha',
  combo: '⭐ Combos',
  adicional: '➕ Extras'
};

const categoryOrder = ['corte', 'barba', 'sobrancelha', 'combo', 'adicional'];

export function ServiceSelection({ services, selectedServices, onToggleService }: ServiceSelectionProps) {
  const categories = [...new Set(services.map(s => s.category))]
    .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  const isSelected = (service: Service) => 
    selectedServices.some(s => s.id === service.id);

  return (
    <div className="space-y-6">
      {categories.map((category, catIndex) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: catIndex * 0.1 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-3 px-1">
            {categoryLabels[category] || category}
          </h3>
          
          <div className="space-y-3">
            {services
              .filter(s => s.category === category)
              .sort((a, b) => category === 'corte' ? Number(b.price) - Number(a.price) : 0)
              .map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToggleService(service)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98]",
                    isSelected(service)
                      ? "bg-primary/15 border-2 border-primary"
                      : "bg-card/80 border-2 border-transparent"
                  )}
                >
                  {/* Image */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-2xl">✂️</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  
                  {/* Price & Check */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-primary font-bold text-sm">
                      R$ {Number(service.price).toFixed(0)}
                    </span>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected(service)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected(service) && (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

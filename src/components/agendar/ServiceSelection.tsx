import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';

interface ServiceSelectionProps {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
}

const categoryLabels: Record<string, string> = {
  corte: 'Cortes',
  barba: 'Barba',
  combo: 'Combos Premium',
  adicional: 'Adicionais'
};

export function ServiceSelection({ services, selectedServices, onToggleService }: ServiceSelectionProps) {
  const categories = [...new Set(services.map(s => s.category))];

  const isSelected = (service: Service) => 
    selectedServices.some(s => s.id === service.id);

  return (
    <div className="space-y-8">
      {categories.map((category, catIndex) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: catIndex * 0.1 }}
        >
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            {categoryLabels[category] || category}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services
              .filter(s => s.category === category)
              .map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToggleService(service)}
                  className={cn(
                    "relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300",
                    isSelected(service)
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {/* Image */}
                  <div className="relative h-32 overflow-hidden">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Scissors className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    
                    {/* Selected indicator */}
                    {isSelected(service) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </motion.div>
                    )}
                    
                    {/* Price badge */}
                    <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                      R$ {Number(service.price).toFixed(2)}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 bg-card">
                    <h4 className="font-semibold text-foreground">{service.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ⏱️ {service.duration_minutes} min
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

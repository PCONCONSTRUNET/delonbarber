import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Crown } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { useMyPackages } from '@/hooks/useMyPackages';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { packages, getRemainingForService, getWeeklyLimitInfo } = useMyPackages();
  
  // Check if user has any active package
  const hasActivePackage = packages.some(p => p.status === 'active');
  
  // Get all service IDs that are included in the user's active packages benefits
  const userBenefitServiceIds = new Set<string>();
  packages.forEach(pkg => {
    if (pkg.status === 'active') {
      pkg.benefits.forEach(benefit => {
        userBenefitServiceIds.add(benefit.service_id);
      });
    }
  });
  
  // Filter services based on visibility rules:
  // - Regular services: show to everyone
  // - Subscribers_only services: show ONLY if user has an active package that includes this service as a benefit
  const visibleServices = services.filter(service => {
    if (service.subscribers_only) {
      // Only show exclusive services if user's package includes it as a benefit
      return userBenefitServiceIds.has(service.id);
    }
    return true;
  });

  const categories = [...new Set(visibleServices.map(s => s.category))]
    .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  const isSelected = (service: Service) => 
    selectedServices.some(s => s.id === service.id);

  // Check for sequential package
  const activeSequentialPackage = packages.find(p => p.status === 'active' && p.package.type === 'sequential');
  const activeCycle = activeSequentialPackage?.activeCycle || [];
  const activeCycleServiceIds = activeCycle.map(c => c.service_id);

  const handleToggleService = (service: Service) => {
    if (activeSequentialPackage && activeCycleServiceIds.length > 0) {
      if (activeCycleServiceIds.includes(service.id)) {
        // Can toggle (select/deselect) allowed services
        onToggleService(service);
        return;
      }
      // Block other services to avoid confusion
      return;
    }
    onToggleService(service);
  };

  // Auto-select cycle services on mount/load
  useEffect(() => {
    if (activeCycleServiceIds.length > 0) {
      activeCycleServiceIds.forEach(id => {
        const cycleService = services.find(s => s.id === id);
        if (cycleService && !isSelected(cycleService)) {
          onToggleService(cycleService);
        }
      });
    }
  }, [activeCycleServiceIds.join(','), services]);

  return (
    <div className="space-y-6">
      {activeSequentialPackage && activeCycle.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500 rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Crown className="w-5 h-5" />
            <span className="font-bold">Plano Sequencial Ativo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            O seu pacote tem uma sequência automática. Pelo seu histórico, {activeCycle.length > 1 ? 'os serviços desta semana são' : 'o serviço de hoje é'}:
          </p>
          <div className="space-y-2">
            {activeCycle.map(cycle => (
              <div key={cycle.id} className="bg-background rounded-xl p-3 flex items-center justify-between">
                <span className="font-bold">{cycle.service?.name}</span>
                <span className="text-sm text-muted-foreground">{cycle.service?.duration_minutes} min</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {categories.map((category, catIndex) => {
        // If sequential package is active, only show the category of the active cycle services
        if (activeSequentialPackage && activeCycleServiceIds.length > 0) {
          const categoryHasActiveService = activeCycleServiceIds.some(id => {
            const s = services.find(serv => serv.id === id);
            return s && s.category === category;
          });
          if (!categoryHasActiveService) return null;
        }

        return (
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
            {visibleServices
              .filter(s => s.category === category)
              .filter(s => {
                if (activeSequentialPackage && activeCycleServiceIds.length > 0) {
                  return activeCycleServiceIds.includes(s.id);
                }
                return true;
              })
              .sort((a, b) => {
                const aHasBenefit = getRemainingForService(a.id) > 0;
                const bHasBenefit = getRemainingForService(b.id) > 0;
                // VIP benefits first
                if (aHasBenefit && !bHasBenefit) return -1;
                if (!aHasBenefit && bHasBenefit) return 1;
                // Then by price (highest first for corte category)
                if (category === 'corte') return Number(b.price) - Number(a.price);
                return 0;
              })
              .map((service, index) => {
                const remaining = getRemainingForService(service.id);
                const hasBenefit = remaining > 0;
                const isExclusive = service.subscribers_only;
                const weeklyInfo = getWeeklyLimitInfo(service.id);
                // Show info badge about weekly limit if applicable (but don't block)
                const hasWeeklyLimit = weeklyInfo && weeklyInfo.limit > 0;

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: activeSequentialPackage ? 1 : 0.98 }}
                    onClick={() => handleToggleService(service)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-[0.98]",
                      isSelected(service)
                        ? hasBenefit || activeSequentialPackage
                          ? "bg-yellow-500/15 border-2 border-yellow-500"
                          : "bg-primary/15 border-2 border-primary"
                        : hasBenefit
                          ? "bg-yellow-500/5 border-2 border-yellow-500/30"
                          : "bg-card/80 border-2 border-transparent",
                      activeSequentialPackage && "cursor-default"
                    )}
                  >
                    {/* VIP/Exclusive Badges */}
                    {(hasBenefit || isExclusive || activeSequentialPackage) && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        {isExclusive && !hasBenefit && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Exclusivo
                          </Badge>
                        )}
                        {hasBenefit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] px-2 py-0">
                                <Crown className="w-3 h-3 mr-1" />
                                {remaining}x VIP
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Restam {remaining} {remaining === 1 ? 'uso' : 'usos'} VIP</p>
                              {hasWeeklyLimit && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ⏰ Limite: {weeklyInfo?.limit} por semana
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {activeSequentialPackage && !hasBenefit && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] px-2 py-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Ciclo Atual
                          </Badge>
                        )}
                      </div>
                    )}

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
                      {hasBenefit || activeSequentialPackage ? (
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground line-through">
                            R$ {Number(service.price).toFixed(0)}
                          </span>
                          <span className="text-yellow-500 font-bold text-sm block">
                            GRÁTIS
                          </span>
                        </div>
                      ) : (
                        <span className="text-primary font-bold text-sm">
                          R$ {Number(service.price).toFixed(0)}
                        </span>
                      )}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected(service)
                          ? hasBenefit || activeSequentialPackage
                            ? "bg-yellow-500 border-yellow-500"
                            : "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected(service) && (
                          <Check className="w-4 h-4 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}

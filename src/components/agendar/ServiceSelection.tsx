import { motion } from 'framer-motion';
import { Check, Clock, Crown, Lock, CalendarX } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';
import { useMyPackages } from '@/hooks/useMyPackages';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { nextMonday, differenceInDays, isMonday } from 'date-fns';

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
  const { packages, getRemainingForService, isBlockedByWeeklyLimit, getWeeklyLimitInfo } = useMyPackages();
  
  // Calculate days until next Monday (renewal day)
  const getDaysUntilRenewal = (): number => {
    const today = new Date();
    if (isMonday(today)) return 7; // If today is Monday, next renewal is in 7 days
    const next = nextMonday(today);
    return differenceInDays(next, today);
  };
  
  const daysUntilRenewal = getDaysUntilRenewal();
  
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

  const handleToggleService = (service: Service) => {
    // Block if weekly limit reached
    if (isBlockedByWeeklyLimit(service.id)) {
      return; // Don't allow selection
    }
    onToggleService(service);
  };

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
            {visibleServices
              .filter(s => s.category === category)
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
                const weeklyBlocked = isBlockedByWeeklyLimit(service.id);
                const weeklyInfo = getWeeklyLimitInfo(service.id);

                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: weeklyBlocked ? 1 : 0.98 }}
                    onClick={() => handleToggleService(service)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 relative",
                      weeklyBlocked
                        ? "bg-muted/50 border-2 border-muted cursor-not-allowed opacity-60"
                        : isSelected(service)
                          ? hasBenefit
                            ? "bg-yellow-500/15 border-2 border-yellow-500 cursor-pointer active:scale-[0.98]"
                            : "bg-primary/15 border-2 border-primary cursor-pointer active:scale-[0.98]"
                          : hasBenefit
                            ? "bg-yellow-500/5 border-2 border-yellow-500/30 cursor-pointer active:scale-[0.98]"
                            : "bg-card/80 border-2 border-transparent cursor-pointer active:scale-[0.98]"
                    )}
                  >
                    {/* VIP/Exclusive/Weekly Limit Badges */}
                    {(hasBenefit || isExclusive || weeklyBlocked) && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        {weeklyBlocked && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-orange-500/90 text-white text-[10px] px-2 py-0">
                                <CalendarX className="w-3 h-3 mr-1" />
                                Limite Semanal
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Você já usou {weeklyInfo?.used}/{weeklyInfo?.limit} esta semana</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                🔄 Renova em {daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia' : 'dias'} (segunda-feira)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!weeklyBlocked && isExclusive && !hasBenefit && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Exclusivo
                          </Badge>
                        )}
                        {!weeklyBlocked && hasBenefit && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] px-2 py-0">
                            <Crown className="w-3 h-3 mr-1" />
                            {remaining}x VIP
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
                      {hasBenefit ? (
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
                          ? hasBenefit
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
      ))}
    </div>
  );
}

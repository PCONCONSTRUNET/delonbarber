import { motion } from 'framer-motion';
import { Check, Crown, Scissors, User } from 'lucide-react';
import { Barber } from '@/hooks/useBarbers';
import { MyPackage } from '@/hooks/useMyPackages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BarberSelectionProps {
  barbers: Barber[];
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
  activePackages?: MyPackage[];
  title?: string;
  subtitle?: string;
}

export function BarberSelection({
  barbers,
  selectedBarber,
  onSelectBarber,
  activePackages = [],
  title = 'Escolha o profissional',
  subtitle = 'Selecione com quem deseja agendar seu horário',
}: BarberSelectionProps) {
  const vipBarberIds = new Set(
    activePackages
      .filter((p) => p.status === 'active' && p.barber_id)
      .map((p) => p.barber_id as string)
  );

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left px-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {barbers.length === 0 ? (
        <div className="bg-card/80 rounded-2xl p-8 text-center">
          <Scissors className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum barbeiro disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {barbers.map((barber, index) => {
            const isSelected = selectedBarber?.id === barber.id;
            const hasVipHere = vipBarberIds.has(barber.id);

            return (
              <motion.button
                key={barber.id}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectBarber(barber)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all relative border-2',
                  isSelected
                    ? hasVipHere
                      ? 'bg-yellow-500/15 border-yellow-500 shadow-lg shadow-yellow-500/10'
                      : 'bg-primary/15 border-primary shadow-lg shadow-primary/10'
                    : hasVipHere
                    ? 'bg-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/60'
                    : 'bg-card/80 border-transparent hover:border-border'
                )}
              >
                {hasVipHere && (
                  <Badge className="absolute -top-2.5 right-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] px-2 py-0.5 shadow">
                    <Crown className="w-3 h-3 mr-1" />
                    Seu Plano VIP
                  </Badge>
                )}

                <Avatar className="h-16 w-16 border-2 border-primary/40 shrink-0">
                  <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                    {barber.name ? barber.name.slice(0, 2).toUpperCase() : <User className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-base sm:text-lg text-foreground truncate">
                      {barber.name}
                    </h3>
                    {barber.is_owner && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                        Dono
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {barber.bio || (barber.is_owner ? 'Proprietário · Master Barber' : 'Barbeiro Profissional')}
                  </p>
                </div>

                <div
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected
                      ? hasVipHere
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'bg-primary border-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

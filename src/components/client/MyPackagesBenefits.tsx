import { Crown, Scissors, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMyPackages, MyPackage } from '@/hooks/useMyPackages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface MyPackagesBenefitsProps {
  compact?: boolean;
}

export function MyPackagesBenefits({ compact = false }: MyPackagesBenefitsProps) {
  const { packages, loading } = useMyPackages();

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-2xl"
        >
          👑
        </motion.span>
      </div>
    );
  }

  if (packages.length === 0) {
    return null;
  }

  if (compact) {
    return <CompactView packages={packages} />;
  }

  return <FullView packages={packages} />;
}

function CompactView({ packages }: { packages: MyPackage[] }) {
  // Show a summary of all available benefits
  const allBenefits = packages.flatMap(p => 
    p.benefits.filter(b => b.remaining > 0).map(b => ({
      ...b,
      packageName: p.package.name,
    }))
  );

  if (allBenefits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Benefits summary */}
      {packages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Seus Benefícios VIP</span>
            </div>
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
              Ativo
            </Badge>
          </div>
          
          {allBenefits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allBenefits.slice(0, 4).map((benefit) => (
                <Badge
                  key={benefit.id}
                  variant="secondary"
                  className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                >
                  {benefit.remaining}x {benefit.service.name}
                </Badge>
              ))}
              {allBenefits.length > 4 && (
                <Badge variant="secondary" className="bg-muted">
                  +{allBenefits.length - 4}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todos os benefícios foram utilizados
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

function FullView({ packages }: { packages: MyPackage[] }) {
  return (
    <div className="space-y-4">
      {packages.map((pkg) => {
        const endDate = new Date(pkg.end_date + 'T23:59:59');

        return (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl glass-effect border border-yellow-500/20"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{pkg.package.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Válido até {format(endDate, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                Ativo
              </Badge>
            </div>

            {/* Package validity info */}
            <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Validade do Pacote</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  até {format(endDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Benefits */}
            {pkg.benefits.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Seus Benefícios
                </p>
                {pkg.benefits.map((benefit) => {
                  const percentage = (benefit.used / benefit.quantity) * 100;
                  const isExhausted = benefit.remaining === 0;
                  const hasWeeklyLimit = benefit.weekly_limit !== null;
                  const weeklyBlocked = hasWeeklyLimit && benefit.remaining_this_week !== null && benefit.remaining_this_week <= 0 && benefit.remaining > 0;

                  return (
                    <div key={benefit.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-muted-foreground" />
                          <span className={isExhausted ? 'text-muted-foreground line-through' : ''}>
                            {benefit.service.name}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-sm font-medium ${
                            benefit.remaining > 0 ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {benefit.remaining} de {benefit.quantity} restantes
                          </span>
                          {hasWeeklyLimit && (
                            <span className={`text-xs ${
                              weeklyBlocked ? 'text-orange-500' : 'text-muted-foreground'
                            }`}>
                              📅 {benefit.remaining_this_week}/{benefit.weekly_limit} esta semana
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      {weeklyBlocked && (
                        <p className="text-xs text-orange-500 bg-orange-500/10 rounded-lg px-2 py-1 mt-1">
                          ⏳ Limite semanal atingido. Disponível novamente na próxima semana.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum benefício configurado para este pacote
              </p>
            )}

            {/* Discount badge */}
            {pkg.package.discount_percent > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
                  {pkg.package.discount_percent}% de desconto em todos os serviços
                </Badge>
              </div>
            )}

            {/* Renew Button */}
            <RenewButton />
          </motion.div>
        );
      })}
    </div>
  );
}

function RenewButton() {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 pt-4 border-t border-border"
    >
      <Button
        onClick={() => navigate('/pacotes')}
        className="w-full gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black"
      >
        <RefreshCw className="h-4 w-4" />
        Renovar Pacote VIP
      </Button>
    </motion.div>
  );
}

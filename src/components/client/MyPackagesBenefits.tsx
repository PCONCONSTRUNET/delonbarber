import { Crown, Scissors, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMyPackages, MyPackage } from '@/hooks/useMyPackages';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface MyPackagesBenefitsProps {
  compact?: boolean;
}

const EXPIRY_WARNING_DAYS = 7;

function getDaysUntilExpiry(endDate: string): number {
  return differenceInDays(new Date(endDate), new Date());
}

function getExpiryStatus(endDate: string): 'ok' | 'warning' | 'critical' {
  const days = getDaysUntilExpiry(endDate);
  if (days <= 3) return 'critical';
  if (days <= EXPIRY_WARNING_DAYS) return 'warning';
  return 'ok';
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
  // Check for expiring packages
  const expiringPackages = packages.filter(p => getDaysUntilExpiry(p.end_date) <= EXPIRY_WARNING_DAYS);
  
  // Show a summary of all available benefits
  const allBenefits = packages.flatMap(p => 
    p.benefits.filter(b => b.remaining > 0).map(b => ({
      ...b,
      packageName: p.package.name,
    }))
  );

  if (allBenefits.length === 0 && expiringPackages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Expiry Warning */}
      {expiringPackages.map(pkg => {
        const days = getDaysUntilExpiry(pkg.end_date);
        const status = getExpiryStatus(pkg.end_date);

        return (
          <motion.div
            key={`expiry-${pkg.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-3 rounded-2xl flex items-center gap-3 ${
              status === 'critical' 
                ? 'bg-destructive/10 border border-destructive/30' 
                : 'bg-orange-500/10 border border-orange-500/30'
            }`}
          >
            <div className={`p-2 rounded-xl ${
              status === 'critical' ? 'bg-destructive/20' : 'bg-orange-500/20'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                status === 'critical' ? 'text-destructive' : 'text-orange-500'
              }`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                status === 'critical' ? 'text-destructive' : 'text-orange-600'
              }`}>
                {days === 0 
                  ? 'Seu pacote expira hoje!' 
                  : days === 1 
                    ? 'Seu pacote expira amanhã!' 
                    : `Seu pacote expira em ${days} dias`}
              </p>
              <p className="text-xs text-muted-foreground">
                {pkg.package.name} • Renove para continuar usando
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* Benefits */}
      {allBenefits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Seus Benefícios VIP</span>
          </div>
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
        </motion.div>
      )}
    </div>
  );
}

function FullView({ packages }: { packages: MyPackage[] }) {
  return (
    <div className="space-y-4">
      {packages.map((pkg) => {
        const days = getDaysUntilExpiry(pkg.end_date);
        const status = getExpiryStatus(pkg.end_date);
        const isExpiring = status !== 'ok';

        return (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl glass-effect border ${
              status === 'critical' 
                ? 'border-destructive/50' 
                : status === 'warning' 
                  ? 'border-orange-500/50' 
                  : 'border-yellow-500/20'
            }`}
          >
            {/* Expiry Warning Banner */}
            {isExpiring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`-mx-5 -mt-5 mb-4 p-3 rounded-t-2xl flex items-center gap-3 ${
                  status === 'critical' 
                    ? 'bg-destructive/10' 
                    : 'bg-orange-500/10'
                }`}
              >
                <AlertTriangle className={`h-5 w-5 ${
                  status === 'critical' ? 'text-destructive' : 'text-orange-500'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    status === 'critical' ? 'text-destructive' : 'text-orange-600'
                  }`}>
                    {days === 0 
                      ? '⚠️ Expira hoje!' 
                      : days === 1 
                        ? '⚠️ Expira amanhã!' 
                        : `⚠️ Expira em ${days} dias`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use seus benefícios ou renove seu pacote
                  </p>
                </div>
                <Clock className={`h-4 w-4 ${
                  status === 'critical' ? 'text-destructive' : 'text-orange-500'
                }`} />
              </motion.div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  isExpiring 
                    ? status === 'critical' 
                      ? 'bg-destructive/20' 
                      : 'bg-orange-500/20'
                    : 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20'
                }`}>
                  <Crown className={`h-6 w-6 ${
                    isExpiring 
                      ? status === 'critical' 
                        ? 'text-destructive' 
                        : 'text-orange-500'
                      : 'text-yellow-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{pkg.package.name}</h3>
                  <div className={`flex items-center gap-2 text-sm ${
                    isExpiring 
                      ? status === 'critical' 
                        ? 'text-destructive' 
                        : 'text-orange-500'
                      : 'text-muted-foreground'
                  }`}>
                    <Calendar className="h-3 w-3" />
                    <span>
                      Válido até {format(new Date(pkg.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <Badge className={
                isExpiring 
                  ? status === 'critical'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : 'bg-orange-500/20 text-orange-500 border-orange-500/30'
                  : 'bg-green-500/20 text-green-500 border-green-500/30'
              }>
                {isExpiring 
                  ? days === 0 
                    ? 'Último dia!' 
                    : `${days} dias`
                  : 'Ativo'
                }
              </Badge>
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

                  return (
                    <div key={benefit.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-muted-foreground" />
                          <span className={isExhausted ? 'text-muted-foreground line-through' : ''}>
                            {benefit.service.name}
                          </span>
                        </div>
                        <span className={`text-sm font-medium ${
                          benefit.remaining > 0 ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {benefit.remaining} de {benefit.quantity} restantes
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
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
          </motion.div>
        );
      })}
    </div>
  );
}
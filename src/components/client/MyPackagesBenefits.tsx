import { Crown, Scissors, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMyPackages, MyPackage } from '@/hooks/useMyPackages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20"
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
  );
}

function FullView({ packages }: { packages: MyPackage[] }) {
  return (
    <div className="space-y-4">
      {packages.map((pkg) => (
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
                    Válido até {format(new Date(pkg.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              Ativo
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
      ))}
    </div>
  );
}
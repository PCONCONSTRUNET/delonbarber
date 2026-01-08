import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, ArrowLeft, Star, Clock, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';

interface PackageWithBenefits {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  benefits: string[] | null;
  is_active: boolean;
  packageBenefits: {
    service_id: string;
    quantity: number;
    service: {
      name: string;
      price: number;
    };
  }[];
}

const Pacotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<PackageWithBenefits[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/login');
      }
    });

    fetchPackages();
  }, [navigate]);

  async function fetchPackages() {
    setLoading(true);
    
    const { data: packagesData, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
      setLoading(false);
      return;
    }

    // Fetch benefits for each package
    const packagesWithBenefits: PackageWithBenefits[] = [];
    
    for (const pkg of packagesData || []) {
      const { data: benefitsData } = await supabase
        .from('package_benefits')
        .select('service_id, quantity, services(name, price)')
        .eq('package_id', pkg.id);

      packagesWithBenefits.push({
        ...pkg,
        packageBenefits: (benefitsData || []).map((b: any) => ({
          service_id: b.service_id,
          quantity: b.quantity,
          service: b.services,
        })),
      });
    }

    setPackages(packagesWithBenefits);
    setLoading(false);
  }

  const handleSubscribe = async (pkg: PackageWithBenefits) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setSubscribing(pkg.id);

    try {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), pkg.duration_days), 'yyyy-MM-dd');

      const { error } = await supabase.from('client_packages').insert({
        user_id: user.id,
        package_id: pkg.id,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      });

      if (error) {
        console.error('Error subscribing:', error);
        toast({
          title: "Erro",
          description: "Não foi possível realizar a assinatura. Tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Assinatura realizada! 🎉",
          description: `Você agora é assinante do pacote ${pkg.name}!`,
        });
        navigate('/cliente');
      }
    } finally {
      setSubscribing(null);
    }
  };

  const calculateTotalValue = (pkg: PackageWithBenefits) => {
    return pkg.packageBenefits.reduce((sum, b) => 
      sum + (b.service?.price || 0) * b.quantity, 0
    );
  };

  const calculateSavings = (pkg: PackageWithBenefits) => {
    const totalValue = calculateTotalValue(pkg);
    return totalValue - pkg.price;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <AnimatedBackground />
      
      <main className="pt-6 px-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cliente')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="font-display text-2xl font-bold text-foreground">
            👑 Pacotes VIP
          </h1>
          
          <div className="w-10" />
        </motion.div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <p className="text-muted-foreground">
            Assine e economize com nossos pacotes exclusivos
          </p>
        </motion.div>

        {/* No packages message */}
        {packages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum pacote disponível no momento
            </p>
          </motion.div>
        )}

        {/* Pacotes */}
        <div className="space-y-4">
          {packages.map((pkg, index) => {
            const totalValue = calculateTotalValue(pkg);
            const savings = calculateSavings(pkg);
            const isPopular = index === Math.floor(packages.length / 2); // Middle one is popular

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className={`p-6 rounded-2xl glass-effect relative ${
                  isPopular ? 'border-2 border-primary' : ''
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Mais Popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{pkg.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-bold text-primary">R$ {pkg.price}</span>
                      <span className="text-sm text-muted-foreground">/{pkg.duration_days} dias</span>
                    </div>
                    {totalValue > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        Valor: R$ {totalValue.toFixed(0)}
                      </p>
                    )}
                    {savings > 0 && (
                      <Badge className="mt-1 bg-green-500/20 text-green-500">
                        Economia de R$ {savings.toFixed(0)}
                      </Badge>
                    )}
                  </div>
                  <Crown className={`h-8 w-8 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                )}

                {/* Benefits from package_benefits */}
                {pkg.packageBenefits.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Serviços incluídos:
                    </p>
                    <ul className="space-y-2">
                      {pkg.packageBenefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{benefit.quantity}x {benefit.service?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (R$ {(benefit.service?.price || 0) * benefit.quantity})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Text benefits */}
                {pkg.benefits && pkg.benefits.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {pkg.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Duration info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="h-3 w-3" />
                  <span>Válido por {pkg.duration_days} dias</span>
                  {pkg.discount_percent > 0 && (
                    <>
                      <span>•</span>
                      <span>{pkg.discount_percent}% de desconto</span>
                    </>
                  )}
                </div>

                <Button
                  onClick={() => handleSubscribe(pkg)}
                  className={`w-full ${isPopular ? 'glow-effect' : ''}`}
                  variant={isPopular ? 'default' : 'outline'}
                  disabled={subscribing === pkg.id}
                >
                  {subscribing === pkg.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Assinar Pacote'
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Cancele a qualquer momento. Sem fidelidade.
        </motion.p>
      </main>
    </div>
  );
};

export default Pacotes;

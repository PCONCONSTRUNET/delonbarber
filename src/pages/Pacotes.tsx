import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, ArrowLeft, Star, Clock, Loader2, Gift, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    package: PackageWithBenefits | null;
  }>({ open: false, package: null });
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    package: PackageWithBenefits | null;
    subscriptionId: string | null;
  }>({ open: false, package: null, subscriptionId: null });

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

  const handleSubscribeClick = (pkg: PackageWithBenefits) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Show confirmation dialog
    setConfirmDialog({ open: true, package: pkg });
  };

  const handleConfirmSubscribe = async () => {
    const pkg = confirmDialog.package;
    if (!pkg || !user) return;

    setConfirmDialog({ open: false, package: null });
    setSubscribing(pkg.id);

    try {
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), pkg.duration_days), 'yyyy-MM-dd');

      const { error } = await supabase.from('client_packages').insert({
        user_id: user.id,
        package_id: pkg.id,
        start_date: startDate,
        end_date: endDate,
        status: 'active', // Auto-activate subscription
      });

      if (error) {
        console.error('Error subscribing:', error);
        toast({
          title: "Erro",
          description: "Não foi possível realizar a assinatura. Tente novamente.",
          variant: "destructive",
        });
      } else {
        // Show success modal
        setPaymentModal({
          open: true,
          package: pkg,
          subscriptionId: null,
        });
      }
    } finally {
      setSubscribing(null);
    }
  };

  const handleClosePayment = () => {
    setPaymentModal({ open: false, package: null, subscriptionId: null });
    navigate('/cliente');
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
    <div className="min-h-screen bg-background pb-8 overflow-x-hidden">
      <AnimatedBackground />
      
      <main className="pt-4 sm:pt-6 px-3 sm:px-4 max-w-lg mx-auto safe-area-top">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 sm:mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cliente')}
            className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            👑 Pacotes VIP
          </h1>
          
          <div className="w-9 sm:w-10" />
        </motion.div>

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6 sm:mb-8"
        >
          <p className="text-muted-foreground text-sm sm:text-base">
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
        <div className="space-y-3 sm:space-y-4">
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
                whileHover={{ scale: 1.02, y: -4 }}
                className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl glass-effect relative overflow-hidden group ${
                  isPopular ? 'border-2 border-primary' : ''
                }`}
              >
                {/* Reflective red glow effect - top */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Reflective red glow effect - bottom right */}
                <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-primary/15 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                
                {/* Moving shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12 group-hover:animate-shine" />
                </div>
                
                {/* Subtle red border glow on hover */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: '0 0 30px hsl(4 77% 50% / 0.3), inset 0 0 20px hsl(4 77% 50% / 0.05)' }}
                />
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Mais Popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 sm:mb-4 relative z-10">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-semibold">{pkg.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <motion.span 
                        className="text-2xl sm:text-3xl font-bold text-primary"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 + index * 0.1 }}
                      >
                        R$ {pkg.price}
                      </motion.span>
                      <span className="text-xs sm:text-sm text-muted-foreground">/{pkg.duration_days} dias</span>
                    </div>
                    {totalValue > 0 && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-through">
                        Valor: R$ {totalValue.toFixed(0)}
                      </p>
                    )}
                    {savings > 0 && (
                      <Badge className="mt-1 bg-green-500/20 text-green-500 text-[10px] sm:text-xs">
                        Economia de R$ {savings.toFixed(0)}
                      </Badge>
                    )}
                  </div>
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Crown className={`h-6 w-6 sm:h-8 sm:w-8 ${isPopular ? 'text-primary drop-shadow-[0_0_8px_hsl(4,77%,50%)]' : 'text-muted-foreground'}`} />
                  </motion.div>
                </div>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-4 relative z-10">{pkg.description}</p>
                )}

                {/* Benefits from package_benefits */}
                {pkg.packageBenefits.length > 0 && (
                  <div className="mb-4 relative z-10">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Serviços incluídos:
                    </p>
                    <ul className="space-y-2">
                      {pkg.packageBenefits.map((benefit, i) => (
                        <motion.li 
                          key={i} 
                          className="flex items-center gap-2 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 + i * 0.05 }}
                        >
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{benefit.quantity}x {benefit.service?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (R$ {(benefit.service?.price || 0) * benefit.quantity})
                          </span>
                        </motion.li>
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
                  onClick={() => handleSubscribeClick(pkg)}
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

      {/* Success Modal - No QR Code */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => !open && handleClosePayment()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-primary/10 p-6 sm:p-8 text-center flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl font-bold text-foreground"
            >
              Assinatura Ativada! 🎉
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mt-2 text-sm sm:text-base"
            >
              Pacote {paymentModal.package?.name}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-2xl sm:text-3xl font-bold text-primary mt-2"
            >
              R$ {paymentModal.package?.price}
            </motion.p>
          </div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 sm:p-6 text-center"
          >
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                Sua assinatura VIP foi ativada com sucesso!
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Você já pode aproveitar todos os benefícios do seu pacote.
              </p>
            </div>
          </motion.div>

          {/* Button */}
          <div className="p-4 sm:p-6 pt-0 flex-shrink-0">
            <Button
              onClick={handleClosePayment}
              className="w-full h-11 sm:h-12"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, package: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Assinatura</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a assinar o pacote:</p>
              <p className="font-semibold text-foreground text-lg">
                {confirmDialog.package?.name} - R$ {confirmDialog.package?.price}
              </p>
              <p>Válido por {confirmDialog.package?.duration_days} dias.</p>
              <p className="text-xs mt-2">Deseja confirmar esta assinatura?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubscribe}>
              Confirmar Assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pacotes;

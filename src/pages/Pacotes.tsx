import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, ArrowLeft, Star, Clock, Loader2, Gift, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { PixQRCode } from '@/components/payments/PixQRCode';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
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
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    package: PackageWithBenefits | null;
    subscriptionId: string | null;
  }>({ open: false, package: null, subscriptionId: null });

  const WHATSAPP_NUMBER = '5548999520220';

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

      const { data, error } = await supabase.from('client_packages').insert({
        user_id: user.id,
        package_id: pkg.id,
        start_date: startDate,
        end_date: endDate,
        status: 'pending', // Status pending until payment confirmed
      }).select().single();

      if (error) {
        console.error('Error subscribing:', error);
        toast({
          title: "Erro",
          description: "Não foi possível realizar a assinatura. Tente novamente.",
          variant: "destructive",
        });
      } else {
        // Open payment modal with QR code
        setPaymentModal({
          open: true,
          package: pkg,
          subscriptionId: data?.id || null,
        });
      }
    } finally {
      setSubscribing(null);
    }
  };

  const handleWhatsAppClick = () => {
    const pkg = paymentModal.package;
    if (!pkg) return;

    const message = `Olá! 👋

Acabei de assinar o pacote *${pkg.name}* no valor de *R$ ${pkg.price}*.

Segue o comprovante de pagamento: 📎

Aguardo a confirmação! 🙏`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClosePayment = () => {
    setPaymentModal({ open: false, package: null, subscriptionId: null });
    toast({
      title: "Assinatura registrada! 📝",
      description: "Após confirmar o pagamento, seu pacote será ativado.",
    });
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
                className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl glass-effect relative ${
                  isPopular ? 'border-2 border-primary' : ''
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Mais Popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-semibold">{pkg.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-bold text-primary">R$ {pkg.price}</span>
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
                  <Crown className={`h-6 w-6 sm:h-8 sm:w-8 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
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

      {/* Payment Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => !open && handleClosePayment()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-primary/10 p-4 sm:p-6 text-center border-b border-border flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Crown className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl font-bold text-foreground"
            >
              Pacote {paymentModal.package?.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-primary mt-2"
            >
              R$ {paymentModal.package?.price}
            </motion.p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Warning */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 sm:p-4 bg-yellow-500/10 border-b border-border"
            >
              <p className="text-center text-xs sm:text-sm font-medium text-yellow-600">
                ⚠️ Pague o valor total via PIX e envie o comprovante no WhatsApp para ativar seu pacote
              </p>
            </motion.div>

            {/* PIX QR Code */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 sm:p-6"
            >
              {paymentModal.package && (
                <PixQRCode
                  amount={paymentModal.package.price}
                  transactionId={paymentModal.subscriptionId || paymentModal.package.id}
                />
              )}
            </motion.div>
          </div>

          {/* WhatsApp Button */}
          <div className="p-3 sm:p-4 border-t border-border bg-muted/30 space-y-2 sm:space-y-3 flex-shrink-0">
            <Button
              onClick={handleWhatsAppClick}
              className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 gap-2"
            >
              <WhatsAppIcon size={20} />
              Enviar Comprovante no WhatsApp
            </Button>
            
            <Button
              onClick={handleClosePayment}
              variant="outline"
              className="w-full h-10"
            >
              Fechar
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Seu pacote será ativado após a confirmação do pagamento
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pacotes;

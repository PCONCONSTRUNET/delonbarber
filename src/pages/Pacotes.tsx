import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Check, ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const pacotes = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: 99,
    originalPrice: 140,
    period: '/mês',
    features: [
      '4 cortes por mês',
      '2 barbas por mês',
      'Agendamento prioritário',
      '10% off em produtos',
    ],
    popular: false,
  },
  {
    id: 'trimestral',
    name: 'Trimestral',
    price: 249,
    originalPrice: 420,
    period: '/3 meses',
    features: [
      '12 cortes no período',
      '6 barbas no período',
      'Agendamento prioritário',
      '15% off em produtos',
      '1 tratamento VIP grátis',
    ],
    popular: true,
  },
  {
    id: 'anual',
    name: 'Anual',
    price: 899,
    originalPrice: 1680,
    period: '/ano',
    features: [
      'Cortes ilimitados',
      'Barbas ilimitadas',
      'Agendamento VIP',
      '20% off em produtos',
      '4 tratamentos VIP grátis',
      'Acesso a eventos exclusivos',
    ],
    popular: false,
  },
];

const Pacotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleSelectPacote = (pacoteId: string) => {
    toast({
      title: "Em breve!",
      description: "Os pacotes premium estarão disponíveis em breve. Fique ligado!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        {/* Pacotes */}
        <div className="space-y-4">
          {pacotes.map((pacote, index) => (
            <motion.div
              key={pacote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`p-6 rounded-2xl glass-effect relative ${
                pacote.popular ? 'border-2 border-primary' : ''
              }`}
            >
              {/* Popular badge */}
              {pacote.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Mais Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display text-xl font-semibold">{pacote.name}</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-primary">R$ {pacote.price}</span>
                    <span className="text-sm text-muted-foreground">{pacote.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-through">
                    De R$ {pacote.originalPrice}
                  </p>
                </div>
                <Crown className={`h-8 w-8 ${pacote.popular ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>

              <ul className="space-y-2 mb-6">
                {pacote.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelectPacote(pacote.id)}
                className={`w-full ${pacote.popular ? 'glow-effect' : ''}`}
                variant={pacote.popular ? 'default' : 'outline'}
              >
                Assinar Pacote
              </Button>
            </motion.div>
          ))}
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

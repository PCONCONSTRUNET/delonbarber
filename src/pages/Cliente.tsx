import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Crown, User, LogOut, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { MyPackagesBenefits } from '@/components/client/MyPackagesBenefits';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useAdminNotifications } from '@/hooks/useNotifications';

const Cliente = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { isAdmin } = useIsAdmin();

  // Subscribe to admin notifications if admin
  useAdminNotifications({
    enabled: isAdmin,
    onNewAppointment: () => {
      setPendingCount(prev => prev + 1);
    }
  });

  // Fetch pending appointments count for admin badge
  useEffect(() => {
    if (!isAdmin) return;

    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setPendingCount(count || 0);
    };

    fetchPendingCount();
  }, [isAdmin]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      <main className="pt-8 pb-16 px-4 max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="font-display text-2xl font-bold text-foreground">
            ✂️ Barbearia
          </h1>
          
          <div className="flex gap-1">
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="rounded-full text-primary gap-1 px-2 relative"
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs font-semibold">ADMIN</span>
                <AnimatePresence>
                  {pendingCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full"
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/perfil')}
              className="rounded-full"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-muted-foreground"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-3xl font-bold mb-2">
            Olá, <span className="text-gradient">Cliente</span>!
          </h2>
          <p className="text-muted-foreground">
            O que você gostaria de fazer hoje?
          </p>
        </motion.div>

        {/* Options */}
        <div className="space-y-4">
          {/* Agendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/agendar')}
            className="p-6 rounded-2xl glass-effect cursor-pointer hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-semibold mb-1">
                  Agendar Horário
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha seus serviços e marque seu horário
                </p>
              </div>
            </div>
          </motion.div>

          {/* Pacote Premium */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/pacotes')}
            className="p-6 rounded-2xl glass-effect cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
          >
            {/* Premium badge */}
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold">
              VIP
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 group-hover:from-yellow-500/30 group-hover:to-amber-500/30 transition-colors">
                <Crown className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-semibold mb-1">
                  Pacotes Premium
                </h3>
                <p className="text-sm text-muted-foreground">
                  Assine e ganhe descontos exclusivos
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* My Package Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <MyPackagesBenefits />
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-2xl glass-effect"
        >
          <p className="text-center text-sm text-muted-foreground">
            📍 Terça a Sexta: 08:00 - 15:00 | Sábado: 07:30 - 18:00
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Cliente;

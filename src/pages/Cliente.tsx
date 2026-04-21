import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Crown, User, LogOut, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { MyPackagesBenefits } from '@/components/client/MyPackagesBenefits';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useAdminNotifications } from '@/hooks/useNotifications';
import { useMyPackages } from '@/hooks/useMyPackages';
import { Badge } from '@/components/ui/badge';


const Cliente = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { isAdmin } = useIsAdmin();
  const { packages } = useMyPackages();
  
  // Check if user has any active VIP package
  const hasActiveVIP = packages.some(p => p.status === 'active');

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
    let mounted = true;

    // Set up listener FIRST to catch token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AnimatedBackground />
      
      <main className="pt-16 pb-20 px-4 max-w-lg mx-auto safe-area-top safe-area-bottom">
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
          className="text-center mb-8"
        >
          {/* VIP Active Badge */}
          <AnimatePresence>
            {hasActiveVIP && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center mb-3"
              >
                <Badge className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black px-4 py-1.5 text-sm font-bold shadow-lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  VIP ATIVO
                  <Crown className="w-4 h-4 ml-2" />
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Olá, <span className="text-gradient">Cliente</span>!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            O que você gostaria de fazer hoje?
          </p>
        </motion.div>

        {/* Options */}
        <div className="space-y-3 sm:space-y-4">
          {/* Agendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/agendar')}
            className="p-4 sm:p-6 rounded-2xl glass-effect cursor-pointer hover:border-primary/50 transition-all group active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg sm:text-xl font-semibold mb-0.5 sm:mb-1">
                  Agendar Horário
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
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
            className="p-4 sm:p-6 rounded-2xl glass-effect cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden active:scale-[0.98]"
          >
            {/* Premium badge */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[10px] sm:text-xs font-bold">
              VIP
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 group-hover:from-yellow-500/30 group-hover:to-amber-500/30 transition-colors">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg sm:text-xl font-semibold mb-0.5 sm:mb-1">
                  Pacotes Premium
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
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

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getBarberBasePath } from '@/hooks/useBarbers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { barberSupabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BarberLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const basePath = getBarberBasePath(pathname);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Resolve o registro de barbeiro apenas na sessão isolada de barbeiro (/barber* ou /barbeiro*).
  // Se o user_id ainda estiver pendente mas o e-mail estiver cadastrado em barbers, vincula automaticamente.
  const resolveBarberForUser = async (userId: string) => {
    const { data: directBarber, error: directErr } = await barberSupabase
      .from('barbers')
      .select('id, name, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (directBarber || directErr) {
      return { barber: directBarber, error: directErr };
    }

    const { data: claimedRows, error: claimErr } = await barberSupabase.rpc('claim_my_barber_account');
    const claimed = !claimErr && Array.isArray(claimedRows) && claimedRows.length > 0
      ? claimedRows[0]
      : null;

    return { barber: claimed, error: null };
  };

  // Se já estiver logado na sessão isolada de barbeiro, vai direto para o painel
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data: { session } } = await barberSupabase.auth.getSession();
      if (!mounted || !session?.user) return;

      const { barber } = await resolveBarberForUser(session.user.id);
      if (mounted && barber?.is_active) {
        navigate(basePath, { replace: true });
      }
    };
    checkSession();
    return () => { mounted = false; };
  }, [navigate, basePath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await barberSupabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          toast.error('E-mail ainda não confirmado. Peça ao administrador para configurar/reconfirmar o acesso em Admin > Barbeiros.');
        } else {
          toast.error('E-mail ou senha inválidos.');
        }
        setIsLoading(false);
        return;
      }

      const { barber, error: barberErr } = await resolveBarberForUser(data.user.id);

      if (barberErr) {
        await barberSupabase.auth.signOut();
        toast.error('Erro ao validar conta de barbeiro. Tente novamente.');
        setIsLoading(false);
        return;
      }

      if (!barber) {
        await barberSupabase.auth.signOut();
        toast.error('Esta conta não está vinculada a nenhum barbeiro. Peça ao administrador para vincular este e-mail em Admin > Barbeiros.');
        setIsLoading(false);
        return;
      }

      if (!barber.is_active) {
        await barberSupabase.auth.signOut();
        toast.error('Este cadastro de barbeiro está desativado no momento.');
        setIsLoading(false);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['barber', 'me'] });
      toast.success(`Bem-vindo, ${barber.name}!`);
      setIsLoading(false);
      navigate(basePath, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao entrar');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-primary/20 shadow-2xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-3 text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scissors className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Painel do Barbeiro</CardTitle>
            <CardDescription>Acesso exclusivo à sua agenda e financeiro</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barber-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="barber-email"
                    type="email"
                    placeholder="barbeiro@delonbarber.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barber-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="barber-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl font-semibold active:scale-[0.98] transition-transform"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar na minha agenda'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="w-full text-xs text-muted-foreground gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para área do cliente
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BarberLogin;

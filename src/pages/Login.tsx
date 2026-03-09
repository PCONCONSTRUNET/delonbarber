import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import barberPhoto from "@/assets/barber-photo.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "signup" ? "signup" : "login");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/cliente");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/cliente");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse({
      name: signupName,
      phone: signupPhone,
      email: signupEmail,
      password: signupPassword,
    });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: signupName,
        },
      },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ phone: signupPhone }).eq("user_id", user.id);
    }

    toast.success("Conta criada com sucesso!");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <AnimatedBackground />
      
      <main className="pt-24 pb-24 flex items-center justify-center min-h-screen">
        <div className="container px-4">
          <motion.div 
            className="max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Circular Photo with Ring */}
            <motion.div 
              className="flex justify-center mb-8"
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1
              }}
            >
              <div className="relative">
                {/* Outer glow ring */}
                <motion.div 
                  className="absolute -inset-4 rounded-full bg-gradient-to-br from-primary via-primary/30 to-transparent blur-2xl"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.7, 0.4],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                
                {/* Inner pulsing glow */}
                <motion.div 
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-xl"
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Photo container with floating effect */}
                <motion.div 
                  className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-br from-primary via-primary/80 to-primary/50"
                  animate={{ 
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  whileHover={{ 
                    scale: 1.08,
                    transition: { duration: 0.3 }
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-background shadow-2xl">
                    <img 
                      src={barberPhoto} 
                      alt="Barbearia Alan Delon" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Logo */}
            <motion.div 
              className="flex items-center justify-center gap-3 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ rotate: 45, scale: 1.1 }}
              >
                <Scissors className="h-8 w-8 text-primary drop-shadow-lg" />
              </motion.div>
              <motion.span 
                className="font-display text-xl font-semibold tracking-wider"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                ALAN DELON
              </motion.span>
            </motion.div>

            {/* Card with enhanced animations */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.7, 
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <Card className="glass-effect border-border overflow-hidden shadow-2xl shadow-primary/10 rounded-2xl">
                {/* Animated border gradient */}
                <motion.div 
                  className="absolute inset-0 rounded-lg opacity-50 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)",
                    backgroundSize: "200% 100%",
                  }}
                  animate={{
                    backgroundPosition: ["200% 0", "-200% 0"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                
                <CardHeader className="text-center pt-8 pb-4 relative">
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <CardTitle className="font-display text-2xl mb-2">Bem-vindo</CardTitle>
                    <CardDescription className="text-base">
                      Entre ou crie sua conta para agendar
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                
                <CardContent className="relative pb-8">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                    >
                      <TabsList className="grid w-full grid-cols-2 mb-6 p-1 rounded-2xl">
                        <TabsTrigger 
                          value="login" 
                          className="transition-all duration-500 data-[state=active]:shadow-lg"
                        >
                          Entrar
                        </TabsTrigger>
                        <TabsTrigger 
                          value="signup" 
                          className="transition-all duration-500 data-[state=active]:shadow-lg"
                        >
                          Criar Conta
                        </TabsTrigger>
                      </TabsList>
                    </motion.div>

                    <div className="min-h-[320px]">
                      {/* Login Tab */}
                      <TabsContent value="login">
                        <motion.form 
                          onSubmit={handleLogin} 
                          className="space-y-5"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="space-y-2">
                            <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-email"
                                type="email"
                                placeholder="seu@email.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="pl-10 h-12 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-password"
                                type="password"
                                placeholder="••••••••"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="pl-10 h-12 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button 
                              type="submit" 
                                className="w-full h-12 text-base font-semibold rounded-2xl shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40" 
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                "Entrar"
                              )}
                            </Button>
                          </motion.div>
                        </motion.form>
                      </TabsContent>

                      {/* Signup Tab */}
                      <TabsContent value="signup">
                        <motion.form 
                          onSubmit={handleSignup} 
                          className="space-y-4"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="space-y-2">
                            <Label htmlFor="signup-name" className="text-sm font-medium">Nome</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-name"
                                type="text"
                                placeholder="Seu nome"
                                value={signupName}
                                onChange={(e) => setSignupName(e.target.value)}
                                className="pl-10 h-11 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signup-phone" className="text-sm font-medium">Telefone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-phone"
                                type="tel"
                                placeholder="(48) 99999-9999"
                                value={signupPhone}
                                onChange={(e) => setSignupPhone(e.target.value)}
                                className="pl-10 h-11 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-email"
                                type="email"
                                placeholder="seu@email.com"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                className="pl-10 h-11 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-password"
                                type="password"
                                placeholder="••••••••"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                className="pl-10 h-11 rounded-2xl transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 focus:border-primary"
                                required
                              />
                            </div>
                          </div>
                          
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button 
                              type="submit" 
                              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40" 
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                "Criar Conta"
                              )}
                            </Button>
                          </motion.div>
                        </motion.form>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Login;

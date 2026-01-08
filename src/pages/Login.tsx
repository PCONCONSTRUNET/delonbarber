import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
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
import { motion, AnimatePresence, type Easing } from "framer-motion";
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

const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOut,
    },
  },
};

const photoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easeOut,
    },
  },
};

const formVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.2,
    },
  },
};

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
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
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
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

    // Update profile with phone
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ phone: signupPhone }).eq("user_id", user.id);
    }

    toast.success("Conta criada com sucesso!");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      <Navbar />
      
      <main className="pt-24 pb-24 flex items-center justify-center min-h-screen">
        <div className="container px-4">
          <motion.div 
            className="max-w-md mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Circular Photo with Ring */}
            <motion.div 
              className="flex justify-center mb-6"
              variants={photoVariants}
            >
              <div className="relative">
                <motion.div 
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/50 to-primary/20 blur-xl opacity-60"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div 
                  className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-primary to-primary/50"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-background">
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
              className="flex items-center justify-center gap-3 mb-6"
              variants={itemVariants}
            >
              <motion.div
                whileHover={{ rotate: 45 }}
                transition={{ duration: 0.3 }}
              >
                <Scissors className="h-8 w-8 text-primary" />
              </motion.div>
              <span className="font-display text-xl font-semibold tracking-wider">
                ALAN DELON
              </span>
            </motion.div>

            <motion.div variants={cardVariants}>
              <Card className="glass-effect border-border overflow-hidden">
                <CardHeader className="text-center pt-6 pb-4">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <CardTitle className="font-display text-2xl">Bem-vindo</CardTitle>
                    <CardDescription>
                      Entre ou crie sua conta para agendar
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="login" className="transition-all duration-300">
                        Entrar
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="transition-all duration-300">
                        Criar Conta
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      {/* Login Tab */}
                      {activeTab === "login" && (
                        <TabsContent value="login" forceMount>
                          <motion.form 
                            onSubmit={handleLogin} 
                            className="space-y-4"
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0 }}
                            >
                              <Label htmlFor="login-email">Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="login-email"
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={loginEmail}
                                  onChange={(e) => setLoginEmail(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            >
                              <Label htmlFor="login-password">Senha</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="login-password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={loginPassword}
                                  onChange={(e) => setLoginPassword(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                            >
                              <Button 
                                type="submit" 
                                className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Entrar"
                                )}
                              </Button>
                            </motion.div>
                          </motion.form>
                        </TabsContent>
                      )}

                      {/* Signup Tab */}
                      {activeTab === "signup" && (
                        <TabsContent value="signup" forceMount>
                          <motion.form 
                            onSubmit={handleSignup} 
                            className="space-y-4"
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0 }}
                            >
                              <Label htmlFor="signup-name">Nome</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="signup-name"
                                  type="text"
                                  placeholder="Seu nome"
                                  value={signupName}
                                  onChange={(e) => setSignupName(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            >
                              <Label htmlFor="signup-phone">Telefone</Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="signup-phone"
                                  type="tel"
                                  placeholder="(11) 99999-9999"
                                  value={signupPhone}
                                  onChange={(e) => setSignupPhone(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                            >
                              <Label htmlFor="signup-email">Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="signup-email"
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={signupEmail}
                                  onChange={(e) => setSignupEmail(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div 
                              className="space-y-2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.3 }}
                            >
                              <Label htmlFor="signup-password">Senha</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="signup-password"
                                  type="password"
                                  placeholder="••••••••"
                                  value={signupPassword}
                                  onChange={(e) => setSignupPassword(e.target.value)}
                                  className="pl-10 transition-all duration-300 focus:scale-[1.02]"
                                  required
                                />
                              </div>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                            >
                              <Button 
                                type="submit" 
                                className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]" 
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Criar Conta"
                                )}
                              </Button>
                            </motion.div>
                          </motion.form>
                        </TabsContent>
                      )}
                    </AnimatePresence>
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

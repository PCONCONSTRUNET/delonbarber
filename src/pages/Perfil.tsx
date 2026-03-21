import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Mail, Camera, Loader2, Save, Bell, Calendar, Clock, ArrowLeft, Gift, DollarSign, Star, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClientNotifications } from "@/hooks/useNotifications";
import { NotificationHistory } from "@/components/client/NotificationHistory";
import { MyLoyaltyProgress } from "@/components/client/MyLoyaltyProgress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  total_price: number;
}

interface ClientStats {
  totalVisits: number;
  totalSpent: number;
  completedVisits: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-500' },
  no_show: { label: 'Falta', color: 'bg-orange-500/20 text-orange-500' },
  completed: { label: 'Concluído', color: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-500' },
};

const Perfil = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [stats, setStats] = useState<ClientStats>({ totalVisits: 0, totalSpent: 0, completedVisits: 0 });
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { subscribeToAppointments } = useClientNotifications();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email || "");
      
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        setName(profile.name || "");
        setPhone(profile.phone || "");
        setAvatarUrl(profile.avatar_url);
      }

      // Fetch all appointments for stats
      const { data: allAppts } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, payment_status, total_price")
        .eq("user_id", session.user.id)
        .order("appointment_date", { ascending: false });

      const appts = allAppts || [];
      setAppointments(appts.slice(0, 5)); // Últimos 5 para exibição
      
      // Calculate stats
      const completedAppts = appts.filter(a => a.status === 'completed');
      const totalSpent = completedAppts.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);
      
      setStats({
        totalVisits: appts.length,
        completedVisits: completedAppts.length,
        totalSpent,
      });
      
      setLoadingAppointments(false);
    };

    checkAuth();
  }, [navigate]);

  // Subscribe to real-time appointment updates
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = subscribeToAppointments(userId);
    return unsubscribe;
  }, [userId, subscribeToAppointments]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não encontrado");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ name, phone })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
    
    setIsSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não encontrado");
      setIsLoading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao fazer upload da foto");
      setIsLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    setAvatarUrl(publicUrl);
    toast.success("Foto atualizada!");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AnimatedBackground />
      
      <main className="pt-6 pb-24 safe-area-top">
        <div className="container mx-auto px-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 max-w-lg mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Meu <span className="text-gradient">Perfil</span>
            </h1>
            <div className="w-10" />
          </div>
          
          <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">

            {/* Profile Card with Avatar */}
            <Card className="glass-effect border-border">
              <CardHeader className="text-center pb-2">
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-primary/50">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                        {name ? name.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 text-primary-foreground" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload}
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                </div>
                <CardTitle className="font-display text-xl">{name || "Seu Nome"}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="pl-10 opacity-60"
                    />
                  </div>
                </div>

                <Button 
                  className="w-full gap-2 mt-6" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 xs:gap-3">
              <Card className="glass-effect border-border">
                <CardContent className="p-2.5 xs:p-3 sm:p-4 text-center">
                  <div className="p-1.5 xs:p-2 rounded-full bg-primary/10 w-fit mx-auto mb-1.5 xs:mb-2">
                    <Calendar className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
                  </div>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold">{stats.completedVisits}</p>
                  <p className="text-[10px] xs:text-xs text-muted-foreground">Visitas</p>
                </CardContent>
              </Card>
              
              <Card className="glass-effect border-border">
                <CardContent className="p-2.5 xs:p-3 sm:p-4 text-center">
                  <div className="p-1.5 xs:p-2 rounded-full bg-green-500/10 w-fit mx-auto mb-1.5 xs:mb-2">
                    <DollarSign className="h-4 w-4 xs:h-5 xs:w-5 text-green-500" />
                  </div>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold">R${stats.totalSpent.toFixed(0)}</p>
                  <p className="text-[10px] xs:text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              
              <Card className="glass-effect border-border">
                <CardContent className="p-2.5 xs:p-3 sm:p-4 text-center">
                  <div className="p-1.5 xs:p-2 rounded-full bg-amber-500/10 w-fit mx-auto mb-1.5 xs:mb-2">
                    <Star className="h-4 w-4 xs:h-5 xs:w-5 text-amber-500" />
                  </div>
                  <p className="text-lg xs:text-xl sm:text-2xl font-bold">{stats.totalVisits}</p>
                  <p className="text-[10px] xs:text-xs text-muted-foreground">Agend.</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="fidelidade" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-10 xs:h-11 p-1">
                <TabsTrigger value="fidelidade" className="text-[10px] xs:text-xs flex items-center gap-0.5 xs:gap-1 px-1 xs:px-2">
                  <Gift className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                  <span className="truncate">Fidelidade</span>
                </TabsTrigger>
                <TabsTrigger value="agendamentos" className="text-[10px] xs:text-xs flex items-center gap-0.5 xs:gap-1 px-1 xs:px-2">
                  <Calendar className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                  <span className="truncate">Histórico</span>
                </TabsTrigger>
                <TabsTrigger value="notificacoes" className="text-[10px] xs:text-xs flex items-center gap-0.5 xs:gap-1 px-1 xs:px-2">
                  <Bell className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                  <span className="truncate">Avisos</span>
                </TabsTrigger>
              </TabsList>

              {/* Fidelidade Tab */}
              <TabsContent value="fidelidade" className="mt-4">
                <MyLoyaltyProgress />
              </TabsContent>

              {/* Agendamentos Tab */}
              <TabsContent value="agendamentos" className="mt-4">
                <Card className="glass-effect border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Meus Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAppointments ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : appointments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum agendamento encontrado
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {appointments.map((apt) => {
                          const config = statusConfig[apt.status] || statusConfig.pending;
                          return (
                            <div 
                              key={apt.id} 
                              className="p-3 rounded-lg bg-muted/50 border border-border"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span>
                                    {format(new Date(apt.appointment_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                  <span>{apt.appointment_time.slice(0, 5)}</span>
                                </div>
                                <Badge className={config.color}>
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  R$ {Number(apt.total_price).toFixed(0)}
                                </span>
                                <span className={apt.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}>
                                  {apt.payment_status === 'paid' ? '✓ Pago' : 'Aguardando'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notificações Tab */}
              <TabsContent value="notificacoes" className="mt-4">
                {userId && <NotificationHistory userId={userId} />}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Perfil;

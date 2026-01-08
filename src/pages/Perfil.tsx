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
import { User, Phone, Mail, Camera, Loader2, Save, Bell, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClientNotifications } from "@/hooks/useNotifications";
import { NotificationHistory } from "@/components/client/NotificationHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  total_price: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-500' },
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

      // Fetch recent appointments
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, payment_status, total_price")
        .eq("user_id", session.user.id)
        .order("appointment_date", { ascending: false })
        .limit(5);

      setAppointments(appts || []);
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
    <div className="min-h-screen bg-background">
      <AnimatedBackground />
      
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto space-y-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-center mb-8">
              Meu <span className="text-gradient">Perfil</span>
            </h1>

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

            {/* Notification History */}
            {userId && <NotificationHistory userId={userId} />}

            {/* Recent Appointments */}
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Perfil;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Phone, Calendar, DollarSign, Crown, Star, 
  ArrowLeft, Clock, CheckCircle, XCircle, MessageSquare,
  Package, TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Client, useClientNotes } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDetailsModalProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}

interface ClientAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_price: number;
  payment_status: string;
  payment_method: string | null;
  services: { name: string; price: number }[];
}

interface ClientPackage {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  package: {
    name: string;
    price: number;
  };
  usage_count: number;
  benefits_count: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  confirmed: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-green-500/20 text-green-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function ClientDetailsModal({ client, open, onClose }: ClientDetailsModalProps) {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [packages, setPackages] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  
  const { notes, addNote, loading: notesLoading } = useClientNotes(client?.user_id || null);

  useEffect(() => {
    if (client && open) {
      fetchClientDetails();
    }
  }, [client, open]);

  async function fetchClientDetails() {
    if (!client) return;
    setLoading(true);

    // Fetch appointments with services
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', client.user_id)
      .order('appointment_date', { ascending: false });

    const appointmentsWithServices: ClientAppointment[] = [];
    
    for (const apt of appointmentsData || []) {
      const { data: servicesData } = await supabase
        .from('appointment_services')
        .select('price_at_booking, services(name)')
        .eq('appointment_id', apt.id);

      appointmentsWithServices.push({
        ...apt,
        services: servicesData?.map((s: any) => ({
          name: s.services?.name || 'Serviço',
          price: Number(s.price_at_booking)
        })) || []
      });
    }

    setAppointments(appointmentsWithServices);

    // Fetch packages with usage
    const { data: packagesData } = await supabase
      .from('client_packages')
      .select(`
        *,
        package:packages(name, price)
      `)
      .eq('user_id', client.user_id)
      .order('created_at', { ascending: false });

    const packagesWithUsage: ClientPackage[] = [];
    
    for (const pkg of packagesData || []) {
      // Get usage count
      const { count: usageCount } = await supabase
        .from('client_package_usage')
        .select('*', { count: 'exact', head: true })
        .eq('client_package_id', pkg.id);

      // Get total benefits
      const { count: benefitsCount } = await supabase
        .from('package_benefits')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', pkg.package_id);

      packagesWithUsage.push({
        ...pkg,
        usage_count: usageCount || 0,
        benefits_count: benefitsCount || 0
      });
    }

    setPackages(packagesWithUsage);
    setLoading(false);
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote);
    setNewNote('');
  };

  if (!client) return null;

  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
  const totalSpent = appointments
    .filter(a => a.status === 'completed' && a.payment_status === 'paid')
    .reduce((sum, a) => sum + Number(a.total_price || 0), 0);
  const activePackages = packages.filter(p => p.status === 'active');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 pr-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{client.name || 'Sem nome'}</h2>
              {client.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.phone}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="p-2 sm:p-3 rounded-xl bg-muted/50 text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-base sm:text-lg font-bold">{appointments.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Agendamentos</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-muted/50 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-base sm:text-lg font-bold">{completedCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Concluídos</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-muted/50 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-base sm:text-lg font-bold">R$ {totalSpent.toFixed(0)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total Gasto</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-muted/50 text-center">
            <Crown className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-base sm:text-lg font-bold">{activePackages.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pacotes Ativos</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start px-4 sm:px-6 bg-transparent border-b rounded-none flex-shrink-0 overflow-x-auto">
            <TabsTrigger value="appointments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm whitespace-nowrap">
              📅 Agendamentos
            </TabsTrigger>
            <TabsTrigger value="packages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm whitespace-nowrap">
              👑 Pacotes
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm whitespace-nowrap">
              📝 Notas
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 max-h-[40vh] sm:max-h-[300px]">
            <TabsContent value="appointments" className="p-6 pt-4 m-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="text-2xl"
                  >
                    ✂️
                  </motion.span>
                </div>
              ) : appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt, index) => (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-3 rounded-xl bg-muted/30 border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {format(new Date(apt.appointment_date + 'T00:00:00'), "dd/MM/yyyy")}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {apt.appointment_time.slice(0, 5)}
                            </span>
                            <Badge className={statusColors[apt.status]}>
                              {statusLabels[apt.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {apt.services.map(s => s.name).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            R$ {Number(apt.total_price).toFixed(0)}
                          </p>
                          {apt.payment_status === 'paid' && (
                            <Badge variant="outline" className="text-xs text-green-500">
                              Pago
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="packages" className="p-6 pt-4 m-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="text-2xl"
                  >
                    ✂️
                  </motion.span>
                </div>
              ) : packages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum pacote encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`p-4 rounded-xl border ${
                        pkg.status === 'active' 
                          ? 'bg-yellow-500/10 border-yellow-500/30' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className={`h-4 w-4 ${pkg.status === 'active' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                            <span className="font-semibold">{pkg.package?.name}</span>
                            <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                              {pkg.status === 'active' ? 'Ativo' : 'Expirado'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(pkg.start_date + 'T00:00:00'), "dd/MM/yyyy")} - {format(new Date(pkg.end_date + 'T00:00:00'), "dd/MM/yyyy")}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {pkg.usage_count} / {pkg.benefits_count} benefícios usados
                            </span>
                          </div>
                        </div>
                        <p className="font-bold text-primary">
                          R$ {Number(pkg.package?.price || 0).toFixed(0)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="p-6 pt-4 m-0">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nota sobre o cliente..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <Button onClick={handleAddNote} disabled={notesLoading}>
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma nota ainda
                    </p>
                  ) : (
                    notes.map((note, index) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-3 rounded-lg bg-muted/50"
                      >
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

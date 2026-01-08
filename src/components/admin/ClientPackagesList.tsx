import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, XCircle, Plus, Search, Scissors, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientPackage } from '@/hooks/usePackages';

interface Package {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

interface Client {
  user_id: string;
  name: string | null;
  phone: string | null;
}

interface ClientPackagesListProps {
  subscriptions: ClientPackage[];
  packages: Package[];
  clients: Client[];
  selectedPackageId?: string;
  onAddSubscription: (userId: string, packageId: string, startDate: string) => Promise<boolean>;
  onCancelSubscription: (id: string) => Promise<boolean>;
  onDeleteSubscription?: (id: string) => Promise<boolean>;
  onRegisterUsage?: (clientPackageId: string, serviceId: string) => Promise<boolean>;
}

export function ClientPackagesList({
  subscriptions,
  packages,
  clients,
  selectedPackageId,
  onAddSubscription,
  onCancelSubscription,
  onDeleteSubscription,
  onRegisterUsage,
}: ClientPackagesListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(selectedPackageId || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState<ClientPackage | null>(null);
  const [selectedServiceForUsage, setSelectedServiceForUsage] = useState('');
  const [registeringUsage, setRegisteringUsage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = search
      ? sub.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
        sub.profile?.phone?.includes(search)
      : true;
    const matchesPackage = selectedPackageId ? sub.package_id === selectedPackageId : true;
    return matchesSearch && matchesPackage;
  });

  const handleAddSubscription = async () => {
    if (!selectedClient || !selectedPackage) return;
    setLoading(true);
    const success = await onAddSubscription(selectedClient, selectedPackage, startDate);
    if (success) {
      setShowAddForm(false);
      setSelectedClient('');
      setSelectedPackage(selectedPackageId || '');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
    setLoading(false);
  };

  const handleRegisterUsage = async () => {
    if (!showUsageDialog || !selectedServiceForUsage || !onRegisterUsage) return;
    setRegisteringUsage(true);
    const success = await onRegisterUsage(showUsageDialog.id, selectedServiceForUsage);
    if (success) {
      setShowUsageDialog(null);
      setSelectedServiceForUsage('');
    }
    setRegisteringUsage(false);
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!onDeleteSubscription) return;
    setDeletingId(id);
    await onDeleteSubscription(id);
    setDeletingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Aguardando Pagamento</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getUsageByService = (sub: ClientPackage) => {
    const usage = sub.usage || [];
    return usage.reduce((acc, u) => {
      acc[u.service_id] = (acc[u.service_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getAvailableServices = (sub: ClientPackage) => {
    const benefits = sub.benefits || [];
    const usageByService = getUsageByService(sub);
    return benefits.filter((b) => {
      const used = usageByService[b.service_id] || 0;
      return used < b.quantity;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Assinatura
        </Button>
      </div>

      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-12 glass-effect rounded-2xl">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma assinatura'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubscriptions.map((sub) => {
            const benefits = sub.benefits || [];
            const usageByService = getUsageByService(sub);
            const availableServices = getAvailableServices(sub);

            return (
              <div key={sub.id} className="p-4 rounded-2xl glass-effect space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{sub.profile?.name || 'Cliente'}</h4>
                      {getStatusBadge(sub.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{sub.profile?.phone || 'Sem telefone'}</p>
                    <p className="text-sm text-primary font-medium mt-1">
                      {sub.package?.name} • R$ {Number(sub.package?.price || 0).toFixed(0)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(sub.start_date), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(new Date(sub.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {sub.status === 'active' && availableServices.length > 0 && onRegisterUsage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowUsageDialog(sub)}
                        >
                          <Scissors className="h-3 w-3 mr-1" />
                          Registrar Uso
                        </Button>
                      )}
                      {(sub.status === 'active' || sub.status === 'pending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-600"
                          onClick={() => onCancelSubscription(sub.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      {onDeleteSubscription && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              disabled={deletingId === sub.id}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Assinatura</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir permanentemente a assinatura de{' '}
                                <span className="font-semibold">{sub.profile?.name || 'Cliente'}</span>?
                                <br /><br />
                                Esta ação não pode ser desfeita e todo o histórico de uso será perdido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSubscription(sub.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>

                {/* Benefits usage */}
                {benefits.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Uso dos Benefícios
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {benefits.map((benefit) => {
                        const used = usageByService[benefit.service_id] || 0;
                        const remaining = benefit.quantity - used;
                        const percentage = (used / benefit.quantity) * 100;

                        return (
                          <div key={benefit.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Scissors className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{benefit.service?.name}</span>
                              </div>
                              <span className={remaining > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                                {remaining}/{benefit.quantity}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.user_id} value={client.user_id}>
                      {client.name || client.phone || 'Cliente'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pacote</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - R$ {Number(pkg.price).toFixed(0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleAddSubscription}
                disabled={!selectedClient || !selectedPackage || loading}
                className="flex-1"
              >
                {loading ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={!!showUsageDialog} onOpenChange={() => setShowUsageDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Uso de Benefício</DialogTitle>
          </DialogHeader>
          {showUsageDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cliente: <span className="font-medium text-foreground">{showUsageDialog.profile?.name}</span>
              </p>

              <div>
                <Label>Serviço Utilizado</Label>
                <Select value={selectedServiceForUsage} onValueChange={setSelectedServiceForUsage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableServices(showUsageDialog).map((benefit) => {
                      const used = getUsageByService(showUsageDialog)[benefit.service_id] || 0;
                      const remaining = benefit.quantity - used;
                      return (
                        <SelectItem key={benefit.service_id} value={benefit.service_id}>
                          {benefit.service?.name} ({remaining} restantes)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowUsageDialog(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleRegisterUsage}
                  disabled={!selectedServiceForUsage || registeringUsage}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {registeringUsage ? 'Registrando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
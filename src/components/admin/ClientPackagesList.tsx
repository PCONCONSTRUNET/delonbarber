import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, XCircle, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPackage {
  id: string;
  user_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  profile?: {
    name: string | null;
    phone: string | null;
  };
  package?: {
    name: string;
    price: number;
    discount_percent: number;
  };
}

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
}

export function ClientPackagesList({
  subscriptions,
  packages,
  clients,
  selectedPackageId,
  onAddSubscription,
  onCancelSubscription,
}: ClientPackagesListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(selectedPackageId || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativo</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
          {filteredSubscriptions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-2xl glass-effect flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
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
                {sub.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => onCancelSubscription(sub.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
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
    </div>
  );
}
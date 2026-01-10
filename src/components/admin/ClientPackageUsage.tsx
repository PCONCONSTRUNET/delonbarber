import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Scissors, Plus } from 'lucide-react';
import { ClientPackage } from '@/hooks/usePackages';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPackageUsageProps {
  subscription: ClientPackage;
  onRegisterUsage: (clientPackageId: string, serviceId: string) => Promise<boolean>;
}

export function ClientPackageUsage({ subscription, onRegisterUsage }: ClientPackageUsageProps) {
  const [showAddUsage, setShowAddUsage] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(false);

  const benefits = subscription.benefits || [];
  const usage = subscription.usage || [];

  // Calculate usage per service
  const usageByService = usage.reduce((acc, u) => {
    acc[u.service_id] = (acc[u.service_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleRegisterUsage = async () => {
    if (!selectedService) return;
    setLoading(true);
    const success = await onRegisterUsage(subscription.id, selectedService);
    if (success) {
      setShowAddUsage(false);
      setSelectedService('');
    }
    setLoading(false);
  };

  // Filter services that still have available uses
  const availableServices = benefits.filter((b) => {
    const used = usageByService[b.service_id] || 0;
    return used < b.quantity;
  });

  return (
    <div className="p-4 rounded-2xl glass-effect space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{subscription.profile?.name || 'Cliente'}</h4>
          <p className="text-sm text-muted-foreground">
            {subscription.package?.name} • Válido até {format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
        <Badge className={
          subscription.status === 'active' 
            ? 'bg-green-500/20 text-green-500 border-green-500/30' 
            : 'bg-muted text-muted-foreground'
        }>
          {subscription.status === 'active' ? 'Ativo' : subscription.status}
        </Badge>
      </div>

      {benefits.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Uso dos Benefícios
          </p>
          
          {benefits.map((benefit) => {
            const used = usageByService[benefit.service_id] || 0;
            const remaining = benefit.quantity - used;
            const percentage = (used / benefit.quantity) * 100;

            return (
              <div key={benefit.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-3 w-3 text-muted-foreground" />
                    <span>{benefit.service?.name}</span>
                  </div>
                  <span className={remaining > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
                    {remaining}/{benefit.quantity} restantes
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum benefício configurado para este pacote
        </p>
      )}

      {subscription.status === 'active' && availableServices.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddUsage(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Uso
        </Button>
      )}

      <Dialog open={showAddUsage} onOpenChange={setShowAddUsage}>
        <DialogContent className="flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Registrar Uso de Benefício</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            <p className="text-sm text-muted-foreground">
              Selecione o serviço utilizado pelo cliente:
            </p>

            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {availableServices.map((benefit) => {
                  const used = usageByService[benefit.service_id] || 0;
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

          <div className="flex gap-2 sm:gap-3 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowAddUsage(false)} className="flex-1 h-11">
              Cancelar
            </Button>
            <Button 
              onClick={handleRegisterUsage} 
              disabled={!selectedService || loading}
              className="flex-1 h-11"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading ? 'Registrando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
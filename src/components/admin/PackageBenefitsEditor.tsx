import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Scissors } from 'lucide-react';
import { usePackageBenefits, PackageBenefit } from '@/hooks/usePackages';
import { useServices } from '@/hooks/useAppointments';

interface PackageBenefitsEditorProps {
  packageId: string;
  onClose: () => void;
}

export function PackageBenefitsEditor({ packageId, onClose }: PackageBenefitsEditorProps) {
  const { benefits, loading, saveBenefits } = usePackageBenefits(packageId);
  const { services, loading: servicesLoading } = useServices();
  const [localBenefits, setLocalBenefits] = useState<{ service_id: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (benefits.length > 0) {
      setLocalBenefits(benefits.map((b) => ({ service_id: b.service_id, quantity: b.quantity })));
    }
  }, [benefits]);

  const addBenefit = () => {
    const availableServices = services.filter(
      (s) => !localBenefits.some((b) => b.service_id === s.id)
    );
    if (availableServices.length > 0) {
      setLocalBenefits([...localBenefits, { service_id: availableServices[0].id, quantity: 1 }]);
    }
  };

  const removeBenefit = (index: number) => {
    setLocalBenefits(localBenefits.filter((_, i) => i !== index));
  };

  const updateBenefit = (index: number, field: 'service_id' | 'quantity', value: string | number) => {
    const updated = [...localBenefits];
    if (field === 'quantity') {
      updated[index].quantity = Number(value);
    } else {
      updated[index].service_id = value as string;
    }
    setLocalBenefits(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveBenefits(localBenefits);
    setSaving(false);
    onClose();
  };

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || 'Serviço';
  };

  if (loading || servicesLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure quantos de cada serviço estão incluídos neste pacote.
      </p>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {localBenefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Scissors className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <Select
              value={benefit.service_id}
              onValueChange={(value) => updateBenefit(index, 'service_id', value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem
                    key={service.id}
                    value={service.id}
                    disabled={
                      localBenefits.some((b, i) => i !== index && b.service_id === service.id)
                    }
                  >
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Qtd:</Label>
              <Input
                type="number"
                min="1"
                value={benefit.quantity}
                onChange={(e) => updateBenefit(index, 'quantity', e.target.value)}
                className="w-16"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeBenefit(index)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {localBenefits.length < services.length && (
        <Button type="button" variant="outline" onClick={addBenefit} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Serviço
        </Button>
      )}

      {localBenefits.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum benefício configurado</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Salvando...' : 'Salvar Benefícios'}
        </Button>
      </div>
    </div>
  );
}
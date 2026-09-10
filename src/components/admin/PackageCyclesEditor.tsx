import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, RotateCw, X } from 'lucide-react';
import { usePackageCycles } from '@/hooks/usePackages';
import { useServices } from '@/hooks/useAppointments';

interface PackageCyclesEditorProps {
  packageId: string;
  onClose: () => void;
}

export function PackageCyclesEditor({ packageId, onClose }: PackageCyclesEditorProps) {
  const { cycles, loading, saveCycles } = usePackageCycles(packageId);
  const { services, loading: servicesLoading } = useServices();
  const [localCycles, setLocalCycles] = useState<{ sequence_order: number; service_ids: string[] }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cycles.length > 0) {
      // Group cycles by sequence_order
      const grouped = cycles.reduce((acc, c) => {
        if (!acc[c.sequence_order]) acc[c.sequence_order] = [];
        acc[c.sequence_order].push(c.service_id);
        return acc;
      }, {} as Record<number, string[]>);
      
      const formatted = Object.entries(grouped).map(([order, ids]) => ({
        sequence_order: Number(order),
        service_ids: ids
      })).sort((a, b) => a.sequence_order - b.sequence_order);

      setLocalCycles(formatted);
    }
  }, [cycles]);

  const addCycle = () => {
    if (services.length > 0) {
      setLocalCycles([
        ...localCycles, 
        { sequence_order: localCycles.length + 1, service_ids: [services[0].id] }
      ]);
    }
  };

  const removeCycle = (index: number) => {
    const updated = localCycles.filter((_, i) => i !== index);
    // Reorder
    const reordered = updated.map((c, i) => ({ ...c, sequence_order: i + 1 }));
    setLocalCycles(reordered);
  };

  const addServiceToCycle = (index: number) => {
    if (services.length > 0) {
      const updated = [...localCycles];
      updated[index].service_ids.push(services[0].id);
      setLocalCycles(updated);
    }
  };

  const removeServiceFromCycle = (cycleIndex: number, serviceIndex: number) => {
    const updated = [...localCycles];
    updated[cycleIndex].service_ids = updated[cycleIndex].service_ids.filter((_, i) => i !== serviceIndex);
    // If we removed the last service, remove the whole cycle
    if (updated[cycleIndex].service_ids.length === 0) {
      removeCycle(cycleIndex);
    } else {
      setLocalCycles(updated);
    }
  };

  const updateCycleService = (cycleIndex: number, serviceIndex: number, serviceId: string) => {
    const updated = [...localCycles];
    updated[cycleIndex].service_ids[serviceIndex] = serviceId;
    setLocalCycles(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    // Flatten back to array of single { sequence_order, service_id }
    const flatCycles = localCycles.flatMap(c => 
      c.service_ids.map(sid => ({
        sequence_order: c.sequence_order,
        service_id: sid
      }))
    );
    await saveCycles(flatCycles);
    setSaving(false);
    onClose();
  };

  if (loading || servicesLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(85vh-80px)] overflow-hidden">
      <p className="text-sm text-muted-foreground mb-4 flex-shrink-0">
        Configure a sequência de serviços. O sistema fará a alternância automaticamente a cada agendamento do cliente.
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-0">
        {localCycles.map((cycle, index) => (
          <div key={index} className="p-3 sm:p-4 rounded-xl bg-muted/50 flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0">
              {cycle.sequence_order}
            </div>
            
            <div className="flex-1 space-y-2">
              {cycle.service_ids.map((serviceId, serviceIndex) => (
                <div key={serviceIndex} className="flex gap-2">
                  <Select
                    value={serviceId}
                    onValueChange={(value) => updateCycleService(index, serviceIndex, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground shrink-0" 
                    onClick={() => removeServiceFromCycle(index, serviceIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => addServiceToCycle(index)}
                className="w-full h-8 border-dashed"
              >
                <Plus className="h-3 w-3 mr-1" /> Mais um serviço nesta etapa
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCycle(index)}
              className="text-destructive shrink-0 h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addCycle} className="w-full mt-2">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Etapa ao Ciclo
        </Button>

        {localCycles.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <RotateCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum ciclo configurado</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 sm:gap-3 pt-4 border-t mt-auto flex-shrink-0 bg-background">
        <Button variant="outline" onClick={onClose} className="flex-1 h-11">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 h-11">
          {saving ? 'Salvando...' : 'Salvar Ciclo'}
        </Button>
      </div>
    </div>
  );
}

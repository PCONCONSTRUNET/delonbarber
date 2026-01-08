import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Service {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
  image_url?: string;
  subscribers_only: boolean;
}

interface ServiceFormProps {
  service?: Service | null;
  onSubmit: (service: any) => void;
  onCancel: () => void;
}

const categories = [
  { value: 'corte', label: 'Corte' },
  { value: 'barba', label: 'Barba' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'combo', label: 'Combo' },
  { value: 'adicional', label: 'Adicional' },
];

export function ServiceForm({ service, onSubmit, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState<Service>({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    category: 'corte',
    is_active: true,
    image_url: '',
    subscribers_only: false,
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        price: Number(service.price),
        duration_minutes: service.duration_minutes,
        category: service.category,
        is_active: service.is_active,
        image_url: service.image_url || '',
        subscribers_only: service.subscribers_only || false,
      });
    }
  }, [service]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Serviço</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Corte Degradê"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o serviço..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            min={0}
            step={1}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duração (min)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
            min={5}
            step={5}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">URL da Imagem (opcional)</Label>
        <Input
          id="image"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="active">Serviço Ativo</Label>
        <Switch
          id="active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
        <div>
          <Label htmlFor="subscribers" className="text-yellow-600 font-medium">👑 Exclusivo para Assinantes</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Este serviço só aparecerá para clientes com pacote ativo
          </p>
        </div>
        <Switch
          id="subscribers"
          checked={formData.subscribers_only}
          onCheckedChange={(checked) => setFormData({ ...formData, subscribers_only: checked })}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {service ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}

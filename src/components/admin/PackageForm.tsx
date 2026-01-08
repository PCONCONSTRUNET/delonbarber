import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';

interface PackageFormProps {
  pkg?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_days: number;
    discount_percent: number;
    benefits: string[] | null;
    is_active: boolean;
  } | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function PackageForm({ pkg, onSubmit, onCancel }: PackageFormProps) {
  const [name, setName] = useState(pkg?.name || '');
  const [description, setDescription] = useState(pkg?.description || '');
  const [price, setPrice] = useState(pkg?.price?.toString() || '');
  const [durationDays, setDurationDays] = useState(pkg?.duration_days?.toString() || '30');
  const [discountPercent, setDiscountPercent] = useState(pkg?.discount_percent?.toString() || '0');
  const [benefits, setBenefits] = useState<string[]>(pkg?.benefits || []);
  const [newBenefit, setNewBenefit] = useState('');
  const [isActive, setIsActive] = useState(pkg?.is_active ?? true);
  const [loading, setLoading] = useState(false);

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      name,
      description: description || null,
      price: Number(price),
      duration_days: Number(durationDays),
      discount_percent: Number(discountPercent),
      benefits,
      is_active: isActive,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Pacote</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Pacote Mensal VIP"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva os benefícios do pacote..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="100"
            required
          />
        </div>
        <div>
          <Label htmlFor="duration">Duração (dias)</Label>
          <Input
            id="duration"
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            placeholder="30"
            required
          />
        </div>
        <div>
          <Label htmlFor="discount">Desconto (%)</Label>
          <Input
            id="discount"
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="10"
            min="0"
            max="100"
          />
        </div>
      </div>

      <div>
        <Label>Benefícios</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            placeholder="Adicionar benefício..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
          />
          <Button type="button" variant="outline" onClick={addBenefit}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {benefits.map((benefit, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
            >
              {benefit}
              <button type="button" onClick={() => removeBenefit(i)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Pacote ativo</Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : pkg ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
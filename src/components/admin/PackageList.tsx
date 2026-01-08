import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Users, Crown } from 'lucide-react';
import { PackageForm } from './PackageForm';

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  benefits: string[] | null;
  is_active: boolean;
  created_at: string;
}

interface PackageListProps {
  packages: Package[];
  onUpdate: (id: string, data: any) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onViewSubscribers: (packageId: string) => void;
}

export function PackageList({ packages, onUpdate, onDelete, onViewSubscribers }: PackageListProps) {
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const handleUpdate = async (data: any) => {
    if (editingPackage) {
      await onUpdate(editingPackage.id, data);
      setEditingPackage(null);
    }
  };

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 glass-effect rounded-2xl">
        <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum pacote cadastrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`p-5 rounded-2xl glass-effect relative ${!pkg.is_active ? 'opacity-50' : ''}`}
          >
            {pkg.discount_percent > 0 && (
              <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
                {pkg.discount_percent}% OFF
              </Badge>
            )}

            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground">{pkg.duration_days} dias</p>
              </div>
            </div>

            {pkg.description && (
              <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
            )}

            {pkg.benefits && pkg.benefits.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {pkg.benefits.slice(0, 3).map((benefit, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {benefit}
                  </span>
                ))}
                {pkg.benefits.length > 3 && (
                  <span className="text-xs px-2 py-1 text-muted-foreground">
                    +{pkg.benefits.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-2xl font-bold text-primary">
                R$ {Number(pkg.price).toFixed(0)}
              </span>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewSubscribers(pkg.id)}
                  title="Ver assinantes"
                >
                  <Users className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPackage(pkg)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => onDelete(pkg.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingPackage} onOpenChange={() => setEditingPackage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pacote</DialogTitle>
          </DialogHeader>
          <PackageForm
            pkg={editingPackage}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPackage(null)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
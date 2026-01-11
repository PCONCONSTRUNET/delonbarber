import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Users, Crown, Settings } from 'lucide-react';
import { PackageForm } from './PackageForm';
import { PackageBenefitsEditor } from './PackageBenefitsEditor';
import { supabase } from '@/integrations/supabase/client';

interface PackageBenefit {
  id: string;
  service_id: string;
  quantity: number;
  service?: {
    name: string;
  };
}

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
  const [editingBenefits, setEditingBenefits] = useState<string | null>(null);
  const [packageBenefits, setPackageBenefits] = useState<Record<string, PackageBenefit[]>>({});

  useEffect(() => {
    // Fetch benefits for all packages
    async function fetchAllBenefits() {
      const { data } = await supabase
        .from('package_benefits')
        .select('*, services(name)')
        .in('package_id', packages.map(p => p.id));

      if (data) {
        const grouped = data.reduce((acc: Record<string, PackageBenefit[]>, b: any) => {
          if (!acc[b.package_id]) acc[b.package_id] = [];
          acc[b.package_id].push({
            id: b.id,
            service_id: b.service_id,
            quantity: b.quantity,
            service: b.services,
          });
          return acc;
        }, {});
        setPackageBenefits(grouped);
      }
    }

    if (packages.length > 0) {
      fetchAllBenefits();
    }
  }, [packages, editingBenefits]);

  const handleUpdate = async (data: any) => {
    if (editingPackage) {
      await onUpdate(editingPackage.id, data);
      setEditingPackage(null);
    }
  };

  if (packages.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 glass-effect rounded-2xl"
      >
        <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum pacote cadastrado</p>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {packages.map((pkg, index) => {
          const benefits = packageBenefits[pkg.id] || [];
          
          return (
            <motion.div
              key={pkg.id}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.02, 
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 0.98 }}
              className={`p-5 rounded-2xl glass-effect relative cursor-pointer group ${!pkg.is_active ? 'opacity-50' : ''}`}
            >
              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              
              <AnimatePresence>
                {pkg.discount_percent > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, delay: index * 0.1 + 0.2 }}
                  >
                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black">
                      {pkg.discount_percent}% OFF
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-3 mb-3 relative z-10">
                <motion.div 
                  className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20"
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                >
                  <Crown className="h-6 w-6 text-yellow-500" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">{pkg.duration_days} dias</p>
                </div>
              </div>

              {pkg.description && (
                <p className="text-sm text-muted-foreground mb-3 relative z-10">{pkg.description}</p>
              )}

              {/* Show structured benefits */}
              {benefits.length > 0 && (
                <motion.div 
                  className="flex flex-wrap gap-1 mb-4 relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {benefits.slice(0, 3).map((benefit, benefitIndex) => (
                    <motion.span 
                      key={benefit.id} 
                      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + benefitIndex * 0.05 + 0.4 }}
                    >
                      {benefit.quantity}x {benefit.service?.name}
                    </motion.span>
                  ))}
                  {benefits.length > 3 && (
                    <span className="text-xs px-2 py-1 text-muted-foreground">
                      +{benefits.length - 3}
                    </span>
                  )}
                </motion.div>
              )}

              {benefits.length === 0 && (
                <p className="text-xs text-muted-foreground mb-4 italic relative z-10">
                  Sem benefícios configurados
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border relative z-10">
                <motion.span 
                  className="text-2xl font-bold text-primary"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, delay: index * 0.1 + 0.2 }}
                >
                  R$ {Number(pkg.price).toFixed(0)}
                </motion.span>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingBenefits(pkg.id)}
                    title="Configurar benefícios"
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewSubscribers(pkg.id)}
                    title="Ver assinantes"
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <Users className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPackage(pkg)}
                    className="hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onDelete(pkg.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

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

      <Dialog open={!!editingBenefits} onOpenChange={() => setEditingBenefits(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Benefícios</DialogTitle>
          </DialogHeader>
          {editingBenefits && (
            <PackageBenefitsEditor
              packageId={editingBenefits}
              onClose={() => setEditingBenefits(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
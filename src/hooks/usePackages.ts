import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';

export interface Package {
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

export interface PackageBenefit {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  weekly_limit: number | null;
  service?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface ClientPackageUsage {
  id: string;
  client_package_id: string;
  service_id: string;
  used_at: string;
}

export interface ClientPackage {
  id: string;
  user_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  created_at: string;
  profile?: {
    name: string | null;
    phone: string | null;
  };
  package?: {
    name: string;
    price: number;
    discount_percent: number;
  };
  benefits?: PackageBenefit[];
  usage?: ClientPackageUsage[];
}

export function useAdminPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchPackages() {
    setLoading(true);
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching packages:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar pacotes.', variant: 'destructive' });
    } else {
      setPackages(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPackages();
  }, []);

  async function createPackage(pkg: Omit<Package, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('packages').insert(pkg).select().single();

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar pacote.', variant: 'destructive' });
      return null;
    }

    toast({ title: 'Pacote criado!' });
    fetchPackages();
    return data;
  }

  async function updatePackage(id: string, pkg: Partial<Package>) {
    const { error } = await supabase.from('packages').update(pkg).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Pacote atualizado!' });
    fetchPackages();
    return true;
  }

  async function deletePackage(id: string) {
    const { error } = await supabase.from('packages').update({ is_active: false }).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Pacote removido!' });
    fetchPackages();
    return true;
  }

  return { packages, loading, fetchPackages, createPackage, updatePackage, deletePackage };
}

export function usePackageBenefits(packageId: string | null) {
  const [benefits, setBenefits] = useState<PackageBenefit[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function fetchBenefits() {
    if (!packageId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('package_benefits')
      .select('*, services(id, name, price)')
      .eq('package_id', packageId);

    if (error) {
      console.error('Error fetching benefits:', error);
    } else {
      const formattedBenefits = (data || []).map((b: any) => ({
        id: b.id,
        package_id: b.package_id,
        service_id: b.service_id,
        quantity: b.quantity,
        weekly_limit: b.weekly_limit,
        service: b.services,
      }));
      setBenefits(formattedBenefits);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBenefits();
  }, [packageId]);

  async function saveBenefits(newBenefits: { service_id: string; quantity: number; weekly_limit: number | null }[]) {
    if (!packageId) return false;

    // Delete existing benefits
    await supabase.from('package_benefits').delete().eq('package_id', packageId);

    // Insert new benefits
    if (newBenefits.length > 0) {
      const { error } = await supabase.from('package_benefits').insert(
        newBenefits.map((b) => ({
          package_id: packageId,
          service_id: b.service_id,
          quantity: b.quantity,
          weekly_limit: b.weekly_limit,
        }))
      );

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível salvar benefícios.', variant: 'destructive' });
        return false;
      }
    }

    toast({ title: 'Benefícios salvos!' });
    fetchBenefits();
    return true;
  }

  return { benefits, loading, fetchBenefits, saveBenefits };
}

export function useClientPackages() {
  const [subscriptions, setSubscriptions] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchSubscriptions() {
    setLoading(true);

    // Single optimized query with JOINs
    const { data, error } = await supabase
      .from('client_packages')
      .select(`
        *,
        profiles!client_packages_user_id_fkey(name, phone),
        packages(name, price, discount_percent)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    // Get unique package IDs and subscription IDs for batch queries
    const packageIds = [...new Set(data.map(sub => sub.package_id))];
    const subscriptionIds = data.map(sub => sub.id);

    // Fetch all benefits and usage in parallel (2 queries instead of N*2)
    const [benefitsResult, usageResult] = await Promise.all([
      supabase
        .from('package_benefits')
        .select('*, services(id, name, price)')
        .in('package_id', packageIds),
      supabase
        .from('client_package_usage')
        .select('*')
        .in('client_package_id', subscriptionIds)
    ]);

    // Create lookup maps for O(1) access
    const benefitsByPackage: Record<string, PackageBenefit[]> = {};
    (benefitsResult.data || []).forEach((b: any) => {
      const formatted = {
        id: b.id,
        package_id: b.package_id,
        service_id: b.service_id,
        quantity: b.quantity,
        weekly_limit: b.weekly_limit,
        service: b.services,
      };
      if (!benefitsByPackage[b.package_id]) {
        benefitsByPackage[b.package_id] = [];
      }
      benefitsByPackage[b.package_id].push(formatted);
    });

    const usageBySubscription: Record<string, ClientPackageUsage[]> = {};
    (usageResult.data || []).forEach((u: any) => {
      if (!usageBySubscription[u.client_package_id]) {
        usageBySubscription[u.client_package_id] = [];
      }
      usageBySubscription[u.client_package_id].push(u);
    });

    // Map subscriptions with all data
    const subscriptionsWithDetails: ClientPackage[] = data.map((sub: any) => ({
      ...sub,
      status: sub.status as 'active' | 'expired' | 'cancelled' | 'pending',
      profile: sub.profiles || { name: null, phone: null },
      package: sub.packages || { name: 'Pacote', price: 0, discount_percent: 0 },
      benefits: benefitsByPackage[sub.package_id] || [],
      usage: usageBySubscription[sub.id] || [],
    }));

    setSubscriptions(subscriptionsWithDetails);
    setLoading(false);
  }

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function addSubscription(userId: string, packageId: string, startDate: string) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('duration_days')
      .eq('id', packageId)
      .single();

    if (!pkg) {
      toast({ title: 'Erro', description: 'Pacote não encontrado.', variant: 'destructive' });
      return false;
    }

    const endDate = format(addDays(new Date(startDate), pkg.duration_days), 'yyyy-MM-dd');

    const { error } = await supabase.from('client_packages').insert({
      user_id: userId,
      package_id: packageId,
      start_date: startDate,
      end_date: endDate,
      status: 'active',
    });

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível adicionar assinatura.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Assinatura adicionada!' });
    fetchSubscriptions();
    return true;
  }

  async function cancelSubscription(id: string) {
    const { error } = await supabase
      .from('client_packages')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível cancelar.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Assinatura cancelada!' });
    fetchSubscriptions();
    return true;
  }

  async function confirmSubscription(id: string) {
    const { error } = await supabase
      .from('client_packages')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível confirmar.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Assinatura confirmada!' });
    fetchSubscriptions();
    return true;
  }

  async function deleteSubscription(id: string) {
    // First delete usage records
    await supabase
      .from('client_package_usage')
      .delete()
      .eq('client_package_id', id);

    // Then delete the subscription
    const { error } = await supabase
      .from('client_packages')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Assinatura excluída!' });
    fetchSubscriptions();
    return true;
  }

  async function registerUsage(clientPackageId: string, serviceId: string, appointmentId?: string) {
    const { error } = await supabase.from('client_package_usage').insert({
      client_package_id: clientPackageId,
      service_id: serviceId,
      appointment_id: appointmentId || null,
    });

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar uso.', variant: 'destructive' });
      return false;
    }

    fetchSubscriptions();
    return true;
  }

  return { subscriptions, loading, fetchSubscriptions, addSubscription, confirmSubscription, cancelSubscription, deleteSubscription, registerUsage };
}
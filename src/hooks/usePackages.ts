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

export interface ClientPackage {
  id: string;
  user_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
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
    const { error } = await supabase.from('packages').insert(pkg);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível criar pacote.', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Pacote criado!' });
    fetchPackages();
    return true;
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

export function useClientPackages() {
  const [subscriptions, setSubscriptions] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchSubscriptions() {
    setLoading(true);

    const { data, error } = await supabase
      .from('client_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles and packages for each subscription
    const subscriptionsWithDetails: ClientPackage[] = [];

    for (const sub of data || []) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', sub.user_id)
        .maybeSingle();

      const { data: packageData } = await supabase
        .from('packages')
        .select('name, price, discount_percent')
        .eq('id', sub.package_id)
        .maybeSingle();

      subscriptionsWithDetails.push({
        ...sub,
        status: sub.status as 'active' | 'expired' | 'cancelled',
        profile: profileData || { name: null, phone: null },
        package: packageData || { name: 'Pacote', price: 0, discount_percent: 0 },
      });
    }

    setSubscriptions(subscriptionsWithDetails);
    setLoading(false);
  }

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function addSubscription(userId: string, packageId: string, startDate: string) {
    // Get package duration
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

  return { subscriptions, loading, fetchSubscriptions, addSubscription, cancelSubscription };
}
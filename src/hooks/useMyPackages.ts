import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyPackageBenefit {
  id: string;
  service_id: string;
  quantity: number;
  used: number;
  remaining: number;
  service: {
    id: string;
    name: string;
    price: number;
  };
}

export interface MyPackage {
  id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  package: {
    id: string;
    name: string;
    price: number;
    discount_percent: number;
    description: string | null;
  };
  benefits: MyPackageBenefit[];
}

export function useMyPackages() {
  const [packages, setPackages] = useState<MyPackage[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMyPackages() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPackages([]);
      setLoading(false);
      return;
    }

    // Fetch user's active packages
    const { data: clientPackages, error } = await supabase
      .from('client_packages')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching packages:', error);
      setLoading(false);
      return;
    }

    const packagesWithBenefits: MyPackage[] = [];

    for (const cp of clientPackages || []) {
      // Fetch package details
      const { data: packageData } = await supabase
        .from('packages')
        .select('id, name, price, discount_percent, description')
        .eq('id', cp.package_id)
        .single();

      if (!packageData) continue;

      // Fetch benefits for this package
      const { data: benefitsData } = await supabase
        .from('package_benefits')
        .select('id, service_id, quantity, services(id, name, price)')
        .eq('package_id', cp.package_id);

      // Fetch usage for this client package
      const { data: usageData } = await supabase
        .from('client_package_usage')
        .select('service_id')
        .eq('client_package_id', cp.id);

      // Count usage per service
      const usageByService = (usageData || []).reduce((acc, u) => {
        acc[u.service_id] = (acc[u.service_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build benefits with usage info
      const benefits: MyPackageBenefit[] = (benefitsData || []).map((b: any) => {
        const used = usageByService[b.service_id] || 0;
        return {
          id: b.id,
          service_id: b.service_id,
          quantity: b.quantity,
          used,
          remaining: b.quantity - used,
          service: b.services,
        };
      });

      packagesWithBenefits.push({
        id: cp.id,
        package_id: cp.package_id,
        start_date: cp.start_date,
        end_date: cp.end_date,
        status: cp.status as 'active' | 'expired' | 'cancelled',
        package: packageData,
        benefits,
      });
    }

    setPackages(packagesWithBenefits);
    setLoading(false);
  }

  useEffect(() => {
    fetchMyPackages();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchMyPackages();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user has an available benefit for a service
  const hasAvailableBenefit = (serviceId: string): boolean => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.remaining > 0) {
        return true;
      }
    }
    return false;
  };

  // Get total remaining for a specific service across all packages
  const getRemainingForService = (serviceId: string): number => {
    let total = 0;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit) {
        total += benefit.remaining;
      }
    }
    return total;
  };

  return { packages, loading, fetchMyPackages, hasAvailableBenefit, getRemainingForService };
}
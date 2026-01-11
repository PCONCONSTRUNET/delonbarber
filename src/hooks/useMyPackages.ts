import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface MyPackageBenefit {
  id: string;
  service_id: string;
  quantity: number;
  weekly_limit: number | null;
  used: number;
  used_this_week: number;
  remaining: number;
  remaining_this_week: number | null;
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

    // Calculate current week boundaries (Monday to Sunday)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    for (const cp of clientPackages || []) {
      // Fetch package details
      const { data: packageData } = await supabase
        .from('packages')
        .select('id, name, price, discount_percent, description')
        .eq('id', cp.package_id)
        .single();

      if (!packageData) continue;

      // Fetch benefits for this package with weekly_limit
      const { data: benefitsData, error: benefitsError } = await supabase
        .from('package_benefits')
        .select('id, service_id, quantity, weekly_limit, services(id, name, price)')
        .eq('package_id', cp.package_id);

      if (benefitsError) {
        console.error('Error fetching benefits for package:', benefitsError);
        continue;
      }

      // Fetch all usage for this client package
      const { data: usageData, error: usageError } = await supabase
        .from('client_package_usage')
        .select('service_id, used_at')
        .eq('client_package_id', cp.id);

      if (usageError) {
        console.error('Error fetching usage for package:', usageError);
      }

      console.log('Package usage data for', cp.id, ':', usageData);

      // Count total usage per service
      const usageByService = (usageData || []).reduce((acc, u) => {
        acc[u.service_id] = (acc[u.service_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count usage THIS WEEK per service
      const usageThisWeekByService = (usageData || []).reduce((acc, u) => {
        const usedAt = new Date(u.used_at);
        if (usedAt >= weekStart && usedAt <= weekEnd) {
          acc[u.service_id] = (acc[u.service_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      console.log('Usage by service:', usageByService);
      console.log('Usage this week:', usageThisWeekByService);

      // Build benefits with usage info
      const benefits: MyPackageBenefit[] = (benefitsData || []).map((b: any) => {
        const used = usageByService[b.service_id] || 0;
        const usedThisWeek = usageThisWeekByService[b.service_id] || 0;
        const weeklyLimit = b.weekly_limit;
        
        return {
          id: b.id,
          service_id: b.service_id,
          quantity: b.quantity,
          weekly_limit: weeklyLimit,
          used,
          used_this_week: usedThisWeek,
          remaining: b.quantity - used,
          remaining_this_week: weeklyLimit !== null ? weeklyLimit - usedThisWeek : null,
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

  // Check if user has an available benefit for a service (considering weekly limit)
  const hasAvailableBenefit = (serviceId: string): boolean => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit) {
        // Check if there's remaining total
        if (benefit.remaining <= 0) continue;
        
        // Check weekly limit if applicable
        if (benefit.weekly_limit !== null && benefit.remaining_this_week !== null) {
          if (benefit.remaining_this_week <= 0) continue;
        }
        
        return true;
      }
    }
    return false;
  };

  // Get total remaining for a specific service across all packages (considering weekly limit)
  const getRemainingForService = (serviceId: string): number => {
    let total = 0;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit) {
        // If there's a weekly limit, take the minimum of remaining total and remaining this week
        if (benefit.weekly_limit !== null && benefit.remaining_this_week !== null) {
          total += Math.min(benefit.remaining, benefit.remaining_this_week);
        } else {
          total += benefit.remaining;
        }
      }
    }
    return Math.max(0, total);
  };

  // Check if a service is blocked due to weekly limit (has remaining total but no remaining this week)
  const isBlockedByWeeklyLimit = (serviceId: string): boolean => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.remaining > 0) {
        if (benefit.weekly_limit !== null && benefit.remaining_this_week !== null) {
          return benefit.remaining_this_week <= 0;
        }
      }
    }
    return false;
  };

  // Get weekly limit info for a service
  const getWeeklyLimitInfo = (serviceId: string): { limit: number; used: number; remaining: number } | null => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.weekly_limit !== null) {
        return {
          limit: benefit.weekly_limit,
          used: benefit.used_this_week,
          remaining: benefit.remaining_this_week || 0
        };
      }
    }
    return null;
  };

  return { 
    packages, 
    loading, 
    fetchMyPackages, 
    hasAvailableBenefit, 
    getRemainingForService,
    isBlockedByWeeklyLimit,
    getWeeklyLimitInfo
  };
}
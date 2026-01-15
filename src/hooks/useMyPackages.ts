import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';

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
  const [userId, setUserId] = useState<string | null>(null);

  async function fetchMyPackages() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPackages([]);
      setUserId(null);
      setLoading(false);
      return;
    }
    
    setUserId(user.id);

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

  // Check if user has an available benefit for a service (total remaining only, ignoring weekly limits for display)
  const hasAvailableBenefit = (serviceId: string): boolean => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.remaining > 0) {
        return true;
      }
    }
    return false;
  };

  // Get total remaining for a specific service across all packages (total limit only)
  const getRemainingForService = (serviceId: string): number => {
    let total = 0;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit) {
        total += benefit.remaining;
      }
    }
    return Math.max(0, total);
  };

  // Check if a service is blocked due to weekly limit in the CURRENT week (for display purposes)
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

  // NEW: Check if a specific date's week already has an appointment scheduled for this service
  // This checks future scheduled appointments, not just usage records
  const isWeekBlockedForDate = useCallback(async (serviceId: string, targetDate: Date): Promise<boolean> => {
    if (!userId) return false;
    
    // Get the week boundaries for the target date
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    
    // Check if user has a weekly limit for this service
    let hasWeeklyLimit = false;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.weekly_limit !== null && benefit.weekly_limit > 0) {
        hasWeeklyLimit = true;
        break;
      }
    }
    
    if (!hasWeeklyLimit) return false;

    // Query for existing appointments (confirmed or pending) in this week that use this service
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_services!inner(service_id)
      `)
      .eq('user_id', userId)
      .gte('appointment_date', format(targetWeekStart, 'yyyy-MM-dd'))
      .lte('appointment_date', format(targetWeekEnd, 'yyyy-MM-dd'))
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Error checking week appointments:', error);
      return false;
    }

    // Check if any of these appointments include this service
    const hasAppointmentWithService = existingAppointments?.some((apt: any) => 
      apt.appointment_services.some((as: any) => as.service_id === serviceId)
    );

    return !!hasAppointmentWithService;
  }, [userId, packages]);

  // NEW: Get count of appointments already scheduled in a specific week for a service
  const getScheduledCountForWeek = useCallback(async (serviceId: string, targetDate: Date): Promise<number> => {
    if (!userId) return 0;
    
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_services!inner(service_id)
      `)
      .eq('user_id', userId)
      .gte('appointment_date', format(targetWeekStart, 'yyyy-MM-dd'))
      .lte('appointment_date', format(targetWeekEnd, 'yyyy-MM-dd'))
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Error counting week appointments:', error);
      return 0;
    }

    return existingAppointments?.filter((apt: any) => 
      apt.appointment_services.some((as: any) => as.service_id === serviceId)
    ).length || 0;
  }, [userId]);

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
    isWeekBlockedForDate,
    getScheduledCountForWeek,
    getWeeklyLimitInfo
  };
}

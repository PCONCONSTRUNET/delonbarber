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

// ---- Module-level cache to avoid duplicate parallel fetches ----
// Several components call useMyPackages() on the same page; without a cache
// each one triggers its own waterfall of queries (N+1) which makes the
// /agendar page very slow.
type CacheEntry = {
  userId: string | null;
  packages: MyPackage[];
  fetchedAt: number;
};
let cacheEntry: CacheEntry | null = null;
let inflight: Promise<MyPackage[]> | null = null;
const CACHE_TTL_MS = 30_000; // 30s is plenty for booking flow

const subscribers = new Set<(pkgs: MyPackage[]) => void>();
function notifyAll(pkgs: MyPackage[]) {
  subscribers.forEach((cb) => cb(pkgs));
}

async function loadPackages(userId: string): Promise<MyPackage[]> {
  // Single query: client_packages joined with packages
  const { data: clientPackages, error } = await supabase
    .from('client_packages')
    .select(`
      id,
      package_id,
      start_date,
      end_date,
      status,
      packages:package_id ( id, name, price, discount_percent, description )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString().split('T')[0]);

  if (error || !clientPackages || clientPackages.length === 0) {
    if (error) console.error('Error fetching packages:', error);
    return [];
  }

  const packageIds = clientPackages.map((cp: any) => cp.package_id);
  const clientPackageIds = clientPackages.map((cp: any) => cp.id);

  // Fetch all benefits and all usage in parallel — only 2 queries total
  const [benefitsRes, usageRes] = await Promise.all([
    supabase
      .from('package_benefits')
      .select('id, package_id, service_id, quantity, weekly_limit, services(id, name, price)')
      .in('package_id', packageIds),
    supabase
      .from('client_package_usage')
      .select('client_package_id, service_id, used_at')
      .in('client_package_id', clientPackageIds),
  ]);

  const benefitsByPackage: Record<string, any[]> = {};
  (benefitsRes.data || []).forEach((b: any) => {
    if (!benefitsByPackage[b.package_id]) benefitsByPackage[b.package_id] = [];
    benefitsByPackage[b.package_id].push(b);
  });

  const usageByClientPackage: Record<string, any[]> = {};
  (usageRes.data || []).forEach((u: any) => {
    if (!usageByClientPackage[u.client_package_id]) usageByClientPackage[u.client_package_id] = [];
    usageByClientPackage[u.client_package_id].push(u);
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const result: MyPackage[] = [];
  for (const cp of clientPackages as any[]) {
    if (!cp.packages) continue;
    const packageBenefits = benefitsByPackage[cp.package_id] || [];
    const usageData = usageByClientPackage[cp.id] || [];

    const usageByService = usageData.reduce((acc: Record<string, number>, u: any) => {
      acc[u.service_id] = (acc[u.service_id] || 0) + 1;
      return acc;
    }, {});
    const usageThisWeekByService = usageData.reduce((acc: Record<string, number>, u: any) => {
      const usedAt = new Date(u.used_at);
      if (usedAt >= weekStart && usedAt <= weekEnd) {
        acc[u.service_id] = (acc[u.service_id] || 0) + 1;
      }
      return acc;
    }, {});

    const benefits: MyPackageBenefit[] = packageBenefits.map((b: any) => {
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

    result.push({
      id: cp.id,
      package_id: cp.package_id,
      start_date: cp.start_date,
      end_date: cp.end_date,
      status: cp.status as 'active' | 'expired' | 'cancelled',
      package: cp.packages,
      benefits,
    });
  }

  return result;
}

async function getPackagesCached(force = false): Promise<MyPackage[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    cacheEntry = { userId: null, packages: [], fetchedAt: Date.now() };
    return [];
  }

  const fresh = cacheEntry &&
    cacheEntry.userId === user.id &&
    Date.now() - cacheEntry.fetchedAt < CACHE_TTL_MS;

  if (!force && fresh) return cacheEntry!.packages;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const pkgs = await loadPackages(user.id);
      cacheEntry = { userId: user.id, packages: pkgs, fetchedAt: Date.now() };
      notifyAll(pkgs);
      return pkgs;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useMyPackages() {
  const [packages, setPackages] = useState<MyPackage[]>(
    cacheEntry?.packages ?? []
  );
  const [loading, setLoading] = useState(!cacheEntry);
  const [userId, setUserId] = useState<string | null>(cacheEntry?.userId ?? null);

  const fetchMyPackages = useCallback(async (force = false) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const pkgs = await getPackagesCached(force);
    setPackages(pkgs);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Subscribe to global cache updates so all instances stay in sync
    const handler = (pkgs: MyPackage[]) => setPackages(pkgs);
    subscribers.add(handler);

    void fetchMyPackages();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      cacheEntry = null; // invalidate on auth change
      void fetchMyPackages(true);
    });

    return () => {
      subscribers.delete(handler);
      subscription.unsubscribe();
    };
  }, [fetchMyPackages]);

  const hasAvailableBenefit = (serviceId: string): boolean => {
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.remaining > 0) return true;
    }
    return false;
  };

  const getRemainingForService = (serviceId: string): number => {
    let total = 0;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit) total += benefit.remaining;
    }
    return Math.max(0, total);
  };

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

  const isWeekBlockedForDate = useCallback(async (serviceId: string, targetDate: Date): Promise<boolean> => {
    if (!userId) return false;
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    let hasWeeklyLimit = false;
    for (const pkg of packages) {
      const benefit = pkg.benefits.find(b => b.service_id === serviceId);
      if (benefit && benefit.weekly_limit !== null && benefit.weekly_limit > 0) {
        hasWeeklyLimit = true;
        break;
      }
    }
    if (!hasWeeklyLimit) return false;

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_services!inner(service_id)')
      .eq('user_id', userId)
      .gte('appointment_date', format(targetWeekStart, 'yyyy-MM-dd'))
      .lte('appointment_date', format(targetWeekEnd, 'yyyy-MM-dd'))
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Error checking week appointments:', error);
      return false;
    }

    return !!existingAppointments?.some((apt: any) =>
      apt.appointment_services.some((as: any) => as.service_id === serviceId)
    );
  }, [userId, packages]);

  const getScheduledCountForWeek = useCallback(async (serviceId: string, targetDate: Date): Promise<number> => {
    if (!userId) return 0;
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_services!inner(service_id)')
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
    fetchMyPackages: () => fetchMyPackages(true),
    hasAvailableBenefit,
    getRemainingForService,
    isBlockedByWeeklyLimit,
    isWeekBlockedForDate,
    getScheduledCountForWeek,
    getWeeklyLimitInfo
  };
}

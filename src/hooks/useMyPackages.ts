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

export interface MyPackageCycle {
  id: string;
  sequence_order: number;
  service_id: string;
  service: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
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
    type?: 'flexible' | 'sequential';
  };
  benefits: MyPackageBenefit[];
  cycles: MyPackageCycle[];
  activeCycle?: MyPackageCycle[];
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
const CACHE_TTL_MS = 10_000; // 10s - curto o suficiente para atualizar após agendamento

const subscribers = new Set<(pkgs: MyPackage[]) => void>();
function notifyAll(pkgs: MyPackage[]) {
  subscribers.forEach((cb) => cb(pkgs));
}

/** Invalida o cache e força todos os componentes a buscarem o estado atualizado */
export function invalidateMyPackagesCache() {
  cacheEntry = null;
  getPackagesCached(true); // Força um fetch e notifica via notifyAll
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
      packages:package_id ( id, name, price, discount_percent, description, type )
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

  // Fetch all benefits, cycles, and all usage in parallel
  const [benefitsRes, cyclesRes, usageRes] = await Promise.all([
    supabase
      .from('package_benefits')
      .select('id, package_id, service_id, quantity, weekly_limit, services(id, name, price)')
      .in('package_id', packageIds),
    supabase
      .from('package_cycles')
      .select('id, package_id, sequence_order, service_id, services(id, name, price, duration_minutes)')
      .in('package_id', packageIds)
      .order('sequence_order', { ascending: true }),
    supabase
      .from('client_package_usage')
      .select('client_package_id, service_id, used_at, appointment_id')
      .in('client_package_id', clientPackageIds),
  ]);

  const benefitsByPackage: Record<string, any[]> = {};
  (benefitsRes.data || []).forEach((b: any) => {
    if (!benefitsByPackage[b.package_id]) benefitsByPackage[b.package_id] = [];
    benefitsByPackage[b.package_id].push(b);
  });

  const cyclesByPackage: Record<string, any[]> = {};
  (cyclesRes.data || []).forEach((c: any) => {
    if (!cyclesByPackage[c.package_id]) cyclesByPackage[c.package_id] = [];
    cyclesByPackage[c.package_id].push(c);
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
    const packageCycles = cyclesByPackage[cp.package_id] || [];
    const usageData = usageByClientPackage[cp.id] || [];

    const usageByService = usageData.reduce((acc: Record<string, number>, u: any) => {
      acc[u.service_id] = (acc[u.service_id] || 0) + 1;
      return acc;
    }, {});
    const usageThisWeekByService = usageData.reduce((acc: Record<string, number>, u: any) => {
      const usedAtStr = u.used_at ? u.used_at.substring(0, 10) : '';
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
      if (usedAtStr >= weekStartStr && usedAtStr <= weekEndStr) {
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

    const cycles: MyPackageCycle[] = packageCycles.map((c: any) => ({
      id: c.id,
      sequence_order: c.sequence_order,
      service_id: c.service_id,
      service: c.services,
    }));

    let activeCycle: MyPackageCycle[] | undefined;
    if (cp.packages.type === 'sequential' && cycles.length > 0) {
      // Group cycles by sequence_order
      const cyclesMap = new Map<number, MyPackageCycle[]>();
      cycles.forEach(c => {
        if (!cyclesMap.has(c.sequence_order)) cyclesMap.set(c.sequence_order, []);
        cyclesMap.get(c.sequence_order)!.push(c);
      });
      const groupedCyclesArray = Array.from(cyclesMap.keys()).sort((a,b)=>a-b).map(k => cyclesMap.get(k)!);

      // Usage count: appointments distintos + skips automáticos (appointment_id = null)
      const distinctAppointments = new Set(
        usageData.map((u: any) => u.appointment_id).filter((id: any) => id != null)
      );
      const skipCount = usageData.filter((u: any) => u.appointment_id == null).length;
      const usageCount = distinctAppointments.size + skipCount;
      
      if (groupedCyclesArray.length > 0) {
        const activeCycleIndex = usageCount % groupedCyclesArray.length;
        activeCycle = groupedCyclesArray[activeCycleIndex];
      }
    }

    result.push({
      id: cp.id,
      package_id: cp.package_id,
      start_date: cp.start_date,
      end_date: cp.end_date,
      status: cp.status as 'active' | 'expired' | 'cancelled',
      package: cp.packages,
      benefits,
      cycles,
      activeCycle,
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
    let mounted = true;

    // Subscribe to global cache updates so all instances stay in sync
    const handler = (pkgs: MyPackage[]) => { if (mounted) setPackages(pkgs); };
    subscribers.add(handler);

    void fetchMyPackages();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      cacheEntry = null; // invalidate on auth change
      void fetchMyPackages(true);
    });

    return () => {
      mounted = false;
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

    const { data: usageData, error } = await supabase
      .from('client_package_usage')
      .select('id')
      .in('client_package_id', packages.map(p => p.id))
      .eq('service_id', serviceId)
      .gte('used_at', targetWeekStart.toISOString())
      .lte('used_at', targetWeekEnd.toISOString());

    if (error) {
      console.error('Error checking week usage:', error);
      return false;
    }

    const weeklyLimit = packages.find(p => p.benefits.find(b => b.service_id === serviceId))?.benefits.find(b => b.service_id === serviceId)?.weekly_limit || 0;
    
    return (usageData?.length || 0) >= weeklyLimit;
  }, [userId, packages]);

  const getScheduledCountForWeek = useCallback(async (serviceId: string, targetDate: Date): Promise<number> => {
    if (!userId) return 0;
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const { data: usageData, error } = await supabase
      .from('client_package_usage')
      .select('id')
      .in('client_package_id', packages.map(p => p.id))
      .eq('service_id', serviceId)
      .gte('used_at', targetWeekStart.toISOString())
      .lte('used_at', targetWeekEnd.toISOString());

    if (error) {
      console.error('Error counting week appointments:', error);
      return 0;
    }

    return usageData?.length || 0;
  }, [userId, packages]);

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

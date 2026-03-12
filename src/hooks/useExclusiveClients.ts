import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useExclusiveClients() {
  const [exclusiveIds, setExclusiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchExclusiveClients = async () => {
    const { data, error } = await supabase
      .from('exclusive_clients')
      .select('user_id');
    
    if (!error && data) {
      setExclusiveIds(data.map(d => d.user_id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExclusiveClients();
  }, []);

  const toggleExclusive = async (userId: string) => {
    const isCurrentlyExclusive = exclusiveIds.includes(userId);

    if (isCurrentlyExclusive) {
      const { error } = await supabase
        .from('exclusive_clients')
        .delete()
        .eq('user_id', userId);
      
      if (!error) {
        setExclusiveIds(prev => prev.filter(id => id !== userId));
        toast({ title: 'Cliente removido dos exclusivos' });
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('exclusive_clients')
        .insert({ user_id: userId, created_by: user?.id });
      
      if (!error) {
        setExclusiveIds(prev => [...prev, userId]);
        toast({ title: 'Cliente marcado como exclusivo ⭐' });
      }
    }
  };

  return { exclusiveIds, loading, toggleExclusive, refetch: fetchExclusiveClients };
}

export function useIsExclusiveClient() {
  const [isExclusive, setIsExclusive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('exclusive_clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsExclusive(!!data && !error);
      setLoading(false);
    }
    check();
  }, []);

  return { isExclusive, loading };
}

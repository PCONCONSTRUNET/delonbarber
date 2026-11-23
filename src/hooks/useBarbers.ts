import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { supabase, getAuthScope, getScopedSupabase, AuthScope } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Barber {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  commission_percent: number;
  is_owner: boolean;
  is_active: boolean;
  is_open_today: boolean;
  notify_push: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const BARBERS_KEY = ['barbers'] as const;

/** Retorna o prefixo ativo do painel do barbeiro (`/barber` ou `/barbeiro`) para manter a navegação consistente. */
export function getBarberBasePath(pathname?: string): '/barber' | '/barbeiro' {
  const path = (pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/barber')).toLowerCase();
  return path === '/barbeiro' || path.startsWith('/barbeiro/') ? '/barbeiro' : '/barber';
}

const cachedBarberAuthUidByScope: Record<AuthScope, string | null | undefined> = {
  admin: undefined,
  barber: undefined,
  client: undefined,
};

/**
 * Cria cliente Supabase efêmero e isolado para cadastrar conta Auth do barbeiro
 * sem encerrar nem sobrescrever a sessão atual do administrador.
 */
function createIsolatedAuthClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `delonbarber-isolated-signup-${Date.now()}`,
    },
  });
}

export function useBarbers(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;

  const { data: barbers = [], isLoading: loading, refetch } = useQuery({
    queryKey: [...BARBERS_KEY, includeInactive ? 'all' : 'active'],
    queryFn: async (): Promise<Barber[]> => {
      let query = supabase
        .from('barbers')
        .select('*')
        .order('is_owner', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching barbers:', error);
        return [];
      }
      return (data || []).map((b: any) => ({
        ...b,
        commission_percent: Number(b.commission_percent ?? 50),
        notify_push: b.notify_push ?? true,
      }));
    },
    staleTime: 60_000,
  });

  return { barbers, loading, refetch };
}

export function useMyBarber() {
  const scope = getAuthScope();
  const scopedClient = getScopedSupabase(scope);
  const initialUid = cachedBarberAuthUidByScope[scope];
  const [userId, setUserId] = useState<string | null>(initialUid ?? null);
  const [authReady, setAuthReady] = useState(initialUid !== undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    const cached = cachedBarberAuthUidByScope[scope];
    setUserId(cached ?? null);
    setAuthReady(cached !== undefined);

    const {
      data: { subscription },
    } = scopedClient.auth.onAuthStateChange((_event, session) => {
      cachedBarberAuthUidByScope[scope] = session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(cachedBarberAuthUidByScope[scope] ?? null);
    });

    scopedClient.auth.getSession().then(({ data: { session } }) => {
      cachedBarberAuthUidByScope[scope] = session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(cachedBarberAuthUidByScope[scope] ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [scope, scopedClient]);

  const { data: barber = null, isLoading, isFetched, refetch } = useQuery({
    queryKey: ['barber', 'me', scope, userId],
    queryFn: async (): Promise<Barber | null> => {
      if (!userId) return null;
      const { data, error } = await scopedClient
        .from('barbers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking barber profile:', error);
        return null;
      }

      if (data) {
        return {
          ...data,
          commission_percent: Number((data as any).commission_percent ?? 50),
          notify_push: (data as any).notify_push ?? true,
        };
      }

      // Fallback seguro: no painel do barbeiro, tenta auto-vincular caso o Admin tenha salvo o e-mail em barbers sem user_id
      if (scope === 'barber') {
        const { data: claimedRows, error: claimErr } = await scopedClient.rpc('claim_my_barber_account');
        const claimed = !claimErr && Array.isArray(claimedRows) ? claimedRows[0] : null;
        if (claimed && claimed.is_active) {
          return {
            ...claimed,
            commission_percent: Number((claimed as any).commission_percent ?? 50),
            notify_push: (claimed as any).notify_push ?? true,
          };
        }
      }

      return null;
    },
    enabled: authReady && !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const loading = !authReady || (!!userId && isLoading && !isFetched);

  async function toggleMyStatus(): Promise<boolean | null> {
    const { data, error } = await scopedClient.rpc('toggle_my_barber_status');
    if (error) {
      toast.error('Não foi possível alterar o status da sua cadeira');
      return null;
    }
    queryClient.invalidateQueries({ queryKey: ['barber', 'me', scope, userId] });
    queryClient.invalidateQueries({ queryKey: BARBERS_KEY });
    toast.success(data ? 'Sua agenda está aberta!' : 'Sua agenda está fechada!');
    return Boolean(data);
  }

  async function toggleMyNotifyPush(enabled?: boolean): Promise<boolean | null> {
    const { data, error } = await scopedClient.rpc('toggle_my_barber_notify_push', {
      p_enabled: enabled ?? null,
    });
    if (error) {
      toast.error('Não foi possível atualizar preferência de push (execute a SQL de notificações no Supabase)');
      return null;
    }
    queryClient.invalidateQueries({ queryKey: ['barber', 'me', scope, userId] });
    queryClient.invalidateQueries({ queryKey: BARBERS_KEY });
    toast.success(data ? 'Push de novos agendamentos ativado!' : 'Push de novos agendamentos pausado!');
    return Boolean(data);
  }

  return {
    barber,
    isBarber: Boolean(barber),
    userId,
    loading,
    refetch,
    toggleMyStatus,
    toggleMyNotifyPush,
  };
}

export interface CreateBarberInput {
  name: string;
  phone?: string;
  bio?: string;
  commission_percent: number;
  avatar_url?: string | null;
  is_owner?: boolean;
  is_active?: boolean;
  notify_push?: boolean;
  accessMode?: 'none' | 'create' | 'link';
  email?: string;
  password?: string;
}

export function useAdminBarbers() {
  const { barbers, loading, refetch } = useBarbers({ includeInactive: true });
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: BARBERS_KEY });
    queryClient.invalidateQueries({ queryKey: ['barber', 'me'] });
  };

  async function uploadBarberAvatar(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = file.name.split('.').pop() || 'png';
    // Storage policy exige que o primeiro segmento da pasta seja auth.uid()
    const filePath = `${user.id}/barber-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      toast.error('Erro ao enviar foto do barbeiro');
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async function assignBarberAccount(
    barberId: string,
    email: string,
    password?: string
  ): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return false;

    try {
      if (password && password.length >= 6) {
        const tempClient = createIsolatedAuthClient();
        const targetBarber = barbers.find((b) => b.id === barberId);
        const { error: signUpErr } = await tempClient.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: targetBarber?.name || cleanEmail.split('@')[0],
              phone: targetBarber?.phone || '',
            },
          },
        });

        if (signUpErr && !signUpErr.message.toLowerCase().includes('already registered')) {
          toast.error(`Erro ao criar login: ${signUpErr.message}`);
          return false;
        }
      }

      const { error: rpcError } = await supabase.rpc('admin_assign_barber_account', {
        p_barber_id: barberId,
        p_email: cleanEmail,
      });

      if (rpcError) {
        const msg = rpcError.message || '';
        if (msg.includes('USER_NOT_FOUND')) {
          toast.error(`Nenhuma conta encontrada com o e-mail ${cleanEmail}`);
        } else if (msg.includes('USER_ALREADY_LINKED')) {
          toast.error('Este e-mail já está vinculado a outro barbeiro');
        } else {
          toast.error(`Não foi possível vincular acesso: ${msg}`);
        }
        return false;
      }

      invalidate();
      return true;
    } catch (err: any) {
      console.error('assignBarberAccount error:', err);
      toast.error(err?.message || 'Erro ao configurar acesso do barbeiro');
      return false;
    }
  }

  async function createBarber(input: CreateBarberInput): Promise<Barber | null> {
    const nextOrder = barbers.length;
    const { data, error } = await supabase
      .from('barbers')
      .insert({
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        bio: input.bio?.trim() || null,
        commission_percent: input.commission_percent,
        avatar_url: input.avatar_url || null,
        is_owner: input.is_owner ?? false,
        is_active: input.is_active ?? true,
        notify_push: input.notify_push ?? true,
        display_order: nextOrder,
        email: input.email?.trim().toLowerCase() || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating barber:', error);
      toast.error('Não foi possível cadastrar o barbeiro');
      return null;
    }

    if (input.accessMode === 'create' && input.email && input.password) {
      const assigned = await assignBarberAccount(data.id, input.email, input.password);
      if (!assigned) {
        toast.warning('Barbeiro cadastrado, mas o acesso de login não foi vinculado.');
      } else {
        toast.success('Barbeiro cadastrado com acesso ativo!');
      }
    } else if (input.accessMode === 'link' && input.email) {
      const assigned = await assignBarberAccount(data.id, input.email);
      if (!assigned) {
        toast.warning('Barbeiro cadastrado, mas o e-mail não pôde ser vinculado.');
      } else {
        toast.success('Barbeiro cadastrado e conta vinculada!');
      }
    } else {
      toast.success('Barbeiro cadastrado!');
    }

    invalidate();
    return {
      ...data,
      commission_percent: Number((data as any).commission_percent ?? 50),
      notify_push: (data as any).notify_push ?? true,
    };
  }

  async function updateBarber(
    id: string,
    updates: Partial<Pick<Barber, 'name' | 'phone' | 'bio' | 'commission_percent' | 'avatar_url' | 'is_active' | 'is_owner' | 'notify_push' | 'display_order'>>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('barbers')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating barber:', error);
      toast.error('Erro ao atualizar dados do barbeiro');
      return false;
    }

    toast.success('Barbeiro atualizado!');
    invalidate();
    return true;
  }

  async function unlinkBarberAccount(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('barbers')
      .update({ user_id: null, email: null })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao desvincular conta');
      return false;
    }

    toast.success('Acesso desvinculado');
    invalidate();
    return true;
  }

  /** Remove um barbeiro nao-proprietario e suas assinaturas push de barbeiro, preservando historico. */
  async function deleteBarber(
    barber: Pick<Barber, 'id' | 'name' | 'is_owner' | 'user_id'>
  ): Promise<boolean> {
    if (barber.is_owner) {
      toast.error('Não é possível excluir o barbeiro proprietário');
      return false;
    }

    if (barber.user_id) {
      try {
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('user_id', barber.user_id)
          .eq('role', 'barber');
      } catch (err) {
        console.warn('Could not clean up barber push subscriptions:', err);
      }
    }

    const { error } = await supabase
      .from('barbers')
      .delete()
      .eq('id', barber.id);

    if (error) {
      console.error('Error deleting barber:', error);
      toast.error('Erro ao excluir barbeiro');
      return false;
    }

    invalidate();
    queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
    toast.success(`${barber.name} excluído!`);
    return true;
  }

  return {
    barbers,
    loading,
    refetch,
    uploadBarberAvatar,
    createBarber,
    updateBarber,
    assignBarberAccount,
    unlinkBarberAccount,
    deleteBarber,
  };
}

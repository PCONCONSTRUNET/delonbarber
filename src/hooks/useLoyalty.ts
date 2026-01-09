import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LoyaltyProgram {
  id: string;
  name: string;
  visits_required: number;
  reward_description: string;
  reward_type: 'discount' | 'free_service' | 'custom';
  reward_value: number | null;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyProgress {
  id: string;
  user_id: string;
  program_id: string;
  visits_count: number;
  rewards_claimed: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
  program?: LoyaltyProgram;
  profile?: {
    name: string | null;
    phone: string | null;
  };
}

export interface LoyaltyReward {
  id: string;
  user_id: string;
  program_id: string;
  appointment_id: string | null;
  status: 'available' | 'used' | 'expired';
  claimed_at: string;
  used_at: string | null;
  program?: LoyaltyProgram;
}

export function useLoyalty() {
  const queryClient = useQueryClient();

  // Buscar programas de fidelidade
  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_program')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LoyaltyProgram[];
    },
  });

  // Criar programa
  const createProgram = useMutation({
    mutationFn: async (program: Omit<LoyaltyProgram, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('loyalty_program')
        .insert(program)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] });
      toast.success('Programa de fidelidade criado!');
    },
    onError: () => {
      toast.error('Erro ao criar programa');
    },
  });

  // Atualizar programa
  const updateProgram = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoyaltyProgram> & { id: string }) => {
      const { error } = await supabase
        .from('loyalty_program')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] });
      toast.success('Programa atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar programa');
    },
  });

  // Deletar programa
  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loyalty_program')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-programs'] });
      toast.success('Programa removido!');
    },
    onError: () => {
      toast.error('Erro ao remover programa');
    },
  });

  return {
    programs,
    loadingPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
  };
}

export function useLoyaltyAdmin() {
  const queryClient = useQueryClient();

  // Buscar progresso de todos os clientes (admin)
  const { data: allProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['loyalty-progress-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_progress')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as LoyaltyProgress[];
    },
  });

  // Adicionar visita manualmente
  const addVisit = useMutation({
    mutationFn: async ({ userId, programId }: { userId: string; programId: string }) => {
      // Buscar progresso atual
      const { data: existing } = await supabase
        .from('loyalty_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .single();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('loyalty_progress')
          .update({
            visits_count: existing.visits_count + 1,
            last_visit_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('loyalty_progress')
          .insert({
            user_id: userId,
            program_id: programId,
            visits_count: 1,
            last_visit_at: new Date().toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-progress-admin'] });
      toast.success('Visita adicionada!');
    },
    onError: () => {
      toast.error('Erro ao adicionar visita');
    },
  });

  // Conceder recompensa
  const grantReward = useMutation({
    mutationFn: async ({ userId, programId }: { userId: string; programId: string }) => {
      // Buscar programa para ver quantas visitas são necessárias
      const { data: program } = await supabase
        .from('loyalty_program')
        .select('visits_required')
        .eq('id', programId)
        .single();

      if (!program) throw new Error('Programa não encontrado');

      // Buscar progresso
      const { data: progress } = await supabase
        .from('loyalty_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('program_id', programId)
        .single();

      if (!progress) throw new Error('Progresso não encontrado');

      if (progress.visits_count < program.visits_required) {
        throw new Error('Visitas insuficientes para resgatar recompensa');
      }

      // Criar recompensa
      const { error: rewardError } = await supabase
        .from('loyalty_rewards')
        .insert({
          user_id: userId,
          program_id: programId,
          status: 'available',
        });

      if (rewardError) throw rewardError;

      // Atualizar progresso (resetar visitas e incrementar rewards_claimed)
      const { error: progressError } = await supabase
        .from('loyalty_progress')
        .update({
          visits_count: progress.visits_count - program.visits_required,
          rewards_claimed: progress.rewards_claimed + 1,
        })
        .eq('id', progress.id);

      if (progressError) throw progressError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-progress-admin'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards-admin'] });
      toast.success('Recompensa concedida!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao conceder recompensa');
    },
  });

  // Buscar recompensas (admin)
  const { data: allRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['loyalty-rewards-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      return data as LoyaltyReward[];
    },
  });

  // Marcar recompensa como usada
  const useReward = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('loyalty_rewards')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', rewardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards-admin'] });
      toast.success('Recompensa utilizada!');
    },
    onError: () => {
      toast.error('Erro ao usar recompensa');
    },
  });

  return {
    allProgress,
    loadingProgress,
    allRewards,
    loadingRewards,
    addVisit,
    grantReward,
    useReward,
  };
}

export function useMyLoyalty() {
  // Buscar meu progresso
  const { data: myProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['my-loyalty-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('loyalty_progress')
        .select(`
          *,
          program:loyalty_program(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as (LoyaltyProgress & { program: LoyaltyProgram })[];
    },
  });

  // Buscar minhas recompensas
  const { data: myRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['my-loyalty-rewards'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select(`
          *,
          program:loyalty_program(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'available');

      if (error) throw error;
      return data as (LoyaltyReward & { program: LoyaltyProgram })[];
    },
  });

  return {
    myProgress,
    loadingProgress,
    myRewards,
    loadingRewards,
  };
}

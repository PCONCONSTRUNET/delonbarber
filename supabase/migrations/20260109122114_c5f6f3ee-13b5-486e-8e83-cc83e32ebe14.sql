-- Tabela de configuração do programa de fidelidade
CREATE TABLE public.loyalty_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  visits_required integer NOT NULL DEFAULT 10,
  reward_description text NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount', -- 'discount', 'free_service', 'custom'
  reward_value numeric, -- valor do desconto ou ID do serviço grátis
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela de progresso de fidelidade dos clientes
CREATE TABLE public.loyalty_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.loyalty_program(id) ON DELETE CASCADE,
  visits_count integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  last_visit_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Tabela de recompensas resgatadas
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.loyalty_program(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available', -- 'available', 'used', 'expired'
  claimed_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.loyalty_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- Policies para loyalty_program
CREATE POLICY "Admins can manage loyalty program"
ON public.loyalty_program FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active loyalty programs"
ON public.loyalty_program FOR SELECT
USING (is_active = true);

-- Policies para loyalty_progress
CREATE POLICY "Admins can manage loyalty progress"
ON public.loyalty_progress FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own progress"
ON public.loyalty_progress FOR SELECT
USING (auth.uid() = user_id);

-- Policies para loyalty_rewards
CREATE POLICY "Admins can manage loyalty rewards"
ON public.loyalty_rewards FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own rewards"
ON public.loyalty_rewards FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_loyalty_progress_updated_at
BEFORE UPDATE ON public.loyalty_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
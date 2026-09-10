-- Adicionar a coluna type aos pacotes existentes
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS type text DEFAULT 'flexible';

-- Atualizar os pacotes existentes para flexible
UPDATE public.packages SET type = 'flexible' WHERE type IS NULL;

-- Criar a tabela de ciclos de pacote
CREATE TABLE IF NOT EXISTS public.package_cycles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    sequence_order integer NOT NULL,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar RLS na nova tabela
ALTER TABLE public.package_cycles ENABLE ROW LEVEL SECURITY;

-- Políticas para package_cycles
CREATE POLICY "Enable read access for all users" ON public.package_cycles
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins" ON public.package_cycles
    FOR ALL USING (
      has_role(auth.uid(), 'admin')
    );

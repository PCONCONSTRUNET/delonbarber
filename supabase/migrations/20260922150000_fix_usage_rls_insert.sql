-- Permite que usuários autenticados insiram registros de uso nos PRÓPRIOS pacotes
CREATE POLICY "Users can insert own usage"
ON public.client_package_usage
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_packages cp
    WHERE cp.id = client_package_usage.client_package_id
    AND   cp.user_id = auth.uid()
  )
);

-- Create package_benefits table for structured benefits with quantities
CREATE TABLE public.package_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(package_id, service_id)
);

-- Create client_package_usage to track benefit usage
CREATE TABLE public.client_package_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_package_id UUID NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_package_usage ENABLE ROW LEVEL SECURITY;

-- Package benefits policies
CREATE POLICY "Anyone can view package benefits" 
ON public.package_benefits 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage package benefits" 
ON public.package_benefits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Client package usage policies
CREATE POLICY "Admins can manage usage" 
ON public.client_package_usage 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own usage" 
ON public.client_package_usage 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.client_packages cp 
    WHERE cp.id = client_package_usage.client_package_id 
    AND cp.user_id = auth.uid()
  )
);
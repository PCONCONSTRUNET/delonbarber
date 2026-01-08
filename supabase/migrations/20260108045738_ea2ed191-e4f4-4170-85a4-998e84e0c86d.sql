-- Create packages table
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  benefits TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create client_packages table for subscriptions
CREATE TABLE public.client_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- Packages policies
CREATE POLICY "Anyone can view active packages" 
ON public.packages 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage packages" 
ON public.packages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Client packages policies
CREATE POLICY "Admins can manage client packages" 
ON public.client_packages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own packages" 
ON public.client_packages 
FOR SELECT 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_packages_updated_at
BEFORE UPDATE ON public.client_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
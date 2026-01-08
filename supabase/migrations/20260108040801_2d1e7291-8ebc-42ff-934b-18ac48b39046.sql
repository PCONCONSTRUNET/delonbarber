
-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create services table with images
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  image_url TEXT,
  category TEXT DEFAULT 'corte',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business hours table
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_open BOOLEAN DEFAULT true,
  UNIQUE(day_of_week)
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status DEFAULT 'pending',
  notes TEXT,
  total_price DECIMAL(10,2),
  total_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointment_services junction table (for multiple services)
CREATE TABLE public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price_at_booking DECIMAL(10,2) NOT NULL,
  UNIQUE(appointment_id, service_id)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Services policies (public read)
CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (is_active = true);

-- Business hours policies (public read)
CREATE POLICY "Anyone can view business hours"
ON public.business_hours FOR SELECT
USING (true);

-- Appointments policies
CREATE POLICY "Users can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = user_id);

-- Appointment services policies
CREATE POLICY "Users can view own appointment services"
ON public.appointment_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create appointment services for own appointments"
ON public.appointment_services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_id AND user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services
INSERT INTO public.services (name, description, price, duration_minutes, category, image_url) VALUES
('Corte Degradê', 'Corte moderno com degradê perfeito', 45.00, 40, 'corte', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400'),
('Corte Social', 'Corte clássico e elegante', 40.00, 30, 'corte', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400'),
('Corte Infantil', 'Corte especial para crianças', 35.00, 25, 'corte', 'https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?w=400'),
('Barba Completa', 'Aparar, desenhar e hidratar', 35.00, 30, 'barba', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'),
('Barba Simples', 'Aparar e alinhar', 25.00, 20, 'barba', 'https://images.unsplash.com/photo-1516914589923-f105f1535f88?w=400'),
('Combo Corte + Barba', 'Pacote completo com desconto', 70.00, 60, 'combo', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400'),
('Combo Premium', 'Corte, barba, sobrancelha e hidratação', 95.00, 90, 'combo', 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400'),
('Sobrancelha', 'Design e alinhamento', 15.00, 15, 'adicional', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400');

-- Insert default business hours (Tuesday to Saturday)
INSERT INTO public.business_hours (day_of_week, open_time, close_time, is_open) VALUES
(0, '09:00', '18:00', false), -- Sunday closed
(1, '09:00', '18:00', false), -- Monday closed
(2, '09:00', '20:00', true),  -- Tuesday
(3, '09:00', '20:00', true),  -- Wednesday
(4, '09:00', '20:00', true),  -- Thursday
(5, '09:00', '20:00', true),  -- Friday
(6, '09:00', '18:00', true);  -- Saturday

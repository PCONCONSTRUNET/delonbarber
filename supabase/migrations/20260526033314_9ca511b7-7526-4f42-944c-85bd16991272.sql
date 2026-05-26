
-- Speed up appointment lookups by date, status, user
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments (appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_user_status_date ON public.appointments (user_id, status, appointment_date DESC);

-- Speed up appointment_services lookups (composite index already covers appointment_id prefix)
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id ON public.appointment_services (service_id);

-- Speed up ratings queries
CREATE INDEX IF NOT EXISTS idx_ratings_public_created ON public.ratings (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings (user_id);

-- Speed up notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON public.notifications (appointment_id);

-- Speed up blocked_slots cleanup by appointment
CREATE INDEX IF NOT EXISTS idx_blocked_slots_appointment ON public.blocked_slots (appointment_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON public.blocked_slots (blocked_date);

-- Speed up client_package_usage queries
CREATE INDEX IF NOT EXISTS idx_client_package_usage_pkg ON public.client_package_usage (client_package_id);
CREATE INDEX IF NOT EXISTS idx_client_package_usage_appointment ON public.client_package_usage (appointment_id);
CREATE INDEX IF NOT EXISTS idx_client_package_usage_service ON public.client_package_usage (service_id);

-- Speed up client_packages lookups
CREATE INDEX IF NOT EXISTS idx_client_packages_user_status ON public.client_packages (user_id, status, end_date);

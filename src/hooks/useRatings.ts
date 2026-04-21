import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Rating {
  id: string;
  appointment_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
  profile?: {
    name: string | null;
    avatar_url: string | null;
  };
}

export function useRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPublicRatings() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching ratings:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for each rating
    const ratingsWithProfiles: Rating[] = [];
    
    for (const rating of data || []) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('user_id', rating.user_id)
        .maybeSingle();

      ratingsWithProfiles.push({
        ...rating,
        profile: profileData || { name: null, avatar_url: null }
      });
    }

    setRatings(ratingsWithProfiles);
    setLoading(false);
  }

  useEffect(() => {
    fetchPublicRatings();
  }, []);

  return { ratings, loading, refetch: fetchPublicRatings };
}

export function useMyRatings() {
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function fetchPendingRatings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPendingAppointments([]);
      setLoading(false);
      return;
    }

    // Get completed appointments without ratings
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, total_price')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false });

    if (!appointments) {
      setPendingAppointments([]);
      setLoading(false);
      return;
    }

    // Get existing ratings
    const { data: existingRatings } = await supabase
      .from('ratings')
      .select('appointment_id')
      .eq('user_id', user.id);

    const ratedAppointmentIds = existingRatings?.map(r => r.appointment_id) || [];
    
    // Filter appointments without ratings
    const pending = appointments.filter(a => !ratedAppointmentIds.includes(a.id));
    
    // Get services for each pending appointment
    const pendingWithServices = [];
    for (const apt of pending.slice(0, 5)) { // Limit to 5 most recent
      const { data: servicesData } = await supabase
        .from('appointment_services')
        .select('services(name)')
        .eq('appointment_id', apt.id);
      
      pendingWithServices.push({
        ...apt,
        services: servicesData?.map((s: any) => s.services?.name).filter(Boolean) || []
      });
    }

    setPendingAppointments(pendingWithServices);
    setLoading(false);
  }

  async function submitRating(appointmentId: string, rating: number, comment: string, isPublic: boolean = true) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('ratings').insert({
      appointment_id: appointmentId,
      user_id: user.id,
      rating,
      comment: comment || null,
      is_public: isPublic
    });

    if (error) {
      console.error('Error submitting rating:', error);
      toast({ title: "Erro", description: "Não foi possível enviar avaliação.", variant: "destructive" });
      return false;
    }

    toast({ title: "Obrigado! ⭐", description: "Sua avaliação foi enviada com sucesso." });
    fetchPendingRatings();
    return true;
  }

  useEffect(() => {
    void fetchPendingRatings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void fetchPendingRatings();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { pendingAppointments, loading, submitRating, refetch: fetchPendingRatings };
}

export function useAverageRating() {
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  async function fetchAverage() {
    const { data } = await supabase
      .from('ratings')
      .select('rating')
      .eq('is_public', true);

    if (data && data.length > 0) {
      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      setAverage(sum / data.length);
      setCount(data.length);
    }
  }

  useEffect(() => {
    fetchAverage();
  }, []);

  return { average, count };
}

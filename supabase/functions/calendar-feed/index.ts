import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return '\\' + match;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get URL params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const days = parseInt(url.searchParams.get('days') || '60');

    // Simple token validation (admin token)
    const expectedToken = Deno.env.get('CALENDAR_FEED_TOKEN') || 'delon-barber-calendar-2024';
    if (token !== expectedToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get appointments for the next X days
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7); // Include last 7 days too

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        total_duration,
        total_price,
        status,
        notes,
        guest_name,
        profiles!appointments_user_id_fkey(name),
        appointment_services(
          services(name)
        )
      `)
      .gte('appointment_date', pastDate.toISOString().split('T')[0])
      .lte('appointment_date', futureDate.toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return new Response('Error fetching appointments', { status: 500 });
    }

    // Generate ICS content
    const events = (appointments || []).map((apt: any) => {
      const clientName = apt.guest_name || apt.profiles?.name || 'Cliente';
      const services = apt.appointment_services?.map((as: any) => as.services?.name).filter(Boolean) || [];
      const duration = apt.total_duration || 30;

      // Parse date and time
      const [year, month, day] = apt.appointment_date.split('-').map(Number);
      const [hour, minute] = apt.appointment_time.split(':').map(Number);
      
      const startDate = new Date(Date.UTC(year, month - 1, day, hour - 3, minute)); // Brazil timezone offset
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      const statusEmoji = apt.status === 'confirmed' ? '✅' : '⏳';
      const title = `${statusEmoji} ${clientName}`;
      const description = [
        `Serviços: ${services.join(', ')}`,
        `Valor: R$ ${Number(apt.total_price || 0).toFixed(0)}`,
        `Duração: ${duration} min`,
        apt.notes ? `Obs: ${apt.notes}` : ''
      ].filter(Boolean).join('\\n');

      return [
        'BEGIN:VEVENT',
        `UID:${apt.id}@delonbarber.lovable.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${escapeText(title)}`,
        `DESCRIPTION:${escapeText(description)}`,
        `LOCATION:Delon Barber`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(clientName)} em 30 minutos`,
        'END:VALARM',
        'END:VEVENT'
      ].join('\r\n');
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Delon Barber//Agenda//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Delon Barber - Agenda',
      'X-WR-TIMEZONE:America/Sao_Paulo',
      'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
      'X-PUBLISHED-TTL:PT15M',
      ...events,
      'END:VCALENDAR'
    ].join('\r\n');

    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="delon-barber-agenda.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

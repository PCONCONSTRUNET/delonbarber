// Generate .ics calendar file for appointments
export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  uid?: string;
}

export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@delonbarber.lovable.app`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Delon Barber//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Seu agendamento na Delon Barber é em 1 hora!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY', 
    'DESCRIPTION:Lembrete: Seu agendamento na Delon Barber é em 15 minutos!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'agendamento-delon-barber.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createAppointmentEvent(
  date: string,
  time: string,
  durationMinutes: number,
  services: string[],
  appointmentId: string
): CalendarEvent {
  // Parse date and time - using local timezone
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  
  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    title: `✂️ Delon Barber - ${services.join(', ')}`,
    description: `Serviços: ${services.join(', ')}\n\nAgendamento confirmado na Delon Barber.\n\nDuração estimada: ${durationMinutes} minutos`,
    location: 'Delon Barber',
    startDate,
    endDate,
    uid: `${appointmentId}@delonbarber.lovable.app`
  };
}

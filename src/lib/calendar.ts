// Generate .ics calendar file for appointments
export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  uid?: string;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeText(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return '\\' + match;
  });
}

function generateEventBlock(event: CalendarEvent): string {
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@delonbarber.lovable.app`;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Agendamento na Delon Barber em 1 hora!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY', 
    'DESCRIPTION:Lembrete: Agendamento na Delon Barber em 15 minutos!',
    'END:VALARM',
    'END:VEVENT'
  ].join('\r\n');
}

export function generateICS(event: CalendarEvent): string {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Delon Barber//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    generateEventBlock(event),
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

// Generate ICS with multiple events
export function generateMultipleICS(events: CalendarEvent[]): string {
  const eventBlocks = events.map(generateEventBlock).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Delon Barber//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    eventBlocks,
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

export function downloadMultipleICS(events: CalendarEvent[], filename?: string): void {
  const icsContent = generateMultipleICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'agendamentos-delon-barber.ics';
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
  appointmentId: string,
  clientName?: string
): CalendarEvent {
  // Parse date and time - using local timezone
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  
  const startDate = new Date(year, month - 1, day, hour, minute);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const title = clientName 
    ? `✂️ ${clientName} - ${services.join(', ')}`
    : `✂️ Delon Barber - ${services.join(', ')}`;

  return {
    title,
    description: `${clientName ? `Cliente: ${clientName}\n` : ''}Serviços: ${services.join(', ')}\n\nDuração estimada: ${durationMinutes} minutos`,
    location: 'Delon Barber',
    startDate,
    endDate,
    uid: `${appointmentId}@delonbarber.lovable.app`
  };
}

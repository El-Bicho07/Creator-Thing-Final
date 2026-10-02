
export function syncCalendar(entry: any) {
  return { success: true, eventId: 'cal_123' };
}
export function generateIcs(entry: any) {
  return "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR";
}

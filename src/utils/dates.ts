import { startOfWeek, endOfWeek, format, eachDayOfInterval, isToday } from 'date-fns';

export function getCurrentWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
}

export function getCurrentWeekEnd(): Date {
  return endOfWeek(new Date(), { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  return format(date, 'EEE, MMM d');
}
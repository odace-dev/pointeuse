import { Employee, TimeEntry } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

export function calculateWorkedHours(entry: TimeEntry): number {
  if (!entry.entryTime || !entry.exitTime) return 0;
  const start = parseTime(entry.entryTime);
  const end = parseTime(entry.exitTime);
  return Math.max(0, end - start);
}

export function calculateWorkedHoursFromStrings(entryTime: string | null, exitTime: string | null): number {
  if (!entryTime || !exitTime) return 0;
  const start = parseTime(entryTime);
  const end = parseTime(exitTime);
  return Math.max(0, end - start);
}

export function formatHours(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  const sign = hours < 0 ? '-' : '+';
  return `${sign}${h}h${m.toString().padStart(2, '0')}`;
}

export function formatHoursSimple(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function getDailyExpectedHours(employee: Employee): number {
  return employee.hoursPerWeek / 5;
}

export function calculateDaySurplus(employee: Employee, entries: TimeEntry[], date: string): number {
  const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === date);
  const worked = dayEntries.reduce((sum, e) => sum + calculateWorkedHours(e), 0);
  const expected = getDailyExpectedHours(employee);
  return worked - expected;
}

export function calculateWeekSurplus(employee: Employee, entries: TimeEntry[], weekStart: string): number {
  const weekStartDate = new Date(weekStart);
  let totalWorked = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === dateStr);
    totalWorked += dayEntries.reduce((sum, e) => sum + calculateWorkedHours(e), 0);
  }

  return totalWorked - employee.hoursPerWeek;
}

export function calculateMonthSurplus(employee: Employee, entries: TimeEntry[], monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  let totalWorked = 0;
  let workDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    const dateStr = d.toISOString().split('T')[0];
    const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === dateStr);
    totalWorked += dayEntries.reduce((sum, e) => sum + calculateWorkedHours(e), 0);
  }

  const expectedMonthly = (employee.hoursPerWeek / 5) * workDays;
  return totalWorked - expectedMonthly;
}

export function calculateTotalSurplus(employee: Employee, entries: TimeEntry[]): number {
  const employeeEntries = entries.filter(e => e.employeeId === employee.id);
  const totalWorked = employeeEntries.reduce((sum, e) => sum + calculateWorkedHours(e), 0);

  const dates = [...new Set(employeeEntries.map(e => e.date))];
  const expectedTotal = dates.length * getDailyExpectedHours(employee);

  return totalWorked - expectedTotal;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

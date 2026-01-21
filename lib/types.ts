export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  hoursPerWeek: number;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  entryTime: string | null; // HH:MM
  exitTime: string | null; // HH:MM
}

export interface DayStats {
  date: string;
  workedHours: number;
  expectedHours: number;
  surplus: number;
}

export interface WeekStats {
  weekStart: string;
  workedHours: number;
  expectedHours: number;
  surplus: number;
}

export interface MonthStats {
  month: string;
  workedHours: number;
  expectedHours: number;
  surplus: number;
}

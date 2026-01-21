'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  calculateWorkedHoursFromStrings,
  formatHours,
  formatHoursSimple,
  getWeekStart,
} from '@/lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  hoursPerWeek: number;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  excluded: boolean;
  absenceType: string | null;
  absenceNote: string | null;
}

interface EmployeeStats {
  employee: Employee;
  weekSurplus: number;
  monthSurplus: number;
  periodSurplus: number;
  periodWorked: number;
  periodDaysWorked: number;
  absenceDays: number;
}

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

// Helper to normalize date to YYYY-MM-DD format
function normalizeDate(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    // If it's an ISO string with time, extract just the date part
    if (dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
    return dateInput;
  }
  return dateInput.toISOString().split('T')[0];
}

// Helper to format date for local comparison (avoiding timezone issues)
function formatLocalDate(year: number, month: number, day: number): string {
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Period filter for global stats
  const [periodStart, setPeriodStart] = useState(() => {
    return '2024-11-01'; // Default to November 2024
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const now = new Date();
    return formatLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const fetchData = useCallback(async () => {
    try {
      const [empRes, entRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/entries'),
      ]);
      const [empData, entData] = await Promise.all([empRes.json(), entRes.json()]);
      setEmployees(empData);
      // Normalize dates in entries
      const normalizedEntries = entData.map((e: TimeEntry) => ({
        ...e,
        date: normalizeDate(e.date),
      }));
      setEntries(normalizedEntries);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekStart = getWeekStart(new Date());

  const employeeStats: EmployeeStats[] = useMemo(() => {
    return employees.map(emp => {
      const empEntries = entries.filter(e => e.employeeId === emp.id);
      const dailyHours = emp.hoursPerWeek / 5;

      // Week surplus - only count days with entries
      const weekStartDate = new Date(weekStart);
      let weekWorked = 0;
      let weekDaysWithEntry = 0;
      let weekExcludedDays = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + i);
        const dateStr = formatLocalDate(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEntry = empEntries.find(e => e.date === dateStr);
        const dayOfWeek = d.getDay();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekday
          if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') {
            weekExcludedDays++;
          } else if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
            weekWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
            weekDaysWithEntry++;
          }
        }
      }
      // Expected based on days with entries only
      const weekExpected = weekDaysWithEntry * dailyHours;
      const weekSurplus = weekWorked - weekExpected;

      // Month surplus
      const year = currentMonth.year;
      const month = currentMonth.month;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let monthWorked = 0;
      let monthDaysWithEntry = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatLocalDate(year, month, day);
        const d = new Date(year, month, day);
        const dayOfWeek = d.getDay();
        const dayEntry = empEntries.find(e => e.date === dateStr);

        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Weekday
          if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') {
            continue; // Skip excluded days
          }
          if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
            monthWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
            monthDaysWithEntry++;
          }
        }
      }
      const monthExpected = monthDaysWithEntry * dailyHours;
      const monthSurplus = monthWorked - monthExpected;

      // Period surplus (filtered by date range)
      const periodEntries = empEntries.filter(e => {
        const entryDate = e.date;
        return entryDate >= periodStart && entryDate <= periodEnd;
      });

      const nonExcludedPeriodEntries = periodEntries.filter(
        e => (!e.excluded || e.absenceType === 'teletravail') && e.entryTime && e.exitTime
      );

      const periodWorked = nonExcludedPeriodEntries.reduce(
        (sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime),
        0
      );
      const periodDaysWorked = nonExcludedPeriodEntries.length;
      const periodExpected = periodDaysWorked * dailyHours;
      const periodSurplus = periodWorked - periodExpected;

      const absenceDays = empEntries.filter(e => e.excluded && e.absenceType !== 'teletravail').length;

      return {
        employee: emp,
        weekSurplus,
        monthSurplus,
        periodSurplus,
        periodWorked,
        periodDaysWorked,
        absenceDays,
      };
    });
  }, [employees, entries, weekStart, currentMonth, periodStart, periodEnd]);

  // Sorted by most surplus
  const sortedStats = [...employeeStats].sort((a, b) => b.periodSurplus - a.periodSurplus);

  // Alerts: employees with > 5h surplus this week
  const weekAlerts = employeeStats.filter(s => s.weekSurplus > 5);

  const globalStats = useMemo(() => {
    const totalSurplus = employeeStats.reduce((sum, s) => sum + s.periodSurplus, 0);
    const totalWorked = employeeStats.reduce((sum, s) => sum + s.periodWorked, 0);
    return { totalSurplus, totalWorked };
  }, [employeeStats]);

  const exportCSV = () => {
    const headers = ['Employe', 'Poste', 'Heures/sem', 'Surplus Semaine', 'Surplus Mois', 'Surplus Periode', 'Heures Travaillees', 'Jours Travailles', 'Jours Absence'];
    const rows = sortedStats.map(s => [
      `${s.employee.firstName} ${s.employee.lastName}`,
      s.employee.position || '',
      s.employee.hoursPerWeek,
      s.weekSurplus.toFixed(2),
      s.monthSurplus.toFixed(2),
      s.periodSurplus.toFixed(2),
      s.periodWorked.toFixed(2),
      s.periodDaysWorked,
      s.absenceDays,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointeuse-export-${periodStart}-${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDetailedCSV = () => {
    const headers = ['Employe', 'Date', 'Entree', 'Sortie', 'Heures', 'Type Absence', 'Note'];
    const rows: string[][] = [];

    employees.forEach(emp => {
      const empEntries = entries
        .filter(e => e.employeeId === emp.id && e.date >= periodStart && e.date <= periodEnd)
        .sort((a, b) => a.date.localeCompare(b.date));

      empEntries.forEach(entry => {
        const worked = calculateWorkedHoursFromStrings(entry.entryTime, entry.exitTime);
        rows.push([
          `${emp.firstName} ${emp.lastName}`,
          entry.date,
          entry.entryTime || '',
          entry.exitTime || '',
          worked > 0 ? worked.toFixed(2) : '',
          entry.absenceType || '',
          entry.absenceNote || '',
        ]);
      });
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointeuse-detail-${periodStart}-${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-2xl font-black">CHARGEMENT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A] pb-8">
      <header className="bg-[#1A1A1A] text-[#F5F0E6] p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">DASHBOARD MANAGER</h1>
          <nav className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-[#E63946] text-white font-bold hover:bg-[#C62D3A] transition">
              POINTER
            </Link>
            <span className="px-4 py-2 bg-[#2D5A9E] text-white font-bold">
              DASHBOARD
            </span>
            <Link href="/setup" className="px-4 py-2 bg-[#F5F0E6] text-[#1A1A1A] font-bold hover:bg-[#FFD23F] transition">
              SETUP
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Alerts */}
        {weekAlerts.length > 0 && (
          <section className="bg-[#E63946] p-4 mb-6 border-4 border-[#1A1A1A]">
            <h2 className="text-xl font-black text-white mb-2">ALERTES HEURES SUPP</h2>
            <div className="space-y-2">
              {weekAlerts.map(s => (
                <div key={s.employee.id} className="bg-white p-3 flex justify-between items-center">
                  <span className="font-bold">{s.employee.firstName} {s.employee.lastName}</span>
                  <span className="font-black text-[#E63946]">{formatHours(s.weekSurplus)} cette semaine</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Period Filter */}
        <section className="bg-[#1A1A1A] p-4 mb-6 border-4 border-[#1A1A1A]">
          <h2 className="text-lg font-black text-[#FFD23F] mb-3">FILTRER PAR PERIODE</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[#F5F0E6] font-bold text-sm">DU</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="p-2 bg-[#F5F0E6] font-medium border-2 border-[#FFD23F]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[#F5F0E6] font-bold text-sm">AU</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="p-2 bg-[#F5F0E6] font-medium border-2 border-[#FFD23F]"
              />
            </div>
            <button
              onClick={() => {
                setPeriodStart('2024-11-01');
                const now = new Date();
                setPeriodEnd(formatLocalDate(now.getFullYear(), now.getMonth(), now.getDate()));
              }}
              className="px-4 py-2 bg-[#2D5A9E] text-white font-bold text-sm hover:bg-[#24487E]"
            >
              TOUT
            </button>
          </div>
        </section>

        {/* Global Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A1A1A] p-6 text-center">
            <p className="text-[#888] font-bold mb-1">SURPLUS PERIODE</p>
            <p className={`text-4xl font-black ${globalStats.totalSurplus >= 0 ? 'text-[#4CAF50]' : 'text-[#E63946]'}`}>
              {formatHours(globalStats.totalSurplus)}
            </p>
            <p className="text-[#666] text-sm mt-1">{periodStart} → {periodEnd}</p>
          </div>

          <div className="bg-[#2D5A9E] p-6">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 bg-[#1A1A1A] text-white font-black hover:bg-[#333]">←</button>
              <h2 className="text-xl font-black text-[#FFD23F]">
                {MONTHS_FR[currentMonth.month]} {currentMonth.year}
              </h2>
              <button onClick={nextMonth} className="p-2 bg-[#1A1A1A] text-white font-black hover:bg-[#333]">→</button>
            </div>
            <p className="text-center text-[#F5F0E6] text-sm mt-2">Colonne MOIS</p>
          </div>

          <div className="bg-[#1A1A1A] p-6 text-center">
            <p className="text-[#888] font-bold mb-1">HEURES PERIODE</p>
            <p className="text-4xl font-black text-[#F5F0E6]">
              {formatHoursSimple(globalStats.totalWorked)}
            </p>
          </div>
        </section>

        {/* Export buttons */}
        <section className="flex gap-4 mb-6">
          <button
            onClick={exportCSV}
            className="px-6 py-3 bg-[#4CAF50] text-white font-bold border-4 border-[#1A1A1A] hover:bg-[#3D8B40] transition"
          >
            EXPORT CSV RESUME
          </button>
          <button
            onClick={exportDetailedCSV}
            className="px-6 py-3 bg-[#2D5A9E] text-white font-bold border-4 border-[#1A1A1A] hover:bg-[#24487E] transition"
          >
            EXPORT CSV DETAIL
          </button>
        </section>

        {/* Employee Table */}
        <section className="overflow-x-auto">
          <table className="w-full border-4 border-[#1A1A1A] bg-white">
            <thead>
              <tr className="bg-[#1A1A1A] text-[#F5F0E6]">
                <th className="p-3 text-left font-black">EMPLOYE</th>
                <th className="p-3 text-center font-black">POSTE</th>
                <th className="p-3 text-center font-black">SEMAINE</th>
                <th className="p-3 text-center font-black">MOIS</th>
                <th className="p-3 text-center font-black">PERIODE</th>
                <th className="p-3 text-center font-black">ABSENCES</th>
                <th className="p-3 text-center font-black">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stat, index) => (
                <tr
                  key={stat.employee.id}
                  className={`border-t-4 border-[#1A1A1A] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F5F0E6]'}`}
                >
                  <td className="p-3">
                    <span className="font-black">{stat.employee.firstName} {stat.employee.lastName}</span>
                    <span className="text-[#888] ml-2 text-sm">{stat.employee.hoursPerWeek}h/sem</span>
                  </td>
                  <td className="p-3 text-center text-[#666]">
                    {stat.employee.position || '-'}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="font-black"
                      style={{ color: stat.weekSurplus >= 0 ? '#4CAF50' : '#E63946' }}
                    >
                      {formatHours(stat.weekSurplus)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="font-black"
                      style={{ color: stat.monthSurplus >= 0 ? '#4CAF50' : '#E63946' }}
                    >
                      {formatHours(stat.monthSurplus)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="font-black text-lg"
                      style={{ color: stat.periodSurplus >= 0 ? '#4CAF50' : '#E63946' }}
                    >
                      {formatHours(stat.periodSurplus)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-[#888]">{stat.absenceDays}j</span>
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/employe/${stat.employee.id}`}
                      className="px-4 py-2 bg-[#2D5A9E] text-white font-bold text-sm hover:bg-[#24487E] transition"
                    >
                      DETAIL
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-[#E63946]"></div>
        <div className="flex-1 bg-[#FFD23F]"></div>
        <div className="flex-1 bg-[#2D5A9E]"></div>
      </footer>
    </div>
  );
}

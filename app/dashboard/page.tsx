'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
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
  avatarUrl: string | null;
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

function normalizeDate(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
    return dateInput;
  }
  return dateInput.toISOString().split('T')[0];
}

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

  const [periodStart, setPeriodStart] = useState('2025-11-01');
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
      setEmployees(Array.isArray(empData) ? empData : []);
      const entriesArray = Array.isArray(entData) ? entData : [];
      const normalizedEntries = entriesArray.map((e: TimeEntry) => ({
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

      // Week surplus
      const weekStartDate = new Date(weekStart);
      let weekWorked = 0;
      let weekDaysWithEntry = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(d.getDate() + i);
        const dateStr = formatLocalDate(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEntry = empEntries.find(e => e.date === dateStr);
        const dayOfWeek = d.getDay();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') continue;
          if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
            weekWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
            weekDaysWithEntry++;
          }
        }
      }
      const weekSurplus = weekWorked - (weekDaysWithEntry * dailyHours);

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

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') continue;
          if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
            monthWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
            monthDaysWithEntry++;
          }
        }
      }
      const monthSurplus = monthWorked - (monthDaysWithEntry * dailyHours);

      // Period surplus
      const periodEntries = empEntries.filter(e => e.date >= periodStart && e.date <= periodEnd);
      const nonExcludedPeriodEntries = periodEntries.filter(
        e => (!e.excluded || e.absenceType === 'teletravail') && e.entryTime && e.exitTime
      );

      const periodWorked = nonExcludedPeriodEntries.reduce(
        (sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0
      );
      const periodDaysWorked = nonExcludedPeriodEntries.length;
      const periodSurplus = periodWorked - (periodDaysWorked * dailyHours);

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

  const sortedStats = [...employeeStats].sort((a, b) => b.periodSurplus - a.periodSurplus);
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const avatarColors = [
    'bg-[#F45757]',
    'bg-[#4A5565]',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-blue-500',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <img
          src="/logo.svg"
          alt="Chargement..."
          className="h-16 w-auto animate-pulse"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-8 relative z-10">
      {/* Header */}
      <Header currentPage="dashboard" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        {weekAlerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="font-medium text-orange-800">Alerte heures supplementaires</span>
            </div>
            <div className="space-y-2">
              {weekAlerts.map(s => (
                <div key={s.employee.id} className="flex justify-between items-center text-sm">
                  <span className="text-orange-700">{s.employee.firstName} {s.employee.lastName}</span>
                  <span className="font-semibold text-orange-800">{formatHours(s.weekSurplus)} cette semaine</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Surplus Card */}
          <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl p-5">
            <p className="text-orange-600 text-xs font-medium mb-2">Surplus periode</p>
            <p className={`text-3xl font-bold ${globalStats.totalSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatHours(globalStats.totalSurplus)}
            </p>
            <p className="text-orange-500 text-xs mt-2">{periodStart} → {periodEnd}</p>
          </div>

          {/* Month Selector */}
          <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200">
            <p className="text-[#4A5565] text-xs font-medium mb-3">Mois affiche</p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 })}
                className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-[#4A5565] hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <p className="font-semibold text-black">{MONTHS_FR[currentMonth.month]}</p>
                <p className="text-xs text-[#4A5565]">{currentMonth.year}</p>
              </div>
              <button
                onClick={() => setCurrentMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 })}
                className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-[#4A5565] hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Hours Worked */}
          <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200">
            <p className="text-[#4A5565] text-xs font-medium mb-2">Heures travaillees</p>
            <p className="text-3xl font-bold text-black">{formatHoursSimple(globalStats.totalWorked)}</p>
            <p className="text-[#4A5565] text-xs mt-2">sur la periode</p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-black">Filtrer la periode</span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#4A5565]">Debut</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#4A5565]">Fin</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="input text-sm"
              />
            </div>
            <button
              onClick={() => {
                setPeriodStart('2025-11-01');
                const now = new Date();
                setPeriodEnd(formatLocalDate(now.getFullYear(), now.getMonth(), now.getDate()));
              }}
              className="btn btn-secondary text-sm"
            >
              Reset
            </button>
            <button onClick={exportCSV} className="btn btn-primary text-sm ml-auto">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Employee Table/Cards */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="p-4 text-left text-xs font-medium text-[#4A5565] uppercase tracking-wider">Employe</th>
                  <th className="p-4 text-center text-xs font-medium text-[#4A5565] uppercase tracking-wider">Semaine</th>
                  <th className="p-4 text-center text-xs font-medium text-[#4A5565] uppercase tracking-wider">Mois</th>
                  <th className="p-4 text-center text-xs font-medium text-[#4A5565] uppercase tracking-wider">Periode</th>
                  <th className="p-4 text-center text-xs font-medium text-[#4A5565] uppercase tracking-wider">Absences</th>
                  <th className="p-4 text-center text-xs font-medium text-[#4A5565] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, index) => {
                  const avatarColor = avatarColors[index % avatarColors.length];

                  return (
                    <tr key={stat.employee.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {stat.employee.avatarUrl ? (
                            <img
                              src={stat.employee.avatarUrl}
                              alt={`${stat.employee.firstName} ${stat.employee.lastName}`}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg ${avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
                              {getInitials(stat.employee.firstName, stat.employee.lastName)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-black">
                              {stat.employee.firstName} {stat.employee.lastName}
                            </p>
                            <p className="text-xs text-[#4A5565]">
                              {stat.employee.position || 'Personnel'} • {stat.employee.hoursPerWeek}h/sem
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-semibold ${stat.weekSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatHours(stat.weekSurplus)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-semibold ${stat.monthSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatHours(stat.monthSurplus)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-lg font-bold ${stat.periodSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatHours(stat.periodSurplus)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="badge badge-accent">{stat.absenceDays}j</span>
                      </td>
                      <td className="p-4 text-center">
                        <Link href={`/employe/${stat.employee.id}`} className="btn btn-secondary text-sm px-3 py-1.5">
                          Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {sortedStats.map((stat, index) => {
              const avatarColor = avatarColors[index % avatarColors.length];

              return (
                <div key={stat.employee.id} className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {stat.employee.avatarUrl ? (
                      <img
                        src={stat.employee.avatarUrl}
                        alt={`${stat.employee.firstName} ${stat.employee.lastName}`}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg ${avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitials(stat.employee.firstName, stat.employee.lastName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black truncate">
                        {stat.employee.firstName} {stat.employee.lastName}
                      </p>
                      <p className="text-xs text-[#4A5565] truncate">
                        {stat.employee.position || 'Personnel'} • {stat.employee.hoursPerWeek}h/sem
                      </p>
                    </div>
                    <Link href={`/employe/${stat.employee.id}`} className="btn btn-secondary text-xs px-2 py-1">
                      Detail
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-gray-100 rounded-lg">
                      <p className="text-[10px] text-[#4A5565] mb-1">Semaine</p>
                      <p className={`text-sm font-semibold ${stat.weekSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatHours(stat.weekSurplus)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-100 rounded-lg">
                      <p className="text-[10px] text-[#4A5565] mb-1">Mois</p>
                      <p className={`text-sm font-semibold ${stat.monthSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatHours(stat.monthSurplus)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 border border-dashed border-orange-300 rounded-lg">
                      <p className="text-[10px] text-orange-600 mb-1">Periode</p>
                      <p className={`text-sm font-semibold ${stat.periodSurplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatHours(stat.periodSurplus)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-100 rounded-lg">
                      <p className="text-[10px] text-[#4A5565] mb-1">Abs.</p>
                      <p className="text-sm font-semibold text-[#4A5565]">{stat.absenceDays}j</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  calculateWorkedHoursFromStrings,
  formatHours,
  formatHoursSimple,
  getTodayDate,
  getWeekStart,
  getMonthKey,
} from '@/lib/utils';
import { ABSENCE_TYPES } from '@/db/schema';

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
}

interface LocalEntry {
  entryTime: string;
  exitTime: string;
  excluded: boolean;
  absenceType: string | null;
  saved: boolean;
  saving: boolean;
}

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

export default function PointeusePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [localEntries, setLocalEntries] = useState<Record<string, LocalEntry>>({});
  const [excludeModalFor, setExcludeModalFor] = useState<string | null>(null);
  const [globalPeriod, setGlobalPeriod] = useState<'week' | 'month' | 'total'>('total');

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

  useEffect(() => {
    const newLocalEntries: Record<string, LocalEntry> = {};
    employees.forEach(emp => {
      const existing = entries.find(e => e.employeeId === emp.id && e.date === selectedDate);
      newLocalEntries[emp.id] = {
        entryTime: existing?.entryTime || '',
        exitTime: existing?.exitTime || '',
        excluded: existing?.excluded || false,
        absenceType: existing?.absenceType || null,
        saved: true,
        saving: false,
      };
    });
    setLocalEntries(newLocalEntries);
  }, [employees, entries, selectedDate]);

  const updateLocalEntry = (employeeId: string, field: 'entryTime' | 'exitTime' | 'excluded' | 'absenceType', value: string | boolean | null) => {
    setLocalEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
        saved: false,
      },
    }));
  };

  const saveEntry = async (employeeId: string) => {
    const local = localEntries[employeeId];
    if (!local) return;

    setLocalEntries(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], saving: true },
    }));

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: selectedDate,
          entryTime: local.entryTime || null,
          exitTime: local.exitTime || null,
          excluded: local.excluded,
          absenceType: local.absenceType,
        }),
      });

      if (res.ok) {
        const savedEntry = await res.json();
        setEntries(prev => {
          const filtered = prev.filter(e => !(e.employeeId === employeeId && e.date === selectedDate));
          return [...filtered, { ...savedEntry, date: normalizeDate(savedEntry.date) }];
        });
        setLocalEntries(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], saved: true, saving: false },
        }));
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      setLocalEntries(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], saving: false },
      }));
    }
  };

  const handleExcludeWithReason = (employeeId: string, absenceType: string) => {
    setLocalEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        excluded: true,
        absenceType,
        saved: false,
      },
    }));
    setExcludeModalFor(null);
  };

  const handleCancelExclusion = (employeeId: string) => {
    setLocalEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        excluded: false,
        absenceType: null,
        saved: false,
      },
    }));
  };

  const weekStart = getWeekStart(new Date(selectedDate));
  const monthKey = getMonthKey(new Date(selectedDate));

  const calculateDaySurplus = (employee: Employee, date: string): number => {
    const dayEntry = entries.find(e => e.employeeId === employee.id && e.date === date);
    if (!dayEntry || dayEntry.excluded) return 0;
    if (!dayEntry.entryTime || !dayEntry.exitTime) return -(employee.hoursPerWeek / 5);
    const worked = calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
    const expected = employee.hoursPerWeek / 5;
    return worked - expected;
  };

  const calculateWeekSurplus = (employee: Employee, weekStartDate: string): number => {
    const weekStartObj = new Date(weekStartDate);
    let totalWorked = 0;
    let daysWithEntry = 0;
    const dailyHours = employee.hoursPerWeek / 5;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartObj);
      d.setDate(d.getDate() + i);
      const dateStr = formatLocalDate(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEntry = entries.find(e => e.employeeId === employee.id && e.date === dateStr);
      const dayOfWeek = d.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        if (dayEntry?.excluded) continue;
        if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
          totalWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
          daysWithEntry++;
        }
      }
    }

    return totalWorked - (daysWithEntry * dailyHours);
  };

  const calculateMonthSurplus = (employee: Employee, month: string): number => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const dailyHours = employee.hoursPerWeek / 5;

    let totalWorked = 0;
    let daysWithEntry = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthNum - 1, day);
      const dayOfWeek = d.getDay();
      const dateStr = formatLocalDate(year, monthNum - 1, day);
      const dayEntry = entries.find(e => e.employeeId === employee.id && e.date === dateStr);

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        if (dayEntry?.excluded) continue;
        if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
          totalWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
          daysWithEntry++;
        }
      }
    }

    return totalWorked - (daysWithEntry * dailyHours);
  };

  const calculateTotalSurplus = (employee: Employee): number => {
    const employeeEntries = entries.filter(
      e => e.employeeId === employee.id && !e.excluded && e.entryTime && e.exitTime
    );
    const totalWorked = employeeEntries.reduce(
      (sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0
    );
    const daysWorked = employeeEntries.length;
    return totalWorked - (daysWorked * (employee.hoursPerWeek / 5));
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(formatLocalDate(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(formatLocalDate(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const globalStats = useMemo(() => {
    let totalWorked = 0;
    let totalExpected = 0;

    // Calculate date range based on period
    const getDateRange = () => {
      const selected = new Date(selectedDate);
      if (globalPeriod === 'week') {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
      } else if (globalPeriod === 'month') {
        const [year, month] = monthKey.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return { start, end };
      }
      return null; // total = no filter
    };

    const range = getDateRange();

    employees.forEach(emp => {
      let empEntries = entries.filter(
        e => e.employeeId === emp.id && !e.excluded && e.entryTime && e.exitTime
      );

      // Filter by date range if not total
      if (range) {
        empEntries = empEntries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate >= range.start && entryDate <= range.end;
        });
      }

      totalWorked += empEntries.reduce(
        (sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0
      );
      const daysWorked = empEntries.length;
      totalExpected += daysWorked * (emp.hoursPerWeek / 5);
    });

    return {
      totalWorked,
      totalExpected,
      surplus: totalWorked - totalExpected,
    };
  }, [employees, entries, globalPeriod, selectedDate, weekStart, monthKey]);

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
      <Header currentPage="pointer" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Date & Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Picker Card */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#4A5565]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[#4A5565]">Date</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDay}
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-[#F45757] hover:text-white text-[#4A5565] flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input flex-1 text-lg font-semibold text-black text-center"
              />
              <button
                onClick={goToNextDay}
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-[#F45757] hover:text-white text-[#4A5565] flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Global Stats Card */}
          <div className="bg-[#EEF2FF] border border-[#2A3EF7]/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2A3EF7]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#2A3EF7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#2A3EF7]">Bilan global</span>
              </div>
              <div className="flex bg-white/50 rounded-lg p-0.5">
                <button
                  onClick={() => setGlobalPeriod('week')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    globalPeriod === 'week'
                      ? 'bg-[#2A3EF7] text-white'
                      : 'text-[#2A3EF7]/70 hover:text-[#2A3EF7]'
                  }`}
                >
                  Sem.
                </button>
                <button
                  onClick={() => setGlobalPeriod('month')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    globalPeriod === 'month'
                      ? 'bg-[#2A3EF7] text-white'
                      : 'text-[#2A3EF7]/70 hover:text-[#2A3EF7]'
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setGlobalPeriod('total')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    globalPeriod === 'total'
                      ? 'bg-[#2A3EF7] text-white'
                      : 'text-[#2A3EF7]/70 hover:text-[#2A3EF7]'
                  }`}
                >
                  Total
                </button>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-3xl font-bold ${globalStats.surplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatHours(globalStats.surplus)}
                </p>
                <p className="text-sm text-[#2A3EF7]/70 mt-1">
                  {formatHoursSimple(globalStats.totalWorked)} / {formatHoursSimple(globalStats.totalExpected)}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${globalStats.surplus >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {globalStats.surplus >= 0 ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                <span className={`text-xs font-medium ${globalStats.surplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {globalStats.surplus >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Employees */}
        {employees.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-black font-medium mb-2">Aucun employe</p>
            <p className="text-sm text-[#4A5565] mb-4">Configurez votre equipe pour commencer</p>
            <Link href="/setup" className="btn btn-primary">
              Configurer
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee, index) => {
              const local = localEntries[employee.id] || { entryTime: '', exitTime: '', excluded: false, saved: true, saving: false };
              const worked = calculateWorkedHoursFromStrings(local.entryTime, local.exitTime);
              const daySurplus = calculateDaySurplus(employee, selectedDate);
              const weekSurplus = calculateWeekSurplus(employee, weekStart);
              const monthSurplus = calculateMonthSurplus(employee, monthKey);
              const totalSurplus = calculateTotalSurplus(employee);
              const avatarColor = avatarColors[index % avatarColors.length];

              return (
                <div
                  key={employee.id}
                  className={`bg-white rounded-xl p-3 sm:p-5 border border-gray-200 shadow-sm transition-all hover:shadow-md ${local.excluded ? 'opacity-60' : ''}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <Link href={`/employe/${employee.id}`} className="flex items-center gap-2 hover:opacity-80 transition group">
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#F45757] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {employee.avatarUrl ? (
                        <img
                          src={employee.avatarUrl}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-11 h-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center text-white font-semibold`}>
                          {getInitials(employee.firstName, employee.lastName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-black truncate">{employee.firstName} {employee.lastName}</h3>
                        <p className="text-xs sm:text-sm text-[#4A5565] truncate">{employee.position || 'Personnel'} • {employee.hoursPerWeek}h/sem</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {local.excluded ? (
                        <span className="badge badge-warning">Exclu</span>
                      ) : local.entryTime && local.exitTime ? (
                        <span className="badge badge-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Pointe
                        </span>
                      ) : (
                        <span className="badge badge-accent">En attente</span>
                      )}
                    </div>
                  </div>

                  {/* Time inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center">
                            <svg className="w-3 h-3 text-[#4A5565]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                            </svg>
                          </div>
                          <span className="text-xs font-medium text-[#4A5565]">Arrivee</span>
                        </div>
                        {local.entryTime && !local.excluded && (
                          <button
                            onClick={() => updateLocalEntry(employee.id, 'entryTime', '')}
                            className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
                            title="Effacer"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <input
                        type="time"
                        value={local.entryTime}
                        onChange={(e) => updateLocalEntry(employee.id, 'entryTime', e.target.value)}
                        disabled={local.excluded}
                        className="w-full bg-transparent text-lg font-bold text-black border-none focus:outline-none disabled:text-gray-400"
                      />
                    </div>

                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                          <span className="text-xs font-medium text-[#4A5565]">Depart</span>
                        </div>
                        {local.exitTime && !local.excluded && (
                          <button
                            onClick={() => updateLocalEntry(employee.id, 'exitTime', '')}
                            className="w-5 h-5 rounded-full bg-orange-100 hover:bg-red-100 text-orange-400 hover:text-red-500 flex items-center justify-center transition-all"
                            title="Effacer"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <input
                        type="time"
                        value={local.exitTime}
                        onChange={(e) => updateLocalEntry(employee.id, 'exitTime', e.target.value)}
                        disabled={local.excluded}
                        className="w-full bg-transparent text-lg font-bold text-black border-none focus:outline-none disabled:text-gray-400"
                      />
                    </div>

                    <div className="p-3">
                      <p className="text-[#4A5565] text-xs font-medium mb-2">Duree</p>
                      <p className="text-xl font-bold text-black">
                        {local.excluded ? '--:--' : formatHoursSimple(worked)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 relative">
                      <button
                        onClick={() => local.excluded ? handleCancelExclusion(employee.id) : setExcludeModalFor(employee.id)}
                        className={`flex-1 rounded-lg text-sm font-medium transition-all ${
                          local.excluded
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            : 'bg-gray-100 text-[#4A5565] hover:bg-gray-200'
                        }`}
                      >
                        {local.excluded && local.absenceType
                          ? ABSENCE_TYPES[local.absenceType as keyof typeof ABSENCE_TYPES]?.label || 'Exclu'
                          : local.excluded ? 'Exclu' : 'Exclure'}
                      </button>

                      {/* Modal exclusion */}
                      {excludeModalFor === employee.id && (
                        <div className="absolute top-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[180px]">
                          <p className="text-xs font-medium text-[#4A5565] px-2 py-1 mb-1">Motif d'absence</p>
                          {Object.entries(ABSENCE_TYPES).map(([key, { label, color }]) => (
                            <button
                              key={key}
                              onClick={() => handleExcludeWithReason(employee.id, key)}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => setExcludeModalFor(null)}
                            className="w-full text-center px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition mt-1"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                      {/* Bouton sauvegarde */}
                      <button
                        onClick={() => saveEntry(employee.id)}
                        disabled={local.saved || local.saving}
                        className={`flex-1 rounded-lg text-sm font-medium transition-all ${
                          local.saving
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : local.saved
                            ? 'bg-emerald-50 text-emerald-600 cursor-default'
                            : 'bg-[#F45757] text-white hover:bg-[#E04646]'
                        }`}
                      >
                        {local.saving ? '...' : local.saved ? '✓ Enregistré' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
                    <StatBox label="Jour" value={daySurplus} excluded={local.excluded} />
                    <StatBox label="Semaine" value={weekSurplus} />
                    <StatBox label="Mois" value={monthSurplus} />
                    <StatBox label="Total" value={totalSurplus} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({ label, value, excluded = false }: {
  label: string;
  value: number;
  excluded?: boolean;
}) {
  const isPositive = value >= 0;

  return (
    <div className="p-2 text-center">
      <p className="text-[10px] font-medium mb-1 text-[#9CA3AF]">
        {label}
      </p>
      <p className={`text-sm font-bold ${
        excluded
          ? 'text-gray-400'
          : isPositive ? 'text-emerald-600' : 'text-red-500'
      }`}>
        {excluded ? '--:--' : formatHours(value)}
      </p>
    </div>
  );
}

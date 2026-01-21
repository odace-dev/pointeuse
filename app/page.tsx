'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  calculateWorkedHoursFromStrings,
  formatHours,
  formatHoursSimple,
  getTodayDate,
  getWeekStart,
  getMonthKey,
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
}

interface LocalEntry {
  entryTime: string;
  exitTime: string;
  saved: boolean;
  saving: boolean;
}

export default function PointeusePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(true);
  const [localEntries, setLocalEntries] = useState<Record<string, LocalEntry>>({});

  // Fetch employees and entries
  const fetchData = useCallback(async () => {
    try {
      const [empRes, entRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/entries'),
      ]);
      const [empData, entData] = await Promise.all([empRes.json(), entRes.json()]);
      setEmployees(empData);
      setEntries(entData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize local entries when date or entries change
  useEffect(() => {
    const newLocalEntries: Record<string, LocalEntry> = {};
    employees.forEach(emp => {
      const existing = entries.find(e => e.employeeId === emp.id && e.date === selectedDate);
      newLocalEntries[emp.id] = {
        entryTime: existing?.entryTime || '',
        exitTime: existing?.exitTime || '',
        saved: true,
        saving: false,
      };
    });
    setLocalEntries(newLocalEntries);
  }, [employees, entries, selectedDate]);

  const updateLocalEntry = (employeeId: string, field: 'entryTime' | 'exitTime', value: string) => {
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
        }),
      });

      if (res.ok) {
        const savedEntry = await res.json();
        setEntries(prev => {
          const filtered = prev.filter(e => !(e.employeeId === employeeId && e.date === selectedDate));
          return [...filtered, savedEntry];
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

  const weekStart = getWeekStart(new Date(selectedDate));
  const monthKey = getMonthKey(new Date(selectedDate));

  const calculateDaySurplus = (employee: Employee, date: string): number => {
    const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === date);
    const worked = dayEntries.reduce((sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0);
    const expected = employee.hoursPerWeek / 5;
    return worked - expected;
  };

  const calculateWeekSurplus = (employee: Employee, weekStartDate: string): number => {
    const weekStartObj = new Date(weekStartDate);
    let totalWorked = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartObj);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === dateStr);
      totalWorked += dayEntries.reduce((sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0);
    }

    return totalWorked - employee.hoursPerWeek;
  };

  const calculateMonthSurplus = (employee: Employee, month: string): number => {
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    let totalWorked = 0;
    let workDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthNum - 1, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.employeeId === employee.id && e.date === dateStr);
      totalWorked += dayEntries.reduce((sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0);
    }

    const expectedMonthly = (employee.hoursPerWeek / 5) * workDays;
    return totalWorked - expectedMonthly;
  };

  const calculateTotalSurplus = (employee: Employee): number => {
    const employeeEntries = entries.filter(e => e.employeeId === employee.id);
    const totalWorked = employeeEntries.reduce((sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0);
    const dates = [...new Set(employeeEntries.map(e => e.date))];
    const expectedTotal = dates.length * (employee.hoursPerWeek / 5);
    return totalWorked - expectedTotal;
  };

  const globalStats = useMemo(() => {
    let totalWorked = 0;
    let totalExpected = 0;

    employees.forEach(emp => {
      const empEntries = entries.filter(e => e.employeeId === emp.id);
      totalWorked += empEntries.reduce((sum, e) => sum + calculateWorkedHoursFromStrings(e.entryTime, e.exitTime), 0);
      const days = new Set(empEntries.map(e => e.date)).size;
      totalExpected += days * (emp.hoursPerWeek / 5);
    });

    return {
      totalWorked,
      totalExpected,
      surplus: totalWorked - totalExpected,
    };
  }, [employees, entries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-2xl font-black">CHARGEMENT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A] pb-8">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-[#F5F0E6] p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-black tracking-tight">POINTEUSE</h1>
          <nav className="flex gap-4">
            <span className="px-4 py-2 bg-[#E63946] text-white font-bold">
              POINTER
            </span>
            <Link href="/setup" className="px-4 py-2 bg-[#F5F0E6] text-[#1A1A1A] font-bold hover:bg-[#FFD23F] transition">
              SETUP
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Date Selector & Global Stats */}
        <section className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="bg-[#2D5A9E] p-6 flex-1">
            <label className="block text-[#FFD23F] font-black mb-2 text-lg">DATE</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 bg-[#F5F0E6] text-[#1A1A1A] font-bold text-xl border-4 border-[#1A1A1A] focus:border-[#FFD23F] outline-none"
            />
          </div>

          <div className="bg-[#1A1A1A] p-6 flex-1 text-center">
            <p className="text-[#888] font-bold mb-1">BILAN GLOBAL</p>
            <p className={`text-4xl font-black ${globalStats.surplus >= 0 ? 'text-[#4CAF50]' : 'text-[#E63946]'}`}>
              {formatHours(globalStats.surplus)}
            </p>
            <p className="text-[#F5F0E6] mt-2">
              {formatHoursSimple(globalStats.totalWorked)} / {formatHoursSimple(globalStats.totalExpected)}
            </p>
          </div>
        </section>

        {/* Employees List */}
        {employees.length === 0 ? (
          <div className="bg-[#FFD23F] p-8 text-center border-4 border-[#1A1A1A]">
            <p className="text-2xl font-black mb-4">AUCUN EMPLOYE</p>
            <Link href="/setup" className="inline-block px-6 py-3 bg-[#1A1A1A] text-[#F5F0E6] font-bold hover:bg-[#333] transition">
              CONFIGURER LES EMPLOYES
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {employees.map((employee, index) => {
              const local = localEntries[employee.id] || { entryTime: '', exitTime: '', saved: true, saving: false };
              const worked = calculateWorkedHoursFromStrings(local.entryTime, local.exitTime);
              const daySurplus = calculateDaySurplus(employee, selectedDate);
              const weekSurplus = calculateWeekSurplus(employee, weekStart);
              const monthSurplus = calculateMonthSurplus(employee, monthKey);
              const totalSurplus = calculateTotalSurplus(employee);

              const accentColor = index % 3 === 0 ? '#E63946' : index % 3 === 1 ? '#2D5A9E' : '#FFD23F';

              return (
                <div
                  key={employee.id}
                  className="bg-white border-4 border-[#1A1A1A] overflow-hidden"
                >
                  {/* Employee Header */}
                  <div
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    style={{ borderLeft: `8px solid ${accentColor}` }}
                  >
                    <Link href={`/employe/${employee.id}`} className="hover:opacity-80 transition">
                      <h3 className="text-2xl font-black">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-[#666] font-medium">
                        {employee.position || 'Employe'} — {employee.hoursPerWeek}h/sem
                      </p>
                    </Link>

                    {/* Time Inputs */}
                    <div className="flex gap-3 flex-wrap items-end">
                      <div>
                        <label className="block text-sm font-bold text-[#666] mb-1">ENTREE</label>
                        <input
                          type="time"
                          value={local.entryTime}
                          onChange={(e) => updateLocalEntry(employee.id, 'entryTime', e.target.value)}
                          className="p-2 bg-[#F5F0E6] border-4 border-[#1A1A1A] font-bold text-lg w-32"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-[#666] mb-1">SORTIE</label>
                        <input
                          type="time"
                          value={local.exitTime}
                          onChange={(e) => updateLocalEntry(employee.id, 'exitTime', e.target.value)}
                          className="p-2 bg-[#F5F0E6] border-4 border-[#1A1A1A] font-bold text-lg w-32"
                        />
                      </div>
                      <div className="text-center">
                        <label className="block text-sm font-bold text-[#666] mb-1">FAIT</label>
                        <p className="p-2 font-black text-lg bg-[#1A1A1A] text-[#F5F0E6] w-20">
                          {formatHoursSimple(worked)}
                        </p>
                      </div>
                      <button
                        onClick={() => saveEntry(employee.id)}
                        disabled={local.saved || local.saving}
                        className={`p-2 px-4 font-bold text-lg border-4 border-[#1A1A1A] transition h-[52px] ${
                          local.saved
                            ? 'bg-[#4CAF50] text-white cursor-default'
                            : local.saving
                            ? 'bg-[#888] text-white cursor-wait'
                            : 'bg-[#FFD23F] text-[#1A1A1A] hover:bg-[#E6BD38] cursor-pointer'
                        }`}
                      >
                        {local.saving ? '...' : local.saved ? 'OK' : 'ENREGISTRER'}
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 border-t-4 border-[#1A1A1A]">
                    <StatBox label="JOUR" value={daySurplus} />
                    <StatBox label="SEMAINE" value={weekSurplus} />
                    <StatBox label="MOIS" value={monthSurplus} />
                    <StatBox label="TOTAL" value={totalSurplus} highlight />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-[#E63946]"></div>
        <div className="flex-1 bg-[#FFD23F]"></div>
        <div className="flex-1 bg-[#2D5A9E]"></div>
      </footer>
    </div>
  );
}

function StatBox({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  const isPositive = value >= 0;
  const bgColor = highlight ? '#1A1A1A' : 'transparent';

  return (
    <div
      className="p-4 text-center border-r-4 border-[#1A1A1A] last:border-r-0"
      style={{ backgroundColor: bgColor }}
    >
      <p className="text-xs font-bold mb-1" style={{ color: highlight ? '#888' : '#666' }}>
        {label}
      </p>
      <p
        className="text-xl font-black"
        style={{ color: isPositive ? '#4CAF50' : '#E63946' }}
      >
        {formatHours(value)}
      </p>
    </div>
  );
}

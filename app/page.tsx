'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { Employee, TimeEntry } from '@/lib/types';
import {
  generateId,
  calculateWorkedHours,
  formatHours,
  formatHoursSimple,
  calculateDaySurplus,
  calculateWeekSurplus,
  calculateMonthSurplus,
  calculateTotalSurplus,
  getTodayDate,
  getWeekStart,
  getMonthKey,
} from '@/lib/utils';

export default function PointeusePage() {
  const [employees] = useLocalStorage<Employee[]>('pointeuse-employees', []);
  const [entries, setEntries] = useLocalStorage<TimeEntry[]>('pointeuse-entries', []);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const todayEntries = useMemo(() => {
    return employees.map(emp => {
      const existing = entries.find(e => e.employeeId === emp.id && e.date === selectedDate);
      return existing || {
        id: generateId(),
        employeeId: emp.id,
        date: selectedDate,
        entryTime: null,
        exitTime: null,
      };
    });
  }, [employees, entries, selectedDate]);

  const updateEntry = (employeeId: string, field: 'entryTime' | 'exitTime', value: string) => {
    const existingIndex = entries.findIndex(e => e.employeeId === employeeId && e.date === selectedDate);

    if (existingIndex >= 0) {
      const updated = [...entries];
      updated[existingIndex] = { ...updated[existingIndex], [field]: value || null };
      setEntries(updated);
    } else {
      const newEntry: TimeEntry = {
        id: generateId(),
        employeeId,
        date: selectedDate,
        entryTime: field === 'entryTime' ? value || null : null,
        exitTime: field === 'exitTime' ? value || null : null,
      };
      setEntries([...entries, newEntry]);
    }
  };

  const weekStart = getWeekStart(new Date(selectedDate));
  const monthKey = getMonthKey(new Date(selectedDate));

  const globalStats = useMemo(() => {
    let totalWorked = 0;
    let totalExpected = 0;

    employees.forEach(emp => {
      const empEntries = entries.filter(e => e.employeeId === emp.id);
      totalWorked += empEntries.reduce((sum, e) => sum + calculateWorkedHours(e), 0);
      const days = new Set(empEntries.map(e => e.date)).size;
      totalExpected += days * (emp.hoursPerWeek / 5);
    });

    return {
      totalWorked,
      totalExpected,
      surplus: totalWorked - totalExpected,
    };
  }, [employees, entries]);

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
              const entry = todayEntries.find(e => e.employeeId === employee.id);
              const worked = entry ? calculateWorkedHours(entry) : 0;
              const daySurplus = calculateDaySurplus(employee, entries, selectedDate);
              const weekSurplus = calculateWeekSurplus(employee, entries, weekStart);
              const monthSurplus = calculateMonthSurplus(employee, entries, monthKey);
              const totalSurplus = calculateTotalSurplus(employee, entries);

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
                    <div>
                      <h3 className="text-2xl font-black">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-[#666] font-medium">
                        {employee.position || 'Employe'} — {employee.hoursPerWeek}h/sem
                      </p>
                    </div>

                    {/* Time Inputs */}
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="block text-sm font-bold text-[#666] mb-1">ENTREE</label>
                        <input
                          type="time"
                          value={entry?.entryTime || ''}
                          onChange={(e) => updateEntry(employee.id, 'entryTime', e.target.value)}
                          className="p-2 bg-[#F5F0E6] border-4 border-[#1A1A1A] font-bold text-lg w-32"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-[#666] mb-1">SORTIE</label>
                        <input
                          type="time"
                          value={entry?.exitTime || ''}
                          onChange={(e) => updateEntry(employee.id, 'exitTime', e.target.value)}
                          className="p-2 bg-[#F5F0E6] border-4 border-[#1A1A1A] font-bold text-lg w-32"
                        />
                      </div>
                      <div className="text-center">
                        <label className="block text-sm font-bold text-[#666] mb-1">FAIT</label>
                        <p className="p-2 font-black text-lg bg-[#1A1A1A] text-[#F5F0E6] w-20">
                          {formatHoursSimple(worked)}
                        </p>
                      </div>
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

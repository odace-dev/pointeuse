'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  calculateWorkedHoursFromStrings,
  formatHours,
  formatHoursSimple,
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

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const fetchData = useCallback(async () => {
    try {
      const [empRes, entRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/entries?employeeId=${employeeId}`),
      ]);
      const [empData, entData] = await Promise.all([empRes.json(), entRes.json()]);
      const emp = empData.find((e: Employee) => e.id === employeeId);
      setEmployee(emp || null);
      setEntries(entData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const daysInMonth = useMemo(() => {
    const days: { date: Date; dateStr: string; isWeekend: boolean; dayName: string }[] = [];
    const numDays = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();

    for (let day = 1; day <= numDays; day++) {
      const date = new Date(currentMonth.year, currentMonth.month, day);
      const dayOfWeek = date.getDay();
      days.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayName: DAYS_FR[dayOfWeek],
      });
    }

    return days;
  }, [currentMonth]);

  const monthStats = useMemo(() => {
    if (!employee) return { worked: 0, expected: 0, surplus: 0 };

    let totalWorked = 0;
    let workDays = 0;

    daysInMonth.forEach(day => {
      if (!day.isWeekend) workDays++;
      const dayEntry = entries.find(e => e.date === day.dateStr);
      if (dayEntry) {
        totalWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
      }
    });

    const expected = (employee.hoursPerWeek / 5) * workDays;
    return {
      worked: totalWorked,
      expected,
      surplus: totalWorked - expected,
    };
  }, [employee, entries, daysInMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-2xl font-black">CHARGEMENT...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center flex-col gap-4">
        <div className="text-2xl font-black">EMPLOYE NON TROUVE</div>
        <Link href="/" className="px-6 py-3 bg-[#E63946] text-white font-bold">
          RETOUR
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A] pb-8">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-[#F5F0E6] p-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <Link href="/" className="text-[#888] hover:text-[#FFD23F] transition text-sm font-bold">
              ← RETOUR
            </Link>
            <h1 className="text-3xl font-black tracking-tight">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-[#888]">
              {employee.position || 'Employe'} — {employee.hoursPerWeek}h/sem
            </p>
          </div>
          <nav className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-[#E63946] text-white font-bold hover:bg-[#C62D3A] transition">
              POINTER
            </Link>
            <Link href="/setup" className="px-4 py-2 bg-[#F5F0E6] text-[#1A1A1A] font-bold hover:bg-[#FFD23F] transition">
              SETUP
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Month Navigation & Stats */}
        <section className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="bg-[#2D5A9E] p-6 flex-1">
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="p-2 bg-[#1A1A1A] text-[#F5F0E6] font-black hover:bg-[#333] transition"
              >
                ←
              </button>
              <h2 className="text-2xl font-black text-[#FFD23F]">
                {MONTHS_FR[currentMonth.month]} {currentMonth.year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 bg-[#1A1A1A] text-[#F5F0E6] font-black hover:bg-[#333] transition"
              >
                →
              </button>
            </div>
          </div>

          <div className="bg-[#1A1A1A] p-6 flex-1 text-center">
            <p className="text-[#888] font-bold mb-1">BILAN DU MOIS</p>
            <p className={`text-4xl font-black ${monthStats.surplus >= 0 ? 'text-[#4CAF50]' : 'text-[#E63946]'}`}>
              {formatHours(monthStats.surplus)}
            </p>
            <p className="text-[#F5F0E6] mt-2">
              {formatHoursSimple(monthStats.worked)} / {formatHoursSimple(monthStats.expected)}
            </p>
          </div>
        </section>

        {/* Days List */}
        <section className="space-y-2">
          {daysInMonth.map((day, index) => {
            const entry = entries.find(e => e.date === day.dateStr);
            const worked = entry ? calculateWorkedHoursFromStrings(entry.entryTime, entry.exitTime) : 0;
            const expected = day.isWeekend ? 0 : employee.hoursPerWeek / 5;
            const surplus = worked - expected;

            const accentColor = index % 3 === 0 ? '#E63946' : index % 3 === 1 ? '#2D5A9E' : '#FFD23F';

            return (
              <div
                key={day.dateStr}
                className={`border-4 border-[#1A1A1A] flex items-center ${
                  day.isWeekend ? 'bg-[#E8E3D9] opacity-60' : 'bg-white'
                }`}
                style={{ borderLeftColor: accentColor, borderLeftWidth: '6px' }}
              >
                {/* Date */}
                <div className="p-3 w-24 text-center border-r-4 border-[#1A1A1A]">
                  <p className="text-2xl font-black">{day.date.getDate()}</p>
                  <p className="text-xs font-bold text-[#666]">{day.dayName}</p>
                </div>

                {/* Times */}
                <div className="flex-1 p-3 flex items-center gap-4">
                  {entry?.entryTime && entry?.exitTime ? (
                    <>
                      <span className="font-bold text-[#666]">
                        {entry.entryTime} → {entry.exitTime}
                      </span>
                      <span className="font-black">
                        {formatHoursSimple(worked)}
                      </span>
                    </>
                  ) : day.isWeekend ? (
                    <span className="text-[#888] font-medium">Week-end</span>
                  ) : (
                    <span className="text-[#888] font-medium">Non pointe</span>
                  )}
                </div>

                {/* Surplus */}
                {!day.isWeekend && (
                  <div className="p-3 w-24 text-center">
                    <p
                      className="font-black"
                      style={{ color: surplus >= 0 ? '#4CAF50' : '#E63946' }}
                    >
                      {formatHours(surplus)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </section>
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

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
  excluded: boolean;
  absenceType: string | null;
  absenceNote: string | null;
}

const ABSENCE_TYPES = {
  conge: { label: 'Congé', color: '#2D5A9E' },
  maladie: { label: 'Maladie', color: '#E63946' },
  rtt: { label: 'RTT', color: '#FFD23F' },
  teletravail: { label: 'Télétravail', color: '#4CAF50' },
  formation: { label: 'Formation', color: '#9C27B0' },
  autre: { label: 'Autre', color: '#888' },
} as const;

const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface EditingDay {
  dateStr: string;
  entryTime: string;
  exitTime: string;
  absenceType: string;
  absenceNote: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDays, setSavingDays] = useState<Record<string, boolean>>({});
  const [editingDay, setEditingDay] = useState<EditingDay | null>(null);
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

  const openEditModal = (dateStr: string) => {
    const entry = entries.find(e => e.date === dateStr);
    setEditingDay({
      dateStr,
      entryTime: entry?.entryTime || '',
      exitTime: entry?.exitTime || '',
      absenceType: entry?.absenceType || '',
      absenceNote: entry?.absenceNote || '',
    });
  };

  const saveEditedDay = async () => {
    if (!editingDay) return;

    setSavingDays(prev => ({ ...prev, [editingDay.dateStr]: true }));

    try {
      const isAbsence = !!editingDay.absenceType;
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: editingDay.dateStr,
          entryTime: isAbsence ? null : (editingDay.entryTime || null),
          exitTime: isAbsence ? null : (editingDay.exitTime || null),
          excluded: isAbsence,
          absenceType: editingDay.absenceType || null,
          absenceNote: editingDay.absenceNote || null,
        }),
      });

      if (res.ok) {
        const savedEntry = await res.json();
        setEntries(prev => {
          const filtered = prev.filter(e => e.date !== editingDay.dateStr);
          return [...filtered, savedEntry];
        });
        setEditingDay(null);
      }
    } catch (error) {
      console.error('Error saving day:', error);
    } finally {
      setSavingDays(prev => ({ ...prev, [editingDay.dateStr]: false }));
    }
  };

  const clearDay = async (dateStr: string) => {
    setSavingDays(prev => ({ ...prev, [dateStr]: true }));

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: dateStr,
          entryTime: null,
          exitTime: null,
          excluded: false,
          absenceType: null,
          absenceNote: null,
        }),
      });

      if (res.ok) {
        const savedEntry = await res.json();
        setEntries(prev => {
          const filtered = prev.filter(e => e.date !== dateStr);
          return [...filtered, savedEntry];
        });
      }
    } catch (error) {
      console.error('Error clearing day:', error);
    } finally {
      setSavingDays(prev => ({ ...prev, [dateStr]: false }));
    }
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
      const dayEntry = entries.find(e => e.date === day.dateStr);

      // Skip if excluded/absence (except télétravail which counts as work)
      if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') return;

      if (!day.isWeekend) workDays++;
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
            <Link href="/dashboard" className="px-4 py-2 bg-[#2D5A9E] text-white font-bold hover:bg-[#24487E] transition">
              DASHBOARD
            </Link>
            <Link href="/setup" className="px-4 py-2 bg-[#F5F0E6] text-[#1A1A1A] font-bold hover:bg-[#FFD23F] transition">
              SETUP
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
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

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(ABSENCE_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#1A1A1A]" style={{ backgroundColor: color }}></div>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        <section className="space-y-2">
          {daysInMonth.map((day, index) => {
            const entry = entries.find(e => e.date === day.dateStr);
            const isAbsence = entry?.excluded || false;
            const absenceType = entry?.absenceType as keyof typeof ABSENCE_TYPES | null;
            const isSaving = savingDays[day.dateStr] || false;
            const worked = entry ? calculateWorkedHoursFromStrings(entry.entryTime, entry.exitTime) : 0;
            const isTeletravail = absenceType === 'teletravail';
            const expected = day.isWeekend || (isAbsence && !isTeletravail) ? 0 : employee.hoursPerWeek / 5;
            const surplus = worked - expected;

            const accentColor = absenceType ? ABSENCE_TYPES[absenceType]?.color :
              (index % 3 === 0 ? '#E63946' : index % 3 === 1 ? '#2D5A9E' : '#FFD23F');

            return (
              <div
                key={day.dateStr}
                className={`border-4 border-[#1A1A1A] flex items-center ${
                  day.isWeekend ? 'bg-[#E8E3D9] opacity-60' : isAbsence ? 'bg-[#E8E3D9]' : 'bg-white'
                }`}
                style={{ borderLeftColor: accentColor, borderLeftWidth: '6px' }}
              >
                {/* Date */}
                <div className="p-3 w-20 text-center border-r-4 border-[#1A1A1A]">
                  <p className="text-2xl font-black">{day.date.getDate()}</p>
                  <p className="text-xs font-bold text-[#666]">{day.dayName}</p>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 flex items-center gap-4">
                  {isAbsence && absenceType ? (
                    <div>
                      <span
                        className="font-bold px-2 py-1 text-white text-sm"
                        style={{ backgroundColor: ABSENCE_TYPES[absenceType]?.color }}
                      >
                        {ABSENCE_TYPES[absenceType]?.label}
                      </span>
                      {entry?.absenceNote && (
                        <span className="ml-2 text-[#666] text-sm">{entry.absenceNote}</span>
                      )}
                      {isTeletravail && entry?.entryTime && entry?.exitTime && (
                        <span className="ml-2 font-bold text-[#666]">
                          {entry.entryTime} → {entry.exitTime} ({formatHoursSimple(worked)})
                        </span>
                      )}
                    </div>
                  ) : entry?.entryTime && entry?.exitTime ? (
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
                    <span className="text-[#888] font-medium">Non pointé</span>
                  )}
                </div>

                {/* Actions */}
                {!day.isWeekend && (
                  <div className="p-2 flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(day.dateStr)}
                      disabled={isSaving}
                      className="px-3 py-1 bg-[#2D5A9E] text-white font-bold text-sm hover:bg-[#24487E] transition"
                    >
                      {isSaving ? '...' : 'MODIFIER'}
                    </button>
                    {(entry?.entryTime || entry?.absenceType) && (
                      <button
                        onClick={() => clearDay(day.dateStr)}
                        disabled={isSaving}
                        className="px-2 py-1 bg-[#E63946] text-white font-bold text-sm hover:bg-[#C62D3A] transition"
                      >
                        X
                      </button>
                    )}
                  </div>
                )}

                {/* Surplus */}
                {!day.isWeekend && !isAbsence && (
                  <div className="p-3 w-20 text-center">
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

      {/* Edit Modal */}
      {editingDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#F5F0E6] border-4 border-[#1A1A1A] p-6 w-full max-w-md">
            <h3 className="text-xl font-black mb-4">
              MODIFIER LE {new Date(editingDay.dateStr).toLocaleDateString('fr-FR')}
            </h3>

            {/* Type selector */}
            <div className="mb-4">
              <label className="block font-bold text-[#666] mb-2">TYPE DE JOURNEE</label>
              <select
                value={editingDay.absenceType}
                onChange={(e) => setEditingDay({ ...editingDay, absenceType: e.target.value })}
                className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-bold"
              >
                <option value="">Journée travaillée</option>
                {Object.entries(ABSENCE_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Hours (only if working day or télétravail) */}
            {(!editingDay.absenceType || editingDay.absenceType === 'teletravail') && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-[#666] mb-2">ENTREE</label>
                  <input
                    type="time"
                    value={editingDay.entryTime}
                    onChange={(e) => setEditingDay({ ...editingDay, entryTime: e.target.value })}
                    className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#666] mb-2">SORTIE</label>
                  <input
                    type="time"
                    value={editingDay.exitTime}
                    onChange={(e) => setEditingDay({ ...editingDay, exitTime: e.target.value })}
                    className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-bold"
                  />
                </div>
              </div>
            )}

            {/* Note */}
            {editingDay.absenceType && (
              <div className="mb-4">
                <label className="block font-bold text-[#666] mb-2">NOTE (optionnel)</label>
                <input
                  type="text"
                  value={editingDay.absenceNote}
                  onChange={(e) => setEditingDay({ ...editingDay, absenceNote: e.target.value })}
                  placeholder="Ex: Vacances, RDV médecin..."
                  className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-medium"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setEditingDay(null)}
                className="flex-1 p-3 bg-[#888] text-white font-bold hover:bg-[#666] transition"
              >
                ANNULER
              </button>
              <button
                onClick={saveEditedDay}
                disabled={savingDays[editingDay.dateStr]}
                className="flex-1 p-3 bg-[#4CAF50] text-white font-bold hover:bg-[#3D8B40] transition"
              >
                {savingDays[editingDay.dateStr] ? '...' : 'ENREGISTRER'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-[#E63946]"></div>
        <div className="flex-1 bg-[#FFD23F]"></div>
        <div className="flex-1 bg-[#2D5A9E]"></div>
      </footer>
    </div>
  );
}

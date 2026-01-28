'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useParams } from 'next/navigation';
import {
  calculateWorkedHoursFromStrings,
  formatHours,
  formatHoursSimple,
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
  absenceNote: string | null;
}

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
      const empArray = Array.isArray(empData) ? empData : [];
      const emp = empArray.find((e: Employee) => e.id === employeeId);
      setEmployee(emp || null);
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
          entryTime: isAbsence && editingDay.absenceType !== 'teletravail' ? null : (editingDay.entryTime || null),
          exitTime: isAbsence && editingDay.absenceType !== 'teletravail' ? null : (editingDay.exitTime || null),
          excluded: isAbsence,
          absenceType: editingDay.absenceType || null,
          absenceNote: editingDay.absenceNote || null,
        }),
      });

      if (res.ok) {
        const savedEntry = await res.json();
        setEntries(prev => {
          const filtered = prev.filter(e => e.date !== editingDay.dateStr);
          return [...filtered, { ...savedEntry, date: normalizeDate(savedEntry.date) }];
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
          return [...filtered, { ...savedEntry, date: normalizeDate(savedEntry.date) }];
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
        dateStr: formatLocalDate(currentMonth.year, currentMonth.month, day),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dayName: DAYS_FR[dayOfWeek],
      });
    }

    return days;
  }, [currentMonth]);

  const monthStats = useMemo(() => {
    if (!employee) return { worked: 0, expected: 0, surplus: 0 };

    let totalWorked = 0;
    let daysWithEntry = 0;

    daysInMonth.forEach(day => {
      if (day.isWeekend) return;

      const dayEntry = entries.find(e => e.date === day.dateStr);

      // Skip if excluded/absence (except teletravail which counts as work)
      if (dayEntry?.excluded && dayEntry?.absenceType !== 'teletravail') return;

      if (dayEntry && dayEntry.entryTime && dayEntry.exitTime) {
        totalWorked += calculateWorkedHoursFromStrings(dayEntry.entryTime, dayEntry.exitTime);
        daysWithEntry++;
      }
    });

    const expected = (employee.hoursPerWeek / 5) * daysWithEntry;
    return {
      worked: totalWorked,
      expected,
      surplus: totalWorked - expected,
    };
  }, [employee, entries, daysInMonth]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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

  if (!employee) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center flex-col gap-6 p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-black font-medium">Employe non trouve</p>
        <Link href="/" className="btn btn-primary">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-8 relative z-10">
      {/* Header */}
      <Header currentPage="employee" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Employee Header */}
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200 relative overflow-hidden">
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            {employee.avatarUrl ? (
              <img
                src={employee.avatarUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-16 h-16 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#F45757] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                {getInitials(employee.firstName, employee.lastName)}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-black">{employee.firstName} {employee.lastName}</h2>
              <p className="text-[#4A5565]">{employee.position || 'Personnel'} • {employee.hoursPerWeek}h/semaine</p>
            </div>
            <Link href="/setup" className="btn btn-secondary text-sm">
              Modifier
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Navigation */}
          <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200">
            <p className="text-[#4A5565] text-xs font-medium mb-3">Periode</p>
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
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
                onClick={nextMonth}
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
            <p className="text-3xl font-bold text-black">{formatHoursSimple(monthStats.worked)}</p>
            <p className="text-xs text-[#4A5565] mt-1">sur {formatHoursSimple(monthStats.expected)} attendues</p>
          </div>

          {/* Surplus Card */}
          <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl p-5">
            <p className="text-orange-600 text-xs font-medium mb-2">Bilan du mois</p>
            <div className="flex items-end justify-between">
              <p className={`text-3xl font-bold ${monthStats.surplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatHours(monthStats.surplus)}
              </p>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${monthStats.surplus >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {monthStats.surplus >= 0 ? (
                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(ABSENCE_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-200">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs text-[#4A5565]">{label}</span>
            </div>
          ))}
        </div>

        {/* Days List */}
        <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-semibold text-black">Journal du mois</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {daysInMonth.map((day) => {
              const entry = entries.find(e => e.date === day.dateStr);
              const isAbsence = entry?.excluded || false;
              const absenceType = entry?.absenceType as keyof typeof ABSENCE_TYPES | null;
              const isSaving = savingDays[day.dateStr] || false;
              const worked = entry ? calculateWorkedHoursFromStrings(entry.entryTime, entry.exitTime) : 0;
              const isTeletravail = absenceType === 'teletravail';
              const expected = day.isWeekend || (isAbsence && !isTeletravail) ? 0 : employee.hoursPerWeek / 5;
              const surplus = worked - expected;

              return (
                <div
                  key={day.dateStr}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition ${day.isWeekend ? 'opacity-50 bg-gray-50' : ''}`}
                >
                  {/* Date */}
                  <div className="w-14 text-center">
                    <p className="text-2xl font-bold text-black">{day.date.getDate()}</p>
                    <p className="text-xs text-[#4A5565]">{day.dayName}</p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isAbsence && absenceType ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: ABSENCE_TYPES[absenceType]?.color }}
                        >
                          {ABSENCE_TYPES[absenceType]?.label}
                        </span>
                        {entry?.absenceNote && (
                          <span className="text-sm text-[#4A5565]">{entry.absenceNote}</span>
                        )}
                        {isTeletravail && entry?.entryTime && entry?.exitTime && (
                          <span className="text-sm text-[#4A5565]">
                            {entry.entryTime} → {entry.exitTime} ({formatHoursSimple(worked)})
                          </span>
                        )}
                      </div>
                    ) : entry?.entryTime && entry?.exitTime ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-black">
                          {entry.entryTime} → {entry.exitTime}
                        </span>
                        <span className="font-semibold text-black">
                          {formatHoursSimple(worked)}
                        </span>
                        <span className={`text-sm font-medium ${surplus >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatHours(surplus)}
                        </span>
                      </div>
                    ) : day.isWeekend ? (
                      <span className="text-sm text-[#9CA3AF]">Week-end</span>
                    ) : (
                      <span className="text-sm text-[#9CA3AF]">Non pointe</span>
                    )}
                  </div>

                  {/* Actions */}
                  {!day.isWeekend && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(day.dateStr)}
                        disabled={isSaving}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[#4A5565] hover:bg-gray-200 transition"
                      >
                        {isSaving ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        )}
                      </button>
                      {(entry?.entryTime || entry?.absenceType) && (
                        <button
                          onClick={() => clearDay(day.dateStr)}
                          disabled={isSaving}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingDay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black">
                Modifier le {new Date(editingDay.dateStr).toLocaleDateString('fr-FR')}
              </h2>
              <button
                onClick={() => setEditingDay(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Type selector */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#4A5565] mb-2">Type de journee</label>
              <select
                value={editingDay.absenceType}
                onChange={(e) => setEditingDay({ ...editingDay, absenceType: e.target.value })}
                className="input w-full"
              >
                <option value="">Journee travaillee</option>
                {Object.entries(ABSENCE_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Hours (only if working day or teletravail) */}
            {(!editingDay.absenceType || editingDay.absenceType === 'teletravail') && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A5565] mb-2">Arrivee</label>
                  <input
                    type="time"
                    value={editingDay.entryTime}
                    onChange={(e) => setEditingDay({ ...editingDay, entryTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5565] mb-2">Depart</label>
                  <input
                    type="time"
                    value={editingDay.exitTime}
                    onChange={(e) => setEditingDay({ ...editingDay, exitTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
            )}

            {/* Note */}
            {editingDay.absenceType && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Note (optionnel)</label>
                <input
                  type="text"
                  value={editingDay.absenceNote}
                  onChange={(e) => setEditingDay({ ...editingDay, absenceNote: e.target.value })}
                  placeholder="Ex: Vacances, RDV medecin..."
                  className="input w-full"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingDay(null)}
                className="btn btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={saveEditedDay}
                disabled={savingDays[editingDay.dateStr]}
                className="btn btn-primary flex-1"
              >
                {savingDays[editingDay.dateStr] ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

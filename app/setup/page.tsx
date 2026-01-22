'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  hoursPerWeek: number;
  avatarUrl: string | null;
}

export default function SetupPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('35');

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editHoursPerWeek, setEditHoursPerWeek] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          position: position.trim() || null,
          hoursPerWeek: parseFloat(hoursPerWeek) || 35,
        }),
      });

      if (res.ok) {
        const newEmployee = await res.json();
        setEmployees([newEmployee, ...employees]);
        setFirstName('');
        setLastName('');
        setPosition('');
        setHoursPerWeek('35');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet employe et toutes ses donnees ?')) return;

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees(employees.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFirstName(employee.firstName);
    setEditLastName(employee.lastName);
    setEditPosition(employee.position || '');
    setEditHoursPerWeek(employee.hoursPerWeek.toString());
  };

  const closeEditModal = () => {
    setEditingEmployee(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editFirstName.trim() || !editLastName.trim()) return;

    setEditSaving(true);
    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          position: editPosition.trim() || null,
          hoursPerWeek: parseFloat(editHoursPerWeek) || 35,
        }),
      });

      if (res.ok) {
        const updatedEmployee = await res.json();
        setEmployees(employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
        closeEditModal();
      }
    } catch (error) {
      console.error('Error updating employee:', error);
    } finally {
      setEditSaving(false);
    }
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#F45757] mx-auto mb-4 animate-pulse"></div>
          <p className="text-[#4A5565]">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
            </div>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-[#4A5565] hover:text-black hover:bg-gray-100 rounded-lg transition-all"
              >
                Pointer
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-[#4A5565] hover:text-black hover:bg-gray-100 rounded-lg transition-all"
              >
                Dashboard
              </Link>
              <span className="px-4 py-2 text-sm font-medium text-[#F45757] bg-red-50 rounded-lg">
                Config
              </span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Add Form Card */}
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200 relative overflow-hidden">
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#F45757]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-black">Nouvel employe</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Prenom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input w-full"
                  placeholder="Jean"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input w-full"
                  placeholder="Martin"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Fonction</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="input w-full"
                  placeholder="Developpeur"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Heures/semaine</label>
                <input
                  type="number"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                  className="input w-full"
                  min="1"
                  max="60"
                  step="0.5"
                  required
                  disabled={saving}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary w-full py-3"
                >
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-black">Equipe</h2>
            </div>
            <div className="badge badge-accent">
              {employees.length} {employees.length > 1 ? 'membres' : 'membre'}
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[#4A5565] mb-1">Aucun employe</p>
              <p className="text-sm text-[#9CA3AF]">Ajoutez votre premier membre ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee, index) => {
                const avatarColor = avatarColors[index % avatarColors.length];

                return (
                  <div
                    key={employee.id}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    <Link href={`/employe/${employee.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      {employee.avatarUrl ? (
                        <img
                          src={employee.avatarUrl}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl ${avatarColor} flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0`}>
                          {getInitials(employee.firstName, employee.lastName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-black truncate">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-[#4A5565] truncate">
                          {employee.position || 'Personnel'} • {employee.hoursPerWeek}h/sem
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="btn btn-secondary text-sm px-3 py-1.5"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="btn btn-danger text-sm px-3 py-1.5"
                      >
                        Supprimer
                      </button>
                    </div>
                    {/* Mobile buttons always visible */}
                    <div className="flex gap-2 md:hidden">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-[#4A5565]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-black">Modifier</h2>
              <button
                onClick={closeEditModal}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Prenom</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="input w-full"
                  required
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Nom</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="input w-full"
                  required
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Fonction</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="input w-full"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A5565] mb-2">Heures/semaine</label>
                <input
                  type="number"
                  value={editHoursPerWeek}
                  onChange={(e) => setEditHoursPerWeek(e.target.value)}
                  className="input w-full"
                  min="1"
                  max="60"
                  step="0.5"
                  required
                  disabled={editSaving}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn btn-secondary flex-1"
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={editSaving}
                >
                  {editSaving ? '...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  hoursPerWeek: number;
}

export default function SetupPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('35');

  // Edit modal state
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
      setEmployees(data);
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
    setEditFirstName('');
    setEditLastName('');
    setEditPosition('');
    setEditHoursPerWeek('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <div className="text-2xl font-black">CHARGEMENT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#1A1A1A]">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-[#F5F0E6] p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight">POINTEUSE</h1>
          <nav className="flex gap-4">
            <Link href="/" className="px-4 py-2 bg-[#E63946] text-white font-bold hover:bg-[#C62D3A] transition">
              POINTER
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-[#2D5A9E] text-white font-bold hover:bg-[#24487E] transition">
              DASHBOARD
            </Link>
            <span className="px-4 py-2 bg-[#F5F0E6] text-[#1A1A1A] font-bold">
              SETUP
            </span>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Form */}
        <section className="bg-[#2D5A9E] p-6 mb-8">
          <h2 className="text-2xl font-black text-[#FFD23F] mb-6 tracking-tight">AJOUTER UN EMPLOYE</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#F5F0E6] font-bold mb-2">PRENOM</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 bg-[#F5F0E6] text-[#1A1A1A] font-medium border-4 border-[#1A1A1A] focus:border-[#FFD23F] outline-none"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-[#F5F0E6] font-bold mb-2">NOM</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 bg-[#F5F0E6] text-[#1A1A1A] font-medium border-4 border-[#1A1A1A] focus:border-[#FFD23F] outline-none"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-[#F5F0E6] font-bold mb-2">POSTE</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full p-3 bg-[#F5F0E6] text-[#1A1A1A] font-medium border-4 border-[#1A1A1A] focus:border-[#FFD23F] outline-none"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-[#F5F0E6] font-bold mb-2">HEURES/SEMAINE</label>
              <input
                type="number"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                className="w-full p-3 bg-[#F5F0E6] text-[#1A1A1A] font-medium border-4 border-[#1A1A1A] focus:border-[#FFD23F] outline-none"
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
                className={`w-full p-4 font-black text-xl transition border-4 border-[#1A1A1A] ${
                  saving
                    ? 'bg-[#888] text-white cursor-wait'
                    : 'bg-[#FFD23F] text-[#1A1A1A] hover:bg-[#E6BD38]'
                }`}
              >
                {saving ? 'ENREGISTREMENT...' : '+ AJOUTER'}
              </button>
            </div>
          </form>
        </section>

        {/* Employee List */}
        <section>
          <h2 className="text-2xl font-black mb-6 tracking-tight flex items-center gap-4">
            <span className="w-4 h-4 bg-[#E63946]"></span>
            EMPLOYES ({employees.length})
          </h2>

          {employees.length === 0 ? (
            <div className="bg-[#1A1A1A] p-8 text-center">
              <p className="text-[#F5F0E6] font-medium text-lg">Aucun employe</p>
              <p className="text-[#888] mt-2">Ajoutez votre premier employe ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee, index) => (
                <div
                  key={employee.id}
                  className="bg-white p-4 border-4 border-[#1A1A1A] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  style={{
                    borderLeftColor: index % 3 === 0 ? '#E63946' : index % 3 === 1 ? '#2D5A9E' : '#FFD23F',
                    borderLeftWidth: '8px',
                  }}
                >
                  <Link href={`/employe/${employee.id}`} className="flex-1 hover:opacity-80 transition">
                    <h3 className="text-xl font-black">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-[#666] font-medium">
                      {employee.position || 'Pas de poste'} — <span className="text-[#2D5A9E] font-bold">{employee.hoursPerWeek}h/semaine</span>
                    </p>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="p-3 bg-[#2D5A9E] text-white font-bold hover:bg-[#24487E] transition"
                    >
                      MODIFIER
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="p-3 bg-[#E63946] text-white font-bold hover:bg-[#C62D3A] transition"
                    >
                      SUPPRIMER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#F5F0E6] border-4 border-[#1A1A1A] p-6 w-full max-w-md">
            <h2 className="text-2xl font-black mb-6">MODIFIER EMPLOYE</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block font-bold mb-2">PRENOM</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-medium"
                  required
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block font-bold mb-2">NOM</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-medium"
                  required
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block font-bold mb-2">POSTE</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-medium"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block font-bold mb-2">HEURES/SEMAINE</label>
                <input
                  type="number"
                  value={editHoursPerWeek}
                  onChange={(e) => setEditHoursPerWeek(e.target.value)}
                  className="w-full p-3 bg-white border-4 border-[#1A1A1A] font-medium"
                  min="1"
                  max="60"
                  step="0.5"
                  required
                  disabled={editSaving}
                />
                <p className="text-sm text-[#666] mt-1">Heures attendues par semaine pour cet employe</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 p-3 bg-[#888] text-white font-bold hover:bg-[#666] transition"
                  disabled={editSaving}
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  className="flex-1 p-3 bg-[#4CAF50] text-white font-bold hover:bg-[#3D8B40] transition"
                  disabled={editSaving}
                >
                  {editSaving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-[#E63946]"></div>
        <div className="flex-1 bg-[#FFD23F]"></div>
        <div className="flex-1 bg-[#2D5A9E]"></div>
      </footer>
    </div>
  );
}

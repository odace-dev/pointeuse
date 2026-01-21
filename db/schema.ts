import { pgTable, text, timestamp, real, date, time, uuid, boolean } from 'drizzle-orm/pg-core';

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  position: text('position'),
  hoursPerWeek: real('hours_per_week').notNull().default(35),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  entryTime: time('entry_time'),
  exitTime: time('exit_time'),
  excluded: boolean('excluded').default(false).notNull(),
  absenceType: text('absence_type'), // null = travail, 'conge' | 'maladie' | 'rtt' | 'teletravail' | 'autre'
  absenceNote: text('absence_note'), // note libre pour préciser
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ABSENCE_TYPES = {
  conge: { label: 'Congé', color: '#2D5A9E' },
  maladie: { label: 'Maladie', color: '#E63946' },
  rtt: { label: 'RTT', color: '#FFD23F' },
  teletravail: { label: 'Télétravail', color: '#4CAF50' },
  formation: { label: 'Formation', color: '#9C27B0' },
  ferie: { label: 'Jour férié', color: '#1A1A1A' },
  sans_solde: { label: 'Sans solde', color: '#FF9800' },
  maternite: { label: 'Maternité/Paternité', color: '#E91E63' },
  autre: { label: 'Autre', color: '#888' },
} as const;

export type AbsenceType = keyof typeof ABSENCE_TYPES;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

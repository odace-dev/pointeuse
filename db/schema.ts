import { pgTable, text, timestamp, real, date, time, uuid } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

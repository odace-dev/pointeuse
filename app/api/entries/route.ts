import { NextResponse } from 'next/server';
import { db, timeEntries } from '@/db';
import { and, eq, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = db.select().from(timeEntries);

    const conditions = [];
    if (employeeId) {
      conditions.push(eq(timeEntries.employeeId, employeeId));
    }
    if (date) {
      conditions.push(eq(timeEntries.date, date));
    }
    if (startDate) {
      conditions.push(gte(timeEntries.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.date, endDate));
    }

    const entries = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, date, entryTime, exitTime, excluded, absenceType, absenceNote } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ error: 'Employee ID and date are required' }, { status: 400 });
    }

    // Check if entry exists for this employee and date
    const existing = await db.select().from(timeEntries)
      .where(and(
        eq(timeEntries.employeeId, employeeId),
        eq(timeEntries.date, date)
      ));

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db.update(timeEntries)
        .set({
          entryTime: entryTime ?? existing[0].entryTime,
          exitTime: exitTime ?? existing[0].exitTime,
          excluded: excluded ?? existing[0].excluded,
          absenceType: absenceType !== undefined ? absenceType : existing[0].absenceType,
          absenceNote: absenceNote !== undefined ? absenceNote : existing[0].absenceNote,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    } else {
      // Create new
      const [newEntry] = await db.insert(timeEntries).values({
        employeeId,
        date,
        entryTime: entryTime || null,
        exitTime: exitTime || null,
        excluded: excluded ?? false,
        absenceType: absenceType || null,
        absenceNote: absenceNote || null,
      }).returning();
      return NextResponse.json(newEntry, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving entry:', error);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

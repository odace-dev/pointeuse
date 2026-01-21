import { NextResponse } from 'next/server';
import { db, employees } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allEmployees = await db.select().from(employees).orderBy(desc(employees.createdAt));
    return NextResponse.json(allEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, position, hoursPerWeek } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    const [newEmployee] = await db.insert(employees).values({
      firstName,
      lastName,
      position: position || null,
      hoursPerWeek: hoursPerWeek || 35,
    }).returning();

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

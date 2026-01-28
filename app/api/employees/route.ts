import { NextResponse } from 'next/server';
import { db, employees } from '@/db';
import { desc } from 'drizzle-orm';

const AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.webp',
  '/avatars/avatar-3.webp',
  '/avatars/avatar-4.webp',
  '/avatars/avatar-5.webp',
  '/avatars/avatar-6.webp',
  '/avatars/avatar-7.webp',
  '/avatars/avatar-8.webp',
  '/avatars/avatar-9.png',
  '/avatars/avatar-10.png',
  '/avatars/avatar-11.png',
];

function getRandomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

export async function GET() {
  try {
    const allEmployees = await db.select().from(employees).orderBy(desc(employees.createdAt));

    // Auto-assign avatars to employees without one
    const { eq, isNull } = await import('drizzle-orm');
    for (const emp of allEmployees) {
      if (!emp.avatarUrl) {
        await db.update(employees)
          .set({ avatarUrl: getRandomAvatar() })
          .where(eq(employees.id, emp.id));
        emp.avatarUrl = getRandomAvatar();
      }
    }

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
      avatarUrl: getRandomAvatar(),
    }).returning();

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

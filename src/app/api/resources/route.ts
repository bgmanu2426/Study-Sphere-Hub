import { NextResponse } from 'next/server';
import { resources } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    const result = resources[scheme]?.[branch]?.[semester] || [];
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

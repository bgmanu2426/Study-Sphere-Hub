
import { NextResponse } from 'next/server';
import { getResourcesFromTeable, createResourceInTeable } from '@/lib/teable';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subjectName = searchParams.get('subject');

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    // We verify the token here just to ensure the user is authenticated before proceeding.
    await adminAuth.verifyIdToken(idToken);
    
    const resources = await getResourcesFromTeable({ scheme, branch, semester, subject: subjectName });

    return NextResponse.json(resources);

  } catch (error: any) {
    console.error('Failed to retrieve resources:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Authentication token has expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to retrieve resources from Teable' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  try {
    await adminAuth.verifyIdToken(idToken);
    const body = await request.json();
    const result = await createResourceInTeable(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create resource:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Authentication token has expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create resource in Teable' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getFilesFromDrive } from '@/lib/drive';
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
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    const resources = await getFilesFromDrive(userId, { scheme, branch, semester, subject: subjectName });

    return NextResponse.json(resources);

  } catch (error: any) {
    console.error('Failed to retrieve resources:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Authentication token has expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to retrieve resources from Google Drive' }, { status: 500 });
  }
}

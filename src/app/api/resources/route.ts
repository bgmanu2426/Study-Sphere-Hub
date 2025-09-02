
import { NextResponse } from 'next/server';
import { getFilesForSubject } from '@/lib/cloudinary';
import { Subject } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subjectNameParam = searchParams.get('subject');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }
  
  const subjectName = subjectNameParam ? decodeURIComponent(subjectNameParam.trim()) : undefined;

  try {
    const basePath = `resources/${scheme}/${branch}/${semester}`;
    
    const dynamicSubjects = await getFilesForSubject(basePath, subjectName);
        
    return NextResponse.json(dynamicSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

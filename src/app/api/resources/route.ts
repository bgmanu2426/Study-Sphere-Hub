
import { NextResponse } from 'next/server';
import { getFilesForSubject } from '@/lib/cloudinary';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subjectName = searchParams.get('subject');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    const path = `resources/${scheme}/${branch}/${semester}`;
    
    // Fetch dynamic subjects directly from Cloudinary
    const dynamicSubjects = await getFilesForSubject(path, subjectName || undefined);

    if (subjectName) {
        const filteredSubjects = dynamicSubjects.filter(s => s.id.toLowerCase() === subjectName.toLowerCase() || s.name.toLowerCase() === subjectName.toLowerCase());
        return NextResponse.json(filteredSubjects);
    }
    
    return NextResponse.json(dynamicSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

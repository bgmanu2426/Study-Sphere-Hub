import { NextResponse } from 'next/server';
import { getFilesFromDrive } from '@/lib/drive';
import { vtuResources } from '@/lib/vtu-data';
import { Subject, ResourceFile } from '@/lib/data';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    // Verify the user's token to secure the endpoint
    await adminAuth.verifyIdToken(idToken);
    
    // 1. Get static resources for the selected criteria
    const staticSubjectsForSemester: Subject[] = vtuResources[scheme as keyof typeof vtuResources]?.[branch as keyof typeof vtuResources]?.[semester as keyof typeof vtuResources] || [];

    // 2. Create a deep copy to avoid modifying the original vtu-data
    const subjectsMap = new Map<string, Subject>();
    staticSubjectsForSemester.forEach(staticSub => {
      subjectsMap.set(staticSub.id, JSON.parse(JSON.stringify(staticSub)));
    });

    // 3. Fetch dynamic resources from Google Drive for each subject
    for (const subject of subjectsMap.values()) {
        const drivePath = ['VTU Assistant', scheme, branch, semester, subject.id];
        
        // Fetch notes (module-wise)
        for (let i = 1; i <= 5; i++) {
            const moduleKey = `module${i}`;
            const notesPath = [...drivePath, 'notes', moduleKey];
            const notesFiles = await getFilesFromDrive(notesPath.join('/'));
            if (notesFiles.length > 0) {
                // To keep it simple, we'll just take the first file found for a module.
                // You could extend this to handle multiple files.
                subject.notes[moduleKey] = {
                    name: notesFiles[0].name,
                    url: notesFiles[0].webViewLink,
                    summary: 'User uploaded content from Google Drive.', // Placeholder summary
                };
            }
        }

        // Fetch question papers
        const qpPath = [...drivePath, 'question-papers'];
        const qpFiles = await getFilesFromDrive(qpPath.join('/'));
        if(qpFiles.length > 0) {
            const driveQps: ResourceFile[] = qpFiles.map(file => ({
                name: file.name,
                url: file.webViewLink,
                summary: 'User uploaded content from Google Drive.',
            }));
            subject.questionPapers.push(...driveQps);
        }
    }

    const combinedSubjects = Array.from(subjectsMap.values());
    
    return NextResponse.json(combinedSubjects);

  } catch (error: any) {
    console.error('Failed to retrieve resources:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Authentication token has expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to retrieve resources from Google Drive' }, { status: 500 });
  }
}

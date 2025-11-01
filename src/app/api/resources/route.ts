
import { NextResponse } from 'next/server';
import { getFilesFromS3 } from '@/lib/s3';
import { vtuResources } from '@/lib/vtu-data';
import { Subject, ResourceFile } from '@/lib/data';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const year = searchParams.get('year');
  const semester = searchParams.get('semester');

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];

  if (!scheme || !branch || !semester || !year) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    // Verify the user's token to secure the endpoint
    await adminAuth.verifyIdToken(idToken);
    
    // 1. Get static resources for the selected criteria
    const schemeData = vtuResources[scheme as keyof typeof vtuResources];
    if (!schemeData) {
        return NextResponse.json([]);
    }

    const branchData = schemeData[branch as keyof typeof schemeData];
    if (!branchData) {
        return NextResponse.json([]);
    }

    // Correctly handle 1st year data, which is all static
    if (year === '1') {
        const firstYearSubjects = branchData[semester as keyof typeof branchData] || [];
        return NextResponse.json(firstYearSubjects);
    }
      
    const staticSubjectsForSemester: Subject[] = branchData[semester as keyof typeof branchData] || [];
    if (staticSubjectsForSemester.length === 0) {
        return NextResponse.json([]);
    }

    // 2. Create a deep copy to avoid modifying the original vtu-data
    const subjectsMap = new Map<string, Subject>();
    staticSubjectsForSemester.forEach(staticSub => {
      subjectsMap.set(staticSub.id, JSON.parse(JSON.stringify(staticSub)));
    });

    // 3. Fetch dynamic resources from AWS S3 for each subject
    for (const subject of subjectsMap.values()) {
        const s3Path = ['VTU Assistant', scheme, branch, semester, subject.id];
        
        // Fetch notes (module-wise)
        for (let i = 1; i <= 5; i++) {
            const moduleKey = `module${i}`;
            const notesPath = [...s3Path, 'notes', moduleKey];
            const notesFiles = await getFilesFromS3(notesPath.join('/'));
            if (notesFiles.length > 0) {
                // Ensure the notes object and module key exist
                if (!subject.notes) {
                    subject.notes = {};
                }
                subject.notes[moduleKey] = {
                    name: notesFiles[0].name,
                    url: notesFiles[0].url,
                    summary: notesFiles[0].summary,
                };
            }
        }

        // Fetch question papers
        const qpPath = [...s3Path, 'question-papers'];
        const qpFiles = await getFilesFromS3(qpPath.join('/'));
        if(qpFiles.length > 0) {
            const driveQps: ResourceFile[] = qpFiles.map(file => ({
                name: file.name,
                url: file.url,
                summary: file.summary,
            }));
             if (!subject.questionPapers) {
                subject.questionPapers = [];
            }
            subject.questionPapers.push(...driveQps);
        }
    }

    const combinedSubjects = Array.from(subjectsMap.values());
    
    return NextResponse.json(combinedSubjects);

  } catch (error: any) {
    console.error('Failed to retrieve resources:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        return NextResponse.json({ error: 'Authentication token is invalid. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'An internal server error occurred while retrieving resources.' }, { status: 500 });
  }
}

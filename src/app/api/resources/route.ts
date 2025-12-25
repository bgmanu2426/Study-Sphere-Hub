
import { NextResponse } from 'next/server';
import { getFilesFromStorage, getAllFilesFromStorage } from '@/lib/storage';
import { getServerSubjects, getAllServerSubjects, DbSubject } from '@/lib/database-server';
import { Subject, ResourceFile } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const year = searchParams.get('year');
  const semester = searchParams.get('semester');
  const all = searchParams.get('all'); // New parameter to fetch all resources

  // If 'all' parameter is set, return all subjects from database
  if (all === 'true') {
    try {
      const allSubjects: Subject[] = [];
      const allFiles = await getAllFilesFromStorage();
      const dbSubjects = await getAllServerSubjects();

      for (const dbSubject of dbSubjects) {
        const subject: Subject = {
          id: dbSubject.subjectId,
          name: dbSubject.name,
          notes: {},
          questionPapers: [],
        };
        
        // Add metadata for display
        (subject as any).scheme = dbSubject.scheme;
        (subject as any).branch = dbSubject.branch;
        (subject as any).semester = dbSubject.semester;

        const basePath = ['Study Sphere Hub', dbSubject.scheme, dbSubject.branch, dbSubject.semester, dbSubject.subjectId];
        
        // Fetch notes
        for (let i = 1; i <= 5; i++) {
          const moduleKey = `module${i}`;
          const notesPath = [...basePath, 'notes', moduleKey];
          const notesFiles = await getFilesFromStorage(notesPath.join('/'), allFiles);
          if (notesFiles.length > 0) {
            subject.notes[moduleKey] = {
              name: notesFiles[0].name,
              url: notesFiles[0].url,
              summary: notesFiles[0].summary,
              fileId: notesFiles[0].fileId,
            };
          }
        }

        // Fetch question papers
        const qpPath = [...basePath, 'question-papers'];
        const qpFiles = await getFilesFromStorage(qpPath.join('/'), allFiles);
        if (qpFiles.length > 0) {
          qpFiles.forEach(file => {
            if (!subject.questionPapers.some(qp => qp.url === file.url)) {
              subject.questionPapers.push({
                name: file.name,
                url: file.url,
                summary: file.summary,
                fileId: file.fileId,
              });
            }
          });
        }

        allSubjects.push(subject);
      }

      return NextResponse.json(allSubjects);
    } catch (error: any) {
      console.error('Failed to retrieve all resources:', error);
      return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
  }

  // Original filtered logic
  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    // 1. Get subjects from database for the selected criteria
    const dbSubjects = await getServerSubjects(scheme, branch, semester);
    
    if (dbSubjects.length === 0) {
      return NextResponse.json([]);
    }

    // Create subjects map from database
    const subjectsMap = new Map<string, Subject>();
    dbSubjects.forEach(dbSubject => {
      subjectsMap.set(dbSubject.subjectId, {
        id: dbSubject.subjectId,
        name: dbSubject.name,
        notes: {},
        questionPapers: [],
      });
    });

    // 2. Fetch ALL files from storage ONCE (single API call)
    const allFiles = await getAllFilesFromStorage();

    // 3. Process dynamic resources locally for each subject
    for (const subject of subjectsMap.values()) {
        const basePath = ['Study Sphere Hub', scheme, branch, semester, subject.id];
        
        // Fetch notes (module-wise) - filtering locally from pre-fetched files
        for (let i = 1; i <= 5; i++) {
            const moduleKey = `module${i}`;
            const notesPath = [...basePath, 'notes', moduleKey];
            const notesFiles = await getFilesFromStorage(notesPath.join('/'), allFiles);
            if (notesFiles.length > 0) {
                subject.notes[moduleKey] = {
                    name: notesFiles[0].name,
                    url: notesFiles[0].url,
                    summary: notesFiles[0].summary,
                    fileId: notesFiles[0].fileId,
                };
            }
        }

        // Fetch question papers - filtering locally from pre-fetched files
        const qpPath = [...basePath, 'question-papers'];
        const qpFiles = await getFilesFromStorage(qpPath.join('/'), allFiles);
        if(qpFiles.length > 0) {
            const storageQps: ResourceFile[] = qpFiles.map(file => ({
                name: file.name,
                url: file.url,
                summary: file.summary,
                fileId: file.fileId,
            }));
            storageQps.forEach(newQp => {
              if (!subject.questionPapers.some(existingQp => existingQp.url === newQp.url)) {
                subject.questionPapers.push(newQp);
              }
            });
        }
    }

    const combinedSubjects = Array.from(subjectsMap.values());
    
    return NextResponse.json(combinedSubjects);

  } catch (error: any) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'An internal server error occurred while retrieving resources.' }, { status: 500 });
  }
}

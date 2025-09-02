
import { NextResponse } from 'next/server';
import { getFilesForSubject } from '@/lib/cloudinary';
import { vtuResources } from '@/lib/vtu-data';
import { Subject, ResourceFile } from '@/lib/data';

function getStaticSubjects(scheme: string, branch: string, semester: string): Subject[] {
  const schemeData = vtuResources[scheme as keyof typeof vtuResources];
  if (!schemeData) return [];
  const branchData = schemeData[branch as keyof typeof schemeData];
  if (!branchData) return [];
  const semesterData = branchData[semester as keyof typeof branchData];
  if (!semesterData) return [];

  return semesterData.map((s: any) => ({
    id: s.id,
    name: s.name,
    notes: Object.entries(s.notes).reduce((acc, [key, value]) => {
      acc[key] = { name: key, url: value as string, summary: '' };
      return acc;
    }, {} as { [module: string]: ResourceFile }),
    questionPapers: (s.questionPapers.current ? [{ name: 'Current', url: s.questionPapers.current, summary: '' }, { name: 'Previous', url: s.questionPapers.previous, summary: '' }] : []).filter(qp => qp.url !== '#'),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subjectNameParam = searchParams.get('subject');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }
  
  const subjectName = subjectNameParam ? subjectNameParam.trim() : undefined;

  try {
    const basePath = `resources/${scheme}/${branch}/${semester}`;
    
    // 1. Fetch dynamic subjects from Cloudinary
    const dynamicSubjects = await getFilesForSubject(basePath, subjectName);
    
    // 2. Fetch static subjects
    const staticSubjects = getStaticSubjects(scheme, branch, semester);

    // 3. Create a map to hold the merged subjects, keyed by subject name for easy lookup
    const subjectsMap = new Map<string, Subject>();

    // 4. Add all static subjects to the map first
    for (const subject of staticSubjects) {
        subjectsMap.set(subject.name.trim(), JSON.parse(JSON.stringify(subject))); // Deep copy
    }

    // 5. Merge dynamic subjects into the map
    for (const dynamicSubject of dynamicSubjects) {
        const subjectId = dynamicSubject.name.trim();
        const existingSubject = subjectsMap.get(subjectId);

        if (existingSubject) {
            // If subject exists, merge notes and question papers
            Object.assign(existingSubject.notes, dynamicSubject.notes);

            const existingQpUrls = new Set(existingSubject.questionPapers.map(qp => qp.url));
            dynamicSubject.questionPapers.forEach(qp => {
                if (!existingQpUrls.has(qp.url)) {
                    existingSubject.questionPapers.push(qp);
                }
            });
        } else {
            // If subject does not exist, add it to the map
            subjectsMap.set(subjectId, dynamicSubject);
        }
    }

    // 6. Convert the map back to an array
    const allSubjects = Array.from(subjectsMap.values());

    // 7. Filter by subject name if the parameter is provided
    const finalSubjects = subjectName 
        ? allSubjects.filter(s => s.name.trim() === subjectName) 
        : allSubjects;
        
    return NextResponse.json(finalSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}


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

  // Convert static data to the Subject format
  return semesterData.map((s: any) => ({
    id: s.id,
    name: s.name,
    notes: Object.entries(s.notes).reduce((acc, [key, value]) => {
      acc[key] = { name: key, url: value as string, summary: '' };
      return acc;
    }, {} as { [module: string]: ResourceFile }),
    questionPapers: s.questionPapers.current ? [{ name: 'Current', url: s.questionPapers.current, summary: '' }, { name: 'Previous', url: s.questionPapers.previous, summary: '' }] : [],
  }));
}

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
    
    // 1. Fetch dynamic subjects from Cloudinary
    const dynamicSubjects = await getFilesForSubject(path, subjectName || undefined);
    const dynamicSubjectsMap = new Map(dynamicSubjects.map(s => [s.id, s]));

    // 2. Get static subjects
    const staticSubjects = getStaticSubjects(scheme, branch, semester);

    // 3. Merge static and dynamic subjects
    const allSubjects = staticSubjects.map(staticSubject => {
      const dynamicSubject = dynamicSubjectsMap.get(staticSubject.id);
      if (dynamicSubject) {
        // If a dynamic subject exists, merge its notes and question papers
        const mergedSubject = { ...staticSubject, ...dynamicSubject };
        
        // Deep merge notes and question papers
        mergedSubject.notes = { ...staticSubject.notes, ...dynamicSubject.notes };
        
        // Combine question papers, avoiding duplicates
        const qpMap = new Map<string, ResourceFile>();
        staticSubject.questionPapers.forEach(qp => qpMap.set(qp.url, qp));
        dynamicSubject.questionPapers.forEach(qp => qpMap.set(qp.url, qp));
        mergedSubject.questionPapers = Array.from(qpMap.values());
        
        dynamicSubjectsMap.delete(staticSubject.id); // Remove from map to handle new subjects later
        return mergedSubject;
      }
      return staticSubject;
    });

    // Add any new subjects from Cloudinary that weren't in the static list
    const newSubjects = Array.from(dynamicSubjectsMap.values());
    const combinedSubjects = [...allSubjects, ...newSubjects];

    if (subjectName) {
        const filteredSubjects = combinedSubjects.filter(s => s.id.toLowerCase() === subjectName.toLowerCase() || s.name.toLowerCase() === subjectName.toLowerCase());
        return NextResponse.json(filteredSubjects);
    }
    
    return NextResponse.json(combinedSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

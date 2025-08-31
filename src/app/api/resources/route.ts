
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

    // 2. Get static subjects, but only if we are not filtering by a specific subject
    // If a specific subject is requested, we rely only on Cloudinary to get the most up-to-date info.
    const staticSubjects = subjectName ? [] : getStaticSubjects(scheme, branch, semester);

    // 3. Merge static and dynamic subjects
    const allSubjectsMap = new Map<string, Subject>();

    // Add static subjects to the map first
    staticSubjects.forEach(staticSubject => {
        allSubjectsMap.set(staticSubject.id, staticSubject);
    });

    // Merge dynamic subjects into the map, overwriting static data
    dynamicSubjectsMap.forEach((dynamicSubject, subjectId) => {
        if (allSubjectsMap.has(subjectId)) {
            // Subject exists, merge resources
            const existingSubject = allSubjectsMap.get(subjectId)!;
            
            const mergedNotes = { ...existingSubject.notes };
            for (const module in dynamicSubject.notes) {
                mergedNotes[module] = dynamicSubject.notes[module];
            }

            const qpMap = new Map<string, ResourceFile>();
            // Add existing first, so dynamic can overwrite if names match
            existingSubject.questionPapers.forEach(qp => qpMap.set(qp.name, qp));
            dynamicSubject.questionPapers.forEach(qp => qpMap.set(qp.name, qp));

            existingSubject.notes = mergedNotes;
            existingSubject.questionPapers = Array.from(qpMap.values());

        } else {
            // This is a completely new subject from Cloudinary
            allSubjectsMap.set(subjectId, dynamicSubject);
        }
    });

    let combinedSubjects = Array.from(allSubjectsMap.values());

    if (subjectName) {
        // If a subject was specified, filter the merged list.
        // This is more robust as it allows fetching a subject that might only exist in static data or only in cloudinary
        const filteredSubjects = combinedSubjects.filter(s => s.id.toLowerCase() === subjectName.toLowerCase() || s.name.toLowerCase() === subjectName.toLowerCase());
        // If still no subject, it might be one that only exists in cloudinary and wasn't in static data
        if(filteredSubjects.length === 0 && dynamicSubjectsMap.has(subjectName)) {
            return NextResponse.json([dynamicSubjectsMap.get(subjectName)]);
        }
        return NextResponse.json(filteredSubjects);
    }
    
    return NextResponse.json(combinedSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

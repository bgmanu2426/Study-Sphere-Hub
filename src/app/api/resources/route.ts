
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
      // Ensure the resource file has a name and url
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
  const subjectName = searchParams.get('subject');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  try {
    const path = `resources/${scheme}/${branch}/${semester}`;
    
    // 1. Always fetch dynamic subjects from Cloudinary
    const dynamicSubjects = await getFilesForSubject(path, subjectName || undefined);
    const dynamicSubjectsMap = new Map(dynamicSubjects.map(s => [s.id.toLowerCase(), s]));

    if (subjectName) {
        // If a specific subject is requested, we rely primarily on Cloudinary
        const subjectId = subjectName.toLowerCase();
        if (dynamicSubjectsMap.has(subjectId)) {
            return NextResponse.json([dynamicSubjectsMap.get(subjectId)]);
        }
        // If not in Cloudinary, check static data as a fallback
        const staticSubjects = getStaticSubjects(scheme, branch, semester);
        const filteredStatic = staticSubjects.filter(s => s.id.toLowerCase() === subjectId);
        return NextResponse.json(filteredStatic);
    }

    // For a general query, merge static and dynamic data
    const allSubjectsMap = new Map<string, Subject>();

    // Start with Cloudinary data, as it is the source of truth for uploads
    dynamicSubjectsMap.forEach((subject, subjectId) => {
        allSubjectsMap.set(subjectId, subject);
    });

    // Get static subjects
    const staticSubjects = getStaticSubjects(scheme, branch, semester);

    // Add static subjects ONLY if they don't already exist in the map from Cloudinary
    staticSubjects.forEach(staticSubject => {
        const subjectId = staticSubject.id.toLowerCase();
        if (!allSubjectsMap.has(subjectId)) {
            // This is a subject with only static data, add it
            allSubjectsMap.set(subjectId, staticSubject);
        } else {
            // The subject already exists from Cloudinary.
            // Let's merge *intelligently*. We only add notes/qps from static data if they don't exist in the dynamic data.
            const dynamicSubject = allSubjectsMap.get(subjectId)!;

            // Merge notes
            for(const moduleKey in staticSubject.notes) {
                if (!dynamicSubject.notes[moduleKey] && staticSubject.notes[moduleKey].url !== '#') {
                    dynamicSubject.notes[moduleKey] = staticSubject.notes[moduleKey];
                }
            }

            // Merge question papers
            const dynamicQpUrls = new Set(dynamicSubject.questionPapers.map(qp => qp.url));
            staticSubject.questionPapers.forEach(staticQp => {
                if (!dynamicQpUrls.has(staticQp.url) && staticQp.url !== '#') {
                    dynamicSubject.questionPapers.push(staticQp);
                }
            });
        }
    });

    const combinedSubjects = Array.from(allSubjectsMap.values());
    
    return NextResponse.json(combinedSubjects);

  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

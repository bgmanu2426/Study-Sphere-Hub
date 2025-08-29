import { NextResponse } from 'next/server';
import { Subject } from '@/lib/data';
import { getFilesForSubject } from '@/lib/firebase';
import { vtuResources } from '@/lib/vtu-data';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheme = searchParams.get('scheme');
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subjectName = searchParams.get('subject');

  if (!scheme || !branch || !semester) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  // First, get the static data for the subjects
  const schemeData = vtuResources[scheme as keyof typeof vtuResources];
  const branchData = schemeData ? schemeData[branch as keyof typeof schemeData] : undefined;
  const semesterData = branchData ? branchData[semester as keyof typeof branchData] : [];
  
  let staticSubjects: any[] = semesterData || [];
  
  if (subjectName) {
    staticSubjects = staticSubjects.filter(s => s.name.toLowerCase() === subjectName.toLowerCase() || s.id.toLowerCase() === subjectName.toLowerCase())
  }


  try {
    const path = `resources/${scheme}/${branch}/${semester}`;
    
    // Fetch dynamic subjects from Firebase
    const dynamicSubjects = await getFilesForSubject(path, subjectName || undefined);
    
    // Create a map of dynamic subjects by their ID for easy lookup
    const dynamicSubjectsMap = new Map(dynamicSubjects.map(s => [s.id, s]));

    // Merge static and dynamic data
    const mergedSubjects: Subject[] = staticSubjects.map(staticSubject => {
        const dynamicSubject = dynamicSubjectsMap.get(staticSubject.id);
        if (dynamicSubject) {
            // If a dynamic subject with the same ID exists, merge them
            // We prioritize dynamic data (actual uploaded files) over static links
            const merged = {
                ...staticSubject,
                ...dynamicSubject,
                // You might need more specific merging logic here if there are conflicts
            };
            dynamicSubjectsMap.delete(staticSubject.id); // Remove it from the map so we don't add it again
            return merged;
        }
        return staticSubject; // No dynamic counterpart, use static
    });

    // Add any remaining dynamic subjects that didn't have a static counterpart
    mergedSubjects.push(...Array.from(dynamicSubjectsMap.values()));


    return NextResponse.json(subjectName ? mergedSubjects.filter(s => s.name === subjectName) : mergedSubjects);


  } catch (error) {
    console.error('Failed to retrieve resources:', error);
    // Even if firebase fails, we can still return the static data.
     if(staticSubjects.length > 0) {
        return NextResponse.json(staticSubjects);
     }
    return NextResponse.json({ error: 'Failed to retrieve resources' }, { status: 500 });
  }
}

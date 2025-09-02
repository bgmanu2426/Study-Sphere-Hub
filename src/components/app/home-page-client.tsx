
'use client';

import { useState } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { Subject } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { vtuResources } from '@/lib/vtu-data';

export function HomePageClient() {
  const [selectedFilters, setSelectedFilters] = useState<{
    scheme: string;
    branch: string;
    year: string;
    semester: string;
  } | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getStaticSubjects = (scheme: string, branch: string, semester: string): Subject[] => {
    const schemeData = vtuResources[scheme as keyof typeof vtuResources];
    if (!schemeData) return [];
    const branchData = schemeData[branch as keyof typeof schemeData];
    if (!branchData) return [];
    const semesterData = branchData[semester as keyof typeof branchData];
    if (!semesterData) return [];

    return semesterData.map((s: any) => ({
      id: s.id,
      name: s.name,
      notes: Object.keys(s.notes || {}).reduce((acc, key) => {
        acc[key] = { name: `Module ${key.replace('module', '')}`, url: s.notes[key] || '#', summary: '' };
        return acc;
      }, {} as { [key: string]: any }),
      questionPapers: [
        ...(s.questionPapers?.current ? [{ name: 'Current', url: s.questionPapers.current, summary: '' }] : []),
        ...(s.questionPapers?.previous ? [{ name: 'Previous', url: s.questionPapers.previous, summary: '' }] : []),
      ]
    }));
  }

  const handleSearch = async (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    setIsLoading(true);
    setSelectedFilters(filters);
    
    try {
      const { scheme, branch, semester } = filters;
      
      const subjectsMap = new Map<string, Subject>();
      
      // 1. Get the base structure from static data
      const staticSubjects = getStaticSubjects(scheme, branch, semester);
      staticSubjects.forEach(subject => {
        subjectsMap.set(subject.name.trim(), JSON.parse(JSON.stringify(subject))); // Deep copy
      });

      // 2. Fetch dynamic resources from the API
      const response = await fetch(`/api/resources?scheme=${scheme}&branch=${branch}&semester=${semester}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch resources.');
      }
      
      const dynamicSubjects: Subject[] = await response.json();

      // 3. Merge dynamic subjects into the static structure
      for (const dynamicSubject of dynamicSubjects) {
          const subjectId = dynamicSubject.name.trim();
          let existingSubject = subjectsMap.get(subjectId);

          if (!existingSubject) {
             const staticBase = staticSubjects.find(s => s.name.trim() === subjectId);
             if (staticBase) {
                existingSubject = JSON.parse(JSON.stringify(staticBase));
             } else {
                 existingSubject = {
                    id: subjectId,
                    name: subjectId,
                    notes: {},
                    questionPapers: []
                 };
             }
             subjectsMap.set(subjectId, existingSubject);
          }
          
          // Merge notes, ensuring we don't lose the module name
          for (const moduleKey in dynamicSubject.notes) {
            if (existingSubject.notes[moduleKey]) {
                existingSubject.notes[moduleKey].url = dynamicSubject.notes[moduleKey].url;
                existingSubject.notes[moduleKey].summary = dynamicSubject.notes[moduleKey].summary;
                (existingSubject.notes[moduleKey] as any).publicId = (dynamicSubject.notes[moduleKey] as any).publicId;

            } else {
                existingSubject.notes[moduleKey] = dynamicSubject.notes[moduleKey];
            }
          }

          // Merge question papers, avoiding duplicates
          const existingQpUrls = new Set(existingSubject.questionPapers.map(qp => qp.url));
          dynamicSubject.questionPapers.forEach(dynamicQp => {
              if (!existingQpUrls.has(dynamicQp.url)) {
                  existingSubject!.questionPapers.push(dynamicQp);
                  existingQpUrls.add(dynamicQp.url);
              }
          });
      }

      setSubjects(Array.from(subjectsMap.values()));

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not fetch resources. Please try again later.',
      });
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="space-y-8">
        <CourseSelector onSearch={handleSearch} isLoading={isLoading} />
        <ResourceList subjects={subjects} isLoading={isLoading} filtersSet={!!selectedFilters} />
      </div>
    </div>
  );
}

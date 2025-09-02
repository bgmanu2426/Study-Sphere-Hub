'use client';

import { useState } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { Subject, ResourceFile } from '@/lib/data';
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
      notes: {
        module1: { name: 'Module 1', url: s.notes?.module1 || '#', summary: '' },
        module2: { name: 'Module 2', url: s.notes?.module2 || '#', summary: '' },
        module3: { name: 'Module 3', url: s.notes?.module3 || '#', summary: '' },
        module4: { name: 'Module 4', url: s.notes?.module4 || '#', summary: '' },
        module5: { name: 'Module 5', url: s.notes?.module5 || '#', summary: '' },
      },
      questionPapers: [
        { name: 'Current', url: s.questionPapers?.current || '#', summary: '' },
        { name: 'Previous', url: s.questionPapers?.previous || '#', summary: '' },
      ],
    }));
  }

  const handleSearch = async (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    setIsLoading(true);
    setSelectedFilters(filters);
    
    try {
      const { scheme, branch, semester } = filters;
      
      // 1. Get the base structure from static data
      const staticSubjects = getStaticSubjects(scheme, branch, semester);
      const subjectsMap = new Map<string, Subject>();
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
          const existingSubject = subjectsMap.get(subjectId);

          if (existingSubject) {
              // Merge notes
              for (const moduleKey in dynamicSubject.notes) {
                if (existingSubject.notes[moduleKey]) {
                   existingSubject.notes[moduleKey] = dynamicSubject.notes[moduleKey];
                }
              }

              // Merge question papers, replacing placeholders
              dynamicSubject.questionPapers.forEach(dynamicQp => {
                const existingQpIndex = existingSubject.questionPapers.findIndex(
                  qp => qp.name.toLowerCase() === dynamicQp.name.toLowerCase()
                );
                
                // Add new QP if it doesn't exist already
                const isAlreadyPresent = existingSubject.questionPapers.some(qp => qp.url === dynamicQp.url);
                if (!isAlreadyPresent) {
                     // Check if it's a named QP like 'June 2023' etc.
                     const isNamedYearQP = !['current', 'previous'].includes(dynamicQp.name.toLowerCase());
                     if (isNamedYearQP) {
                        existingSubject.questionPapers.push(dynamicQp)
                     }
                }
              });

          } else {
              // If a dynamic subject doesn't exist in static data (e.g. elective), add it.
              subjectsMap.set(subjectId, dynamicSubject);
          }
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

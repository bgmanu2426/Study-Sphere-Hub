'use client';

import { useState } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { resources, Subject } from '@/lib/data';

export function HomePageClient() {
  const [selectedFilters, setSelectedFilters] = useState<{
    scheme: string;
    branch: string;
    year: string;
    semester: string;
  } | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    setIsLoading(true);
    setSelectedFilters(filters);
    
    // Simulate network delay
    setTimeout(() => {
        const { scheme, branch, semester } = filters;
        
        let semesterToUse = semester;
        
        const result = resources[scheme]?.[branch]?.[semesterToUse] || [];
        setSubjects(result);
        setIsLoading(false);
    }, 500);
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

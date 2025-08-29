'use client';

import { useState } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { Subject } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

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

  const handleSearch = async (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    setIsLoading(true);
    setSelectedFilters(filters);
    
    try {
      const { scheme, branch, semester } = filters;
      const response = await fetch(`/api/resources?scheme=${scheme}&branch=${branch}&semester=${semester}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources.');
      }
      
      const data = await response.json();
      setSubjects(data);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch resources. Please try again later.',
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

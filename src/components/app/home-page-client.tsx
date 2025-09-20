
'use client';

import { useState } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { Subject } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

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
  const { user } = useAuth();

  const handleSearch = async (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'Please log in to search for resources.'});
      return;
    }

    setIsLoading(true);
    setSelectedFilters(filters);
    
    try {
      const { scheme, branch, semester } = filters;
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/resources?scheme=${scheme}&branch=${branch}&semester=${semester}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch resources.');
      }
      
      const fetchedSubjects: Subject[] = await response.json();
      setSubjects(fetchedSubjects);

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

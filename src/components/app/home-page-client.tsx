
'use client';

import { useState, useCallback, useEffect } from 'react';
import { CourseSelector } from './course-selector';
import { ResourceList } from './resource-list';
import { Subject } from '@/lib/data';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/auth-context';

export function HomePageClient() {
  const { user, loading: authLoading } = useAuth();
  const [selectedFilters, setSelectedFilters] = useState<{
    scheme: string;
    branch: string;
    year: string;
    semester: string;
  } | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltered, setIsFiltered] = useState(false);

  // Fetch all resources on initial load
  const fetchAllResources = useCallback(async () => {
    setIsLoading(true);
    setIsFiltered(false);
    try {
      const response = await fetch('/api/resources?all=true');
      if (!response.ok) {
        throw new Error('Failed to fetch resources.');
      }
      const fetchedSubjects: Subject[] = await response.json();
      setSubjects(fetchedSubjects);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Could not fetch resources.');
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load all resources when component mounts and user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      fetchAllResources();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user, fetchAllResources]);

  const handleSearch = useCallback(async (filters: { scheme: string; branch: string; year: string; semester: string }) => {
    if (!user) {
      toast.error('You must be logged in to search for resources.');
      return;
    }

    setIsLoading(true);
    setSelectedFilters(filters);
    setIsFiltered(true);
    
    try {
      const { scheme, branch, year, semester } = filters;
      
      const response = await fetch(`/api/resources?scheme=${scheme}&branch=${branch}&year=${year}&semester=${semester}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch resources.');
      }
      
      const fetchedSubjects: Subject[] = await response.json();
      setSubjects(fetchedSubjects);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Could not fetch resources. Please try again later.');
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleClearFilters = useCallback(() => {
    setSelectedFilters(null);
    fetchAllResources();
  }, [fetchAllResources]);

  const refreshResources = useCallback(() => {
    if (selectedFilters) {
      handleSearch(selectedFilters);
    } else {
      fetchAllResources();
    }
  }, [selectedFilters, handleSearch, fetchAllResources]);

  if (!authLoading && !user) {
    return (
      <div className="container mx-auto max-w-7xl py-6 md:py-8 lg:py-10">
        <div className="text-center py-10">
          <h3 className="text-xl font-medium text-muted-foreground">Please log in to view resources.</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-6 md:py-8 lg:py-10">
      <div className="space-y-6 md:space-y-8">
        <CourseSelector onSearch={handleSearch} onClear={handleClearFilters} isLoading={isLoading} isFiltered={isFiltered} />
        <ResourceList 
            subjects={subjects} 
            isLoading={isLoading} 
            filtersSet={true} 
            onResourceChange={refreshResources}
            isFiltered={isFiltered}
        />
      </div>
    </div>
  );
}

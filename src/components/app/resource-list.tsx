
import { Subject } from '@/lib/data';
import { ResourceCard } from './resource-card';
import { Skeleton } from '@/components/ui/skeleton';

type ResourceListProps = {
  subjects: Subject[];
  isLoading: boolean;
  filtersSet: boolean;
  onResourceChange: () => void;
  isFiltered?: boolean;
};

function ResourceSkeleton() {
    return (
        <div className="flex flex-col space-y-3">
            <Skeleton className="h-[170px] w-full rounded-xl" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    )
}

export function ResourceList({ subjects, isLoading, filtersSet, onResourceChange, isFiltered }: ResourceListProps) {
  if (isLoading) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <ResourceSkeleton key={i} />)}
        </div>
    )
  }

  if (!filtersSet) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-medium text-muted-foreground">Select your course details above to get started.</h3>
      </div>
    )
  }

  if (subjects.length === 0 && filtersSet) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-medium">No resources found.</h3>
        <p className="text-muted-foreground">Please try a different combination or check back later.</p>
      </div>
    );
  }

  return (
    <div>
        <h2 className="text-2xl font-bold mb-4">
          {isFiltered ? 'Filtered Results' : 'All Available Subjects'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isFiltered 
            ? `Showing ${subjects.length} subject${subjects.length !== 1 ? 's' : ''} matching your criteria.`
            : `Browse all ${subjects.length} available subjects. Use the filters above to narrow down your search.`
          }
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subjects.map((subject, index) => (
                <ResourceCard key={`${subject.id}-${index}`} subject={subject} onResourceChange={onResourceChange} />
            ))}
        </div>
    </div>
  );
}

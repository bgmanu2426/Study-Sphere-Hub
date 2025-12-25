
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import toast from 'react-hot-toast';
import { Subject, ResourceFile } from '@/lib/data';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from '@/components/ui/button';
import { deleteResource } from '@/lib/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Book, FileText } from 'lucide-react';

type Filters = {
    scheme: string;
    branch: string;
    year: string;
    semester: string;
    subject: string;
};

type ExistingResourcesProps = {
    filters: Filters;
    onResourceDeleted: () => void;
    refreshKey: number;
};

function ResourceItem({ resource, onDelete }: { resource: ResourceFile; onDelete: (fileId: string) => void; }) {
  if (!resource || !resource.url) {
      return null;
  }

  return (
    <div className="flex items-center gap-2 group p-2 rounded-md hover:bg-muted/50 transition-colors">
        <Link
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-sm font-medium text-primary hover:underline truncate"
        >
            {resource.name}
        </Link>
        {resource.fileId && (
             <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(resource.fileId!)}
             >
                <Trash2 className="h-4 w-4" />
             </Button>
        )}
    </div>
  );
}

export function ExistingResources({ filters, onResourceDeleted, refreshKey }: ExistingResourcesProps) {
    const { user } = useAuth();
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Stable string key for filters to prevent unnecessary re-fetches
    const filtersKey = `${filters.scheme}-${filters.branch}-${filters.year}-${filters.semester}-${filters.subject}`;

    useEffect(() => {
        // Cancel any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (!user || !filters.subject || !filters.scheme || !filters.branch || !filters.semester) {
            setSubject(null);
            return;
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const fetchResources = async () => {
            setIsLoading(true);
            try {
                const { scheme, branch, semester, subject: subjectId, year } = filters;
                
                const response = await fetch(
                    `/api/resources?scheme=${scheme}&branch=${branch}&year=${year}&semester=${semester}`,
                    { signal: abortController.signal }
                );
                
                if (!response.ok) throw new Error('Failed to fetch resources.');
                
                const fetchedSubjects: Subject[] = await response.json();
                const currentSubject = fetchedSubjects.find(s => s.id === subjectId) || null;
                setSubject(currentSubject);

            } catch (error: any) {
                if (error.name === 'AbortError') return; // Ignore aborted requests
                toast.error(error.message);
                setSubject(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResources();

        return () => {
            abortController.abort();
        };
    }, [user, filtersKey, refreshKey]);

    const handleDeleteRequest = (fileId: string) => {
        setDeleteCandidate(fileId);
    }

    const executeDelete = async () => {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        try {
            const result = await deleteResource(deleteCandidate);
            if (result.error) throw new Error(result.error);
            toast.success("Resource deleted.");
            setDeleteCandidate(null);
            onResourceDeleted(); // This will trigger a refresh via the parent component
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsDeleting(false);
        }
    }
    
    if (isLoading) {
        return <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    }

    if (!subject) {
        return <p className="text-sm text-muted-foreground">Select a subject to see existing resources.</p>;
    }

    const uploadedNotes = Object.entries(subject.notes || {}).filter(([, resource]) => resource && resource.fileId);
    const uploadedQPs = (subject.questionPapers || []).filter(qp => qp.fileId);
    const hasUploadedFiles = uploadedNotes.length > 0 || uploadedQPs.length > 0;

    return (
        <div className="space-y-6">
            {!hasUploadedFiles ? (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">No user-uploaded resources found for this subject.</p>
            ) : (
                <>
                    {uploadedNotes.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center text-lg"><Book className="mr-2 h-5 w-5"/>Uploaded Notes</h4>
                            <div className="border rounded-lg p-2 space-y-1">
                                {uploadedNotes.map(([module, resourceFile]) => (
                                    <div key={module} className="flex items-center">
                                        <span className="text-sm font-medium w-24">{`Module ${module.replace('module', '')}:`}</span>
                                        <ResourceItem resource={resourceFile} onDelete={handleDeleteRequest} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {uploadedQPs.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center text-lg"><FileText className="mr-2 h-5 w-5"/>Uploaded Question Papers</h4>
                            <div className="border rounded-lg p-2 space-y-1">
                                {uploadedQPs.map((qp, index) => (
                                    <ResourceItem key={`${qp.url}-${index}`} resource={qp} onDelete={handleDeleteRequest} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
             <AlertDialog open={!!deleteCandidate} onOpenChange={() => setDeleteCandidate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the file.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} disabled={isDeleting} className={buttonVariants({variant: 'destructive'})}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

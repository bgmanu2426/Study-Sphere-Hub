
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { schemes, years, semesters as allSemesters, cycles } from '@/lib/data';
import { Loader2, Upload, CheckCircle2, XCircle, Plus, Search, Eye, Trash2, FileText } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/auth-context';
import { uploadResource, deleteResource } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { getBranches, addBranch, getSubjects, addSubject, Branch, Subject as DbSubject } from '@/lib/database';
import { Card, CardContent } from '@/components/ui/card';


const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please select a subject'),
  resourceType: z.enum(['Notes', 'Question Paper']),
  file: z.any()
    .refine((files) => files?.length === 1, 'File is required.')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, 'File should be less than 10MB'),
  module: z.string().optional(),
}).refine(data => {
    if (data.resourceType === 'Notes') {
        return !!data.module;
    }
    return true;
}, {
    message: "Please select a module for notes.",
    path: ['module'],
});

type FormValues = z.infer<typeof formSchema>;


export function UploadForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'complete' | 'error'>('pending');
  const [conflict, setConflict] = useState<{ show: boolean, existingFileId: string | null }>({ show: false, existingFileId: null });
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string, name: string }[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Branch state
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [showAddBranchDialog, setShowAddBranchDialog] = useState(false);
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  
  // Subject state
  const [dbSubjects, setDbSubjects] = useState<DbSubject[]>([]);
  const [showAddSubjectDialog, setShowAddSubjectDialog] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Fetch state - for checking existing resources
  const [hasFetched, setHasFetched] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [existingResource, setExistingResource] = useState<{ name: string; url: string; fileId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheme: '',
      branch: '',
      year: '',
      semester: '',
      subject: '',
      resourceType: 'Notes',
      module: 'module1',
    },
  });

  const { watch, reset, resetField, register, handleSubmit, getValues } = form;
  const watchedScheme = watch('scheme');
  const watchedBranch = watch('branch');
  const watchedSemester = watch('semester');
  const watchedSubject = watch('subject');
  const selectedYear = watch('year');
  const resourceType = watch('resourceType');
  const fileRef = register('file');

  const triggerRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Reset fetch state when filters change
  useEffect(() => {
    setHasFetched(false);
    setExistingResource(null);
  }, [watchedScheme, watchedBranch, watchedSemester, watchedSubject, resourceType, form.watch('module')]);

  // Fetch existing resource for the selected combination
  const handleFetch = async () => {
    const values = getValues();
    if (!values.scheme || !values.branch || !values.semester || !values.subject) {
      toast.error('Please select all required filters first');
      return;
    }
    
    if (values.resourceType === 'Notes' && !values.module) {
      toast.error('Please select a module for notes');
      return;
    }

    setIsFetching(true);
    setExistingResource(null);

    try {
      const response = await fetch(
        `/api/resources?scheme=${values.scheme}&branch=${values.branch}&semester=${values.semester}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      const subjects = await response.json();
      const subject = subjects.find((s: any) => s.id === values.subject);

      if (subject) {
        if (values.resourceType === 'Notes' && values.module) {
          const moduleNotes = subject.notes?.[values.module];
          if (moduleNotes && moduleNotes.url) {
            setExistingResource({
              name: moduleNotes.name,
              url: moduleNotes.url,
              fileId: moduleNotes.fileId || '',
            });
          }
        } else if (values.resourceType === 'Question Paper') {
          const qp = subject.questionPapers?.[0];
          if (qp && qp.url) {
            setExistingResource({
              name: qp.name,
              url: qp.url,
              fileId: qp.fileId || '',
            });
          }
        }
      }

      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to check for existing resources');
    } finally {
      setIsFetching(false);
    }
  };

  // Handle delete existing resource
  const handleDeleteExisting = async () => {
    if (!existingResource?.fileId) {
      toast.error('Cannot delete: No file ID found');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteResource(existingResource.fileId);
      toast.success('Resource deleted successfully');
      setExistingResource(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load branches from database
  useEffect(() => {
    async function loadBranches() {
      setIsLoadingBranches(true);
      try {
        const dbBranches = await getBranches();
        setBranches(dbBranches.map(db => ({ value: db.value, label: db.label })));
      } catch (error) {
        console.error('Error loading branches:', error);
      } finally {
        setIsLoadingBranches(false);
      }
    }
    loadBranches();
  }, []);

  // Load subjects from database
  useEffect(() => {
    async function loadSubjects() {
      if (watchedScheme && watchedBranch && watchedSemester) {
        // Get subjects from database
        try {
          const subjects = await getSubjects(watchedScheme, watchedBranch, watchedSemester);
          setDbSubjects(subjects);
          setAvailableSubjects(subjects.map(s => ({ id: s.subjectId, name: s.name })));
        } catch (error) {
          console.error('Error loading subjects from database:', error);
          setAvailableSubjects([]);
        }
      } else {
        setAvailableSubjects([]);
      }
      resetField('subject');
    }
    loadSubjects();
  }, [watchedScheme, watchedBranch, watchedSemester, resetField]);

  // Handle adding a new branch
  const handleAddBranch = async () => {
    if (!newBranchLabel.trim()) {
      toast.error('Please enter a branch name');
      return;
    }
    
    setIsAddingBranch(true);
    try {
      const value = newBranchLabel.toLowerCase().replace(/\s+/g, '-');
      const newBranch = await addBranch(value, newBranchLabel, watchedScheme || '2022');
      if (newBranch) {
        setBranches(prev => [...prev, { value: newBranch.value, label: newBranch.label }]);
        toast.success('Branch added successfully');
        setShowAddBranchDialog(false);
        setNewBranchLabel('');
      }
    } catch (error) {
      toast.error('Failed to add branch');
    } finally {
      setIsAddingBranch(false);
    }
  };

  // Handle adding a new subject
  const handleAddSubject = async () => {
    if (!newSubjectId.trim() || !newSubjectName.trim()) {
      toast.error('Please enter both subject ID and name');
      return;
    }
    
    if (!watchedScheme || !watchedBranch || !watchedSemester) {
      toast.error('Please select scheme, branch, and semester first');
      return;
    }
    
    setIsAddingSubject(true);
    try {
      const newSubject = await addSubject(
        newSubjectId.trim(),
        newSubjectName.trim(),
        watchedScheme,
        watchedBranch,
        watchedSemester
      );
      if (newSubject) {
        setAvailableSubjects(prev => [...prev, { id: newSubject.subjectId, name: newSubject.name }]);
        toast.success('Subject added successfully');
        setShowAddSubjectDialog(false);
        setNewSubjectId('');
        setNewSubjectName('');
      }
    } catch (error) {
      toast.error('Failed to add subject');
    } finally {
      setIsAddingSubject(false);
    }
  };
  
  const availableSemesters = useMemo(() => {
    if (!selectedYear) return [];
    if (selectedYear === '1') return cycles;

    const yearNum = parseInt(selectedYear, 10);
    if (isNaN(yearNum)) return [];
    
    const startSem = (yearNum - 1) * 2 + 1;
    const endSem = startSem + 1;

    return allSemesters.filter(s => {
        const semNum = parseInt(s.value, 10);
        return semNum >= startSem && semNum <= endSem;
    });
  }, [selectedYear]);

  const semesterLabel = selectedYear === '1' ? 'Cycle' : 'Semester';

  const handleUpload = async (values: FormValues, overwrite = false, existingFileId: string | null = null) => {
    if (!user) {
        toast.error('You must be logged in to upload a resource.');
        return;
    }
    
    // Check file size before upload
    const file = values.file?.[0];
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
        toast.error('File should be less than 10MB');
        return;
    }
    
    setIsSubmitting(true);
    setUploadStatus('uploading');
    setUploadProgress(50);

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'file') {
        formData.append(key, value[0]);
      } else if (value) {
        formData.append(key, value as string);
      }
    });

    if (overwrite) {
        formData.append('overwrite', 'true');
        if (existingFileId) {
            formData.append('existingFileId', existingFileId);
        }
    }


    try {
        const result = await uploadResource(formData);

        if (result.conflict && result.existingFileId) {
            setUploadStatus('pending');
            setIsSubmitting(false);
            setConflict({ show: true, existingFileId: result.existingFileId });
            return;
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (result.fileUrl) {
            setUploadProgress(100);
            setUploadStatus('complete');
            toast.success('File uploaded successfully.');
            // Instead of redirecting, just reset the form and refresh the list
            resetField('file');
            setHasFetched(false); // Reset fetch state to allow re-fetching
            setExistingResource(null);
            triggerRefresh(); 
            setUploadStatus('pending');
        } else {
            throw new Error("An unknown error occurred during upload.");
        }
    } catch (error: any) {
        setUploadStatus('error');
        setUploadProgress(0);
        toast.error(error.message || 'Could not upload the file. Please try again.');
    } finally {
        if (!conflict.show) { // Don't reset submitting state if we are showing conflict dialog
            setIsSubmitting(false);
        }
    }
  }

  const onConfirmOverwrite = () => {
    handleSubmit((values) => handleUpload(values, true, conflict.existingFileId))();
    setConflict({ show: false, existingFileId: null });
  };


  let statusIndicatorContent = null;
  switch (uploadStatus) {
    case 'uploading':
      statusIndicatorContent = <p className="text-sm text-muted-foreground mt-1">Uploading...</p>;
      break;
    case 'complete':
      statusIndicatorContent = <div className="flex items-center text-sm text-green-600 mt-1"><CheckCircle2 className="mr-1 h-4 w-4" />Upload complete!</div>;
      break;
    case 'error':
      statusIndicatorContent = <div className="flex items-center text-sm text-destructive mt-1"><XCircle className="mr-1 h-4 w-4" />Upload failed.</div>;
      break;
    default:
      statusIndicatorContent = null;
  }
  
  const selectedFilters = getValues();
  const canShowExisting = selectedFilters.scheme && selectedFilters.branch && selectedFilters.semester && selectedFilters.subject;

  return (
    <>
    <Form {...form}>
      <form onSubmit={handleSubmit(values => handleUpload(values))} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <FormField
                control={form.control}
                name="scheme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheme</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Scheme" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schemes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        if (value === '__add_new__') {
                          setShowAddBranchDialog(true);
                        } else {
                          field.onChange(value);
                        }
                      }} 
                      defaultValue={field.value} 
                      disabled={isSubmitting || isLoadingBranches}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingBranches ? "Loading..." : "Select Branch"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Click here to add branch
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        resetField('semester');
                    }} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y.value} value={y.value}>
                            {y.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{semesterLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedYear || isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedYear ? `Select ${semesterLabel}`: "Select Year first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSemesters.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      if (value === '__add_new__') {
                        setShowAddSubjectDialog(true);
                      } else {
                        field.onChange(value);
                      }
                    }}
                    value={field.value}
                    disabled={!watchedScheme || !watchedBranch || !watchedSemester || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={watchedScheme && watchedBranch && watchedSemester ? "Select Subject" : "Select filters first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </SelectItem>
                      ))}
                      {watchedScheme && watchedBranch && watchedSemester && (
                        <SelectItem value="__add_new__" className="text-primary font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Click here to add subject
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="resourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Notes">Notes</SelectItem>
                        <SelectItem value="Question Paper">Question Paper</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>
       
        {resourceType === 'Notes' && (
           <FormField
              control={form.control}
              name="module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1,2,3,4,5].map(m => (
                        <SelectItem key={m} value={`module${m}`}>{`Module ${m}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}

        {/* Fetch Button */}
        <div className="flex justify-start pt-2">
          <Button 
            type="button" 
            onClick={handleFetch} 
            disabled={isFetching || !watchedScheme || !watchedBranch || !watchedSemester || !watchedSubject || (resourceType === 'Notes' && !form.watch('module'))}
            variant="outline"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {isFetching ? 'Fetching...' : 'Fetch'}
          </Button>
        </div>

        <Separator />

        {/* Show existing resource or upload option based on fetch result */}
        {hasFetched && (
          <>
            {existingResource ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Existing Resource Found</p>
                        <p className="text-sm text-green-600 truncate max-w-[300px]">{existingResource.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(existingResource.url, '_blank')}
                        className="border-green-300 hover:bg-green-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDeleteExisting}
                        disabled={isDeleting}
                        className="border-red-300 hover:bg-red-100 text-red-600"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File</FormLabel>
                      <FormControl>
                        <Input type="file" {...fileRef} disabled={isSubmitting} />
                      </FormControl>
                      <FormDescription>Select the PDF or document you want to upload (Max 10MB).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               
                {isSubmitting && (
                  <div>
                     <Progress value={uploadProgress} className="h-2 mt-1" />
                     {statusIndicatorContent}
                  </div>
                )}
               
                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {isSubmitting ? 'Uploading...' : 'Upload Resource'}
                    </Button>
                </div>
              </>
            )}
          </>
        )}

        {!hasFetched && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select all filters and click "Fetch" to check for existing resources</p>
          </div>
        )}
      </form>
    </Form>

    <AlertDialog open={conflict.show} onOpenChange={(open) => !open && setConflict({ show: false, existingFileId: null })}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>File Already Exists</AlertDialogTitle>
                  <AlertDialogDescription>
                      A file for this subject and module already exists. Do you want to replace it with the new file?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConflict({ show: false, existingFileId: null })} disabled={isSubmitting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirmOverwrite} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Replace
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Add Branch Dialog */}
      <Dialog open={showAddBranchDialog} onOpenChange={setShowAddBranchDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Enter the name of the new branch you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branch-name" className="text-right">
                Name
              </Label>
              <Input
                id="branch-name"
                value={newBranchLabel}
                onChange={(e) => setNewBranchLabel(e.target.value)}
                placeholder="e.g., Artificial Intelligence"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBranchDialog(false)} disabled={isAddingBranch}>
              Cancel
            </Button>
            <Button onClick={handleAddBranch} disabled={isAddingBranch}>
              {isAddingBranch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={showAddSubjectDialog} onOpenChange={setShowAddSubjectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Enter the subject ID and name for the new subject.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject-id" className="text-right">
                Subject ID
              </Label>
              <Input
                id="subject-id"
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                placeholder="e.g., 22CS101"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject-name" className="text-right">
                Name
              </Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Data Structures"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubjectDialog(false)} disabled={isAddingSubject}>
              Cancel
            </Button>
            <Button onClick={handleAddSubject} disabled={isAddingSubject}>
              {isAddingSubject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


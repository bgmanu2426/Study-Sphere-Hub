
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
import { schemes, branches, years, semesters as allSemesters, cycles, Subject, ResourceFile } from '@/lib/data';
import { Loader2, Upload, File as FileIcon, CheckCircle2, Trash2, Bot, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { firebaseApp } from '@/lib/firebase';
import { getStorage, ref, uploadBytesResumable, UploadTaskSnapshot, deleteObject, UploadTask } from 'firebase/storage';
import { useDebounce } from 'use-debounce';
import { summarizeAndStore } from '@/lib/actions';

const fileSchema = z.array(z.instanceof(File)).optional();

const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please enter a subject name'),
  resourceType: z.enum(['notes', 'questionPaper']),
  questionPaperFile: z.instanceof(File).optional(),
  module1Files: fileSchema,
  module2Files: fileSchema,
  module3Files: fileSchema,
  module4Files: fileSchema,
  module5Files: fileSchema,
}).refine(data => {
  if (data.resourceType === 'questionPaper') {
    return data.questionPaperFile && data.questionPaperFile.size > 0;
  }
  if (data.resourceType === 'notes') {
    return data.module1Files?.length || data.module2Files?.length || data.module3Files?.length || data.module4Files?.length || data.module5Files?.length;
  }
  return true; // Allow form submission for deletion without new files
}, {
  message: 'Please upload at least one file or manage existing ones.',
  path: ['questionPaperFile'],
});

type FormValues = z.infer<typeof formSchema>;

type UploadableFile = {
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'summarizing' | 'error' | 'canceled';
  task?: UploadTask;
}

export function UploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const { toast } = useToast();
  const [existingSubject, setExistingSubject] = useState<Subject | null>(null);
  const [isFetchingSubject, setIsFetchingSubject] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheme: '',
      branch: '',
      year: '',
      semester: '',
      subject: '',
      resourceType: 'notes',
    },
  });

  const { watch, resetField } = form;
  const watchedFields = watch();
  const [debouncedSubjectQuery] = useDebounce(watchedFields.subject, 500);

  const fetchSubject = useCallback(async () => {
    if (watchedFields.scheme && watchedFields.branch && watchedFields.semester && debouncedSubjectQuery) {
      setIsFetchingSubject(true);
      try {
        const response = await fetch(`/api/resources?scheme=${watchedFields.scheme}&branch=${watchedFields.branch}&semester=${watchedFields.semester}&subject=${debouncedSubjectQuery}`);
        if(response.ok) {
          const data = await response.json();
          // The API returns an array, we expect one or zero subjects.
          setExistingSubject(data.length > 0 ? data[0] : null);
        } else {
          setExistingSubject(null);
        }
      } catch (error) {
        console.error("Failed to fetch subject details", error);
        setExistingSubject(null);
      } finally {
        setIsFetchingSubject(false);
      }
    } else {
      setExistingSubject(null);
    }
  }, [watchedFields.scheme, watchedFields.branch, watchedFields.semester, debouncedSubjectQuery]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);


  const selectedYear = form.watch('year');
  const resourceType = form.watch('resourceType');

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
  
  const handleDelete = async (filePath: string) => {
    if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }
    setIsDeleting(filePath);
    try {
      const storage = getStorage(firebaseApp);
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      toast({ title: 'File Deleted', description: 'The file has been successfully deleted.' });
      fetchSubject(); // Refresh the file list
    } catch (error) {
      console.error("Deletion failed:", error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the file. Please try again.' });
    } finally {
      setIsDeleting(null);
    }
  };

  const uploadFile = (fileToUpload: UploadableFile) => {
    return new Promise<void>((resolve, reject) => {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, fileToUpload.path);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload.file);

      // Store the task so we can cancel it
      setUploadableFiles(prevFiles => 
        prevFiles.map(f => f.path === fileToUpload.path ? { ...f, task: uploadTask } : f)
      );

      uploadTask.on('state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadableFiles(prevFiles => 
            prevFiles.map(f => f.path === fileToUpload.path ? { ...f, progress, status: 'uploading' } : f)
          );
        },
        (error) => {
           switch (error.code) {
            case 'storage/canceled':
              setUploadableFiles(prevFiles => 
                prevFiles.map(f => f.path === fileToUpload.path ? { ...f, status: 'canceled' } : f)
              );
              break;
            default:
              setUploadableFiles(prevFiles => 
                prevFiles.map(f => f.path === fileToUpload.path ? { ...f, status: 'error' } : f)
              );
              break;
          }
          reject(error);
        },
        async () => {
          setUploadableFiles(prevFiles => 
            prevFiles.map(f => f.path === fileToUpload.path ? { ...f, progress: 100, status: 'summarizing' } : f)
          );
          
          try {
            await summarizeAndStore(fileToUpload.path);
            setUploadableFiles(prevFiles => 
              prevFiles.map(f => f.path === fileToUpload.path ? { ...f, status: 'complete' } : f)
            );
          } catch(e) {
            console.error("Summarization failed for file:", fileToUpload.file.name, e);
            setUploadableFiles(prevFiles => 
              prevFiles.map(f => f.path === fileToUpload.path ? { ...f, status: 'error' } : f)
            );
          }
          
          resolve();
        }
      );
    });
  };

  const handleCancelUpload = (path: string) => {
    const fileToCancel = uploadableFiles.find(f => f.path === path);
    if (fileToCancel && fileToCancel.task) {
      fileToCancel.task.cancel();
    }
  }

  async function onSubmit(values: FormValues) {
    const allFilesToProcess: { file: File, path: string }[] = [];
    const basePath = `resources/${values.scheme}/${values.branch}/${values.semester}/${values.subject}`;

    if (values.resourceType === 'notes') {
        const moduleFiles = [
            { files: values.module1Files, name: 'module1' },
            { files: values.module2Files, name: 'module2' },
            { files: values.module3Files, name: 'module3' },
            { files: values.module4Files, name: 'module4' },
            { files: values.module5Files, name: 'module5' },
        ];
        for (const item of moduleFiles) {
            if (item.files) {
              for (const file of item.files) {
                  allFilesToProcess.push({ file, path: `${basePath}/notes/${item.name}/${file.name}` });
              }
            }
        }
    } else if (values.resourceType === 'questionPaper' && values.questionPaperFile) {
         allFilesToProcess.push({ file: values.questionPaperFile, path: `${basePath}/questionPapers/${values.questionPaperFile.name}` });
    }

    if (allFilesToProcess.length === 0) {
        toast({ variant: 'destructive', title: 'No files selected', description: 'Please select files to upload.' });
        return;
    }

    const filesToUpload: UploadableFile[] = allFilesToProcess.map(f => ({ ...f, progress: 0, status: 'pending' }));
    setUploadableFiles(filesToUpload);
    setIsSubmitting(true);
    
    let filesUploadedCount = 0;
    let anyError = false;

    for (const fileToUpload of filesToUpload) {
      try {
        await uploadFile(fileToUpload);
        filesUploadedCount++;
      } catch (error: any) {
        anyError = true;
        if(error.code !== 'storage/canceled') {
          toast({
              variant: 'destructive',
              title: `Upload failed for ${fileToUpload.file.name}`,
              description: error.message,
          });
        }
      }
    }
    
    setIsSubmitting(false);

    if (filesUploadedCount === allFilesToProcess.length && filesUploadedCount > 0 && !anyError) {
      toast({
        title: 'Upload Successful',
        description: `${filesUploadedCount} file(s) have been uploaded and processed.`,
      });
      ['module1Files', 'module2Files', 'module3Files', 'module4Files', 'module5Files', 'questionPaperFile'].forEach(field => resetField(field as keyof FormValues));
      setUploadableFiles([]);
      fetchSubject();
    } else if (filesUploadedCount > 0 && anyError) {
        toast({
        variant: 'destructive',
        title: 'Upload Incomplete',
        description: `Only ${filesUploadedCount} of ${allFilesToProcess.length} files were processed. Check for errors.`,
      });
      fetchSubject();
    }
  }

  const renderExistingFiles = (files: { [key: string]: ResourceFile } | ResourceFile[], isNotes: boolean) => {
    const fileList = isNotes ? Object.values(files as { [key: string]: ResourceFile }).filter(f => f) : (files as ResourceFile[]);
    if (fileList.length === 0) return <p className="text-sm text-muted-foreground">No existing files.</p>;

    return (
      <div className="space-y-2">
        {fileList.map((file) => {
          if (!file) return null;
          const moduleName = isNotes ? Object.keys(files as { [key: string]: ResourceFile }).find(key => (files as any)[key] === file) : '';
          const filePath = isNotes 
            ? `resources/${watchedFields.scheme}/${watchedFields.branch}/${watchedFields.semester}/${watchedFields.subject}/notes/${moduleName}/${file.name}`
            : `resources/${watchedFields.scheme}/${watchedFields.branch}/${watchedFields.semester}/${watchedFields.subject}/questionPapers/${file.name}`;
          
          return (
            <div key={filePath} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDelete(filePath)}
                disabled={isDeleting === filePath}
              >
                {isDeleting === filePath ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
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
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('semester');
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
                    <FormLabel>Subject Name or Code</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Data Structures or 22CS32" {...field} disabled={isSubmitting} />
                    </FormControl>
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
                        <SelectItem value="notes">Notes</SelectItem>
                        <SelectItem value="questionPaper">Question Paper</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>
       
        {resourceType === 'notes' && (
          <div className="space-y-4 rounded-lg border p-4">
             <div className="flex items-center">
              <h3 className="text-lg font-medium">Module Notes</h3>
              {isFetchingSubject && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
            </div>
            <FormDescription>Upload one PDF file for each module. Uploading a new file will replace the existing one.</FormDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5].map((moduleNumber) => {
                 const moduleName = `module${moduleNumber}`;
                 const existingNotesForModule = existingSubject?.notes?.[moduleName] ? { [moduleName]: existingSubject.notes[moduleName] } : {};

                 return (
                    <div key={moduleNumber} className="space-y-2">
                        <FormField
                            control={form.control}
                            name={`module${moduleNumber}Files` as keyof FormValues}
                            render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
                                <FormLabel>Module {moduleNumber}</FormLabel>
                                <FormControl>
                                <Input 
                                    type="file" 
                                    accept="application/pdf"
                                    multiple={false} // Allow only single file upload
                                    disabled={isSubmitting}
                                    onChange={(e) => onChange(e.target.files ? Array.from(e.target.files) : [])}
                                    {...rest}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-semibold text-muted-foreground">EXISTING FILE</h4>
                             {renderExistingFiles(existingNotesForModule, true)}
                        </div>
                    </div>
                 )
              })}
            </div>
          </div>
        )}

        {resourceType === 'questionPaper' && (
          <div className="space-y-4 rounded-lg border p-4">
             <div className="flex items-center">
                <h3 className="text-lg font-medium">Question Papers</h3>
                {isFetchingSubject && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
            </div>
            <FormField
              control={form.control}
              name="questionPaperFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Upload New Question Paper</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="application/pdf"
                      disabled={isSubmitting}
                      onChange={(e) => onChange(e.target.files?.[0])}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>Please upload a single PDF file.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground">EXISTING FILES</h4>
              {renderExistingFiles(existingSubject?.questionPapers || [], false)}
            </div>
          </div>
        )}
       
        {uploadableFiles.length > 0 && (
            <div className="space-y-4 rounded-lg border p-4">
               <h3 className="text-lg font-medium">Upload Progress</h3>
               <div className='space-y-2'>
                {uploadableFiles.map(f => (
                  <div key={f.path} className="w-full">
                      <div className="flex items-center gap-2 text-sm">
                        {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin"/>}
                        {f.status === 'summarizing' && <Bot className="w-4 h-4 animate-spin text-primary"/>}
                        {f.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                        {f.status === 'canceled' && <XCircle className="w-4 h-4 text-gray-500"/>}
                        {f.status === 'error' && <XCircle className="w-4 h-4 text-destructive"/>}
                        {f.status === 'pending' && <FileIcon className="w-4 h-4 text-muted-foreground"/>}
                        <span className="truncate flex-1">{f.file.name}</span>
                        {f.status === 'uploading' && <span className="text-muted-foreground">{Math.round(f.progress)}%</span>}
                        {f.status === 'summarizing' && <span className="text-xs text-primary">Summarizing...</span>}
                        {f.status === 'canceled' && <span className="text-xs text-gray-500">Canceled</span>}
                        {f.status === 'error' && <span className="text-xs text-destructive">Error</span>}

                        {f.status === 'uploading' && (
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCancelUpload(f.path)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {(f.status === 'uploading' || f.status === 'summarizing') && <Progress value={f.progress} className="h-2 mt-1" />}
                  </div>
                ))}
               </div>
            </div>
        )}
       
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting || isFetchingSubject} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload File(s)
            </Button>
        </div>
      </form>
    </Form>
  );
}

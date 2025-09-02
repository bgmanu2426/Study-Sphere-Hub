
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
import { vtuResources } from '@/lib/vtu-data';
import { Loader2, Upload, File as FileIcon, CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteFileByPath } from '@/lib/cloudinary';
import { ResourceMetadata, saveResourceMetadata } from '@/lib/actions';
import Link from 'next/link';

const fileSchema = z.custom<File[]>(files => Array.isArray(files) && files.every(file => file instanceof File), "Please upload valid files.").optional();


const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please select a subject'),
  resourceType: z.enum(['notes', 'questionPaper']),
  questionPaperFile: fileSchema,
  module1Files: fileSchema,
  module2Files: fileSchema,
  module3Files: fileSchema,
  module4Files: fileSchema,
  module5Files: fileSchema,
}).refine(data => {
    if (data.resourceType === 'notes') {
        return true;
    }
    if (data.resourceType === 'questionPaper') {
        return true;
    }
    return true;
}, {
  message: 'Please select at least one file to upload for the chosen resource type.',
  path: ['resourceType'], 
});


type FormValues = z.infer<typeof formSchema>;

type UploadableFile = {
  file: File;
  path: string; // This will be the Cloudinary public_id
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error' | 'canceled';
  module?: string;
}

type UploadFormProps = {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
};


export function UploadForm({ cloudName, apiKey, uploadPreset }: UploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const { toast } = useToast();
  const [existingSubject, setExistingSubject] = useState<Subject | null>(null);
  const [isFetchingSubject, setIsFetchingSubject] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string, name: string }[]>([]);

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

  const { watch, resetField, trigger, getValues } = form;
  const watchedScheme = watch('scheme');
  const watchedBranch = watch('branch');
  const watchedYear = watch('year');
  const watchedSemester = watch('semester');
  const watchedSubject = watch('subject');
  
  useEffect(() => {
    if (watchedScheme && watchedBranch && watchedSemester) {
      const schemeData = vtuResources[watchedScheme as keyof typeof vtuResources];
      const branchData = schemeData?.[watchedBranch as keyof typeof schemeData];
      const semesterData = branchData?.[watchedSemester as keyof typeof branchData] || [];
      setAvailableSubjects(semesterData.map(s => ({ id: s.id, name: s.name })));
    } else {
      setAvailableSubjects([]);
    }
    resetField('subject');
    setExistingSubject(null);
  }, [watchedScheme, watchedBranch, watchedSemester, resetField]);


  const fetchSubject = useCallback(async () => {
    const { scheme, branch, semester, subject: subjectId } = getValues();

    if (!scheme || !branch || !semester || !subjectId) {
      setExistingSubject(null);
      return;
    }

    setIsFetchingSubject(true);
    try {
      const subjectName = availableSubjects.find(s => s.id === subjectId)?.name || '';
      if (!subjectName) {
          setExistingSubject(null);
          setIsFetchingSubject(false);
          return;
      }
      
      const response = await fetch(`/api/resources?scheme=${scheme}&branch=${branch}&semester=${semester}&subject=${encodeURIComponent(subjectName)}`);
      if (response.ok) {
        const data = await response.json();
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
  }, [getValues, availableSubjects]);


  useEffect(() => {
    if (watchedSubject) {
        fetchSubject();
    } else {
        setExistingSubject(null);
    }
  }, [watchedSubject, fetchSubject]);



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
  
  const handleDelete = async (publicId: string) => {
    if (!window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }
    setIsDeleting(publicId);
    try {
      await deleteFileByPath(publicId);
      toast({ title: 'File Deleted', description: 'The file has been successfully deleted.' });
      await fetchSubject(); // Refresh the file list after deletion
    } catch (error) {
      console.error("Deletion failed:", error);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the file. Please try again.' });
    } finally {
      setIsDeleting(null);
    }
  };

  const processSingleFile = (file: File, publicId: string, moduleName?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const { scheme, branch, semester, subject: subjectId, resourceType } = getValues();
        const subjectName = availableSubjects.find(s => s.id === subjectId)?.name;

        if (!subjectName) {
            const errorMsg = "Could not determine subject name for upload.";
            console.error(errorMsg);
            toast({ variant: 'destructive', title: 'Upload Error', description: errorMsg });
            setUploadableFiles(prev => prev.map(f => f.path === publicId ? { ...f, status: 'error' } : f));
            reject(new Error(errorMsg));
            return;
        }
        
        const publicIdWithoutExt = publicId.substring(0, publicId.lastIndexOf('.'));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('upload_preset', uploadPreset);
        formData.append('public_id', publicIdWithoutExt);
        formData.append('resource_type', 'raw');

        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
        xhr.open('POST', url, true);


        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                setUploadableFiles(prev => prev.map(f => f.path === publicId ? { ...f, status: 'uploading', progress } : f));
            }
        };

        xhr.onload = async () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                const metadata: ResourceMetadata = {
                  scheme, branch, semester, subject: subjectName, resourceType,
                  file: {
                    name: file.name,
                    url: response.secure_url,
                    publicId: response.public_id,
                  }
                };
                if (moduleName) {
                    metadata.module = moduleName;
                }

                await saveResourceMetadata(metadata);
                
                setUploadableFiles(prev => prev.map(f => f.path === publicId ? { ...f, status: 'complete', progress: 100 } : f));
                toast({
                    title: 'Upload Successful',
                    description: `Successfully uploaded "${file.name}".`,
                });
                resolve(response.public_id);
            } else {
                const error = JSON.parse(xhr.responseText);
                console.error(`Upload failed for ${file.name}:`, error.error.message);
                setUploadableFiles(prev => prev.map(f => f.path === publicId ? { ...f, status: 'error' } : f));
                toast({
                    variant: 'destructive',
                    title: `Upload failed for ${file.name}`,
                    description: error.error.message
                });
                reject(new Error(error.error.message));
            }
        };

        xhr.onerror = () => {
            console.error('Network error during upload');
             setUploadableFiles(prev => prev.map(f => f.path === publicId ? { ...f, status: 'error' } : f));
             toast({
                variant: 'destructive',
                title: `Upload failed for ${file.name}`,
                description: 'Network error occurred.'
             });
            reject(new Error('Network error'));
        };

        xhr.send(formData);
    });
};


  async function onSubmit(values: FormValues) {
     const isValid = await trigger();
     if (!isValid) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields.' });
        return;
     }
    
    const allFilesToProcess: { file: File, publicId: string, moduleName?: string }[] = [];
    const subjectName = availableSubjects.find(s => s.id === values.subject)?.name;

    if (!subjectName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the selected subject name.' });
        return;
    }

    const basePath = `resources/${values.scheme}/${values.branch}/${values.semester}/${subjectName}`;

    if (values.resourceType === 'notes') {
        const moduleFields: (keyof FormValues)[] = ['module1Files', 'module2Files', 'module3Files', 'module4Files', 'module5Files'];
        moduleFields.forEach((field, index) => {
            const files = values[field] as File[] | undefined;
            if (files && files.length > 0) {
                const moduleName = `module${index + 1}`;
                files.forEach(file => {
                   allFilesToProcess.push({ file, publicId: `${basePath}/notes/${moduleName}/${file.name}`, moduleName });
                });
            }
        });
    } else if (values.resourceType === 'questionPaper' && values.questionPaperFile) {
         values.questionPaperFile.forEach(file => {
            allFilesToProcess.push({ file, publicId: `${basePath}/questionPapers/${file.name}` });
         });
    }

    if (allFilesToProcess.length === 0) {
        toast({ title: 'No files selected', description: 'No new files were selected for upload.' });
        return;
    }
    
    setIsSubmitting(true);
    
    const initialFiles: UploadableFile[] = allFilesToProcess.map(f => ({ file: f.file, path: f.publicId, progress: 0, status: 'pending', module: f.moduleName }));
    setUploadableFiles(initialFiles);
    
    try {
        const uploadPromises = allFilesToProcess.map(f => processSingleFile(f.file, f.publicId, f.moduleName));
        await Promise.all(uploadPromises);

        toast({
          title: "All uploads complete",
          description: "All selected files have been processed.",
        });
        await fetchSubject(); 
    } catch(error) {
       toast({
          variant: 'destructive',
          title: "An upload failed",
          description: "One or more files failed to upload. Please check the list and try again.",
       });
    } finally {
        ['module1Files', 'module2Files', 'module3Files', 'module4Files', 'module5Files', 'questionPaperFile'].forEach(field => resetField(field as keyof FormValues));
        setIsSubmitting(false);
        setTimeout(() => setUploadableFiles([]), 5000);
    }
  }

  const renderExistingFiles = (files: { [key: string]: ResourceFile } | ResourceFile[], isNotes: boolean) => {
    const fileList = isNotes ? Object.values(files as { [key: string]: ResourceFile }).filter(f => f) : (files as ResourceFile[]);
    if (fileList.length === 0) return <p className="text-sm text-muted-foreground">No existing files.</p>;

    return (
      <div className="space-y-2">
        {fileList.map((file) => {
          if (!file || !file.url) return null;
          
          const urlParts = file.url.match(/upload\/(?:v[0-9]+\/)?(.*)/);
          if (!urlParts || !urlParts[1]) return null;
          
          const publicIdWithExt = decodeURIComponent(urlParts[1]);
          
          return (
            <div key={file.url} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
              <Link href={file.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                {file.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDelete(publicIdWithExt)}
                disabled={isDeleting === publicIdWithExt}
              >
                {isDeleting === publicIdWithExt ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
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
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={availableSubjects.length === 0 || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={availableSubjects.length > 0 ? "Select Subject" : "Select filters first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
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
                                    multiple={false}
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
                      multiple
                      disabled={isSubmitting}
                      onChange={(e) => onChange(e.target.files ? Array.from(e.target.files) : [])}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>Please upload one or more PDF files.</FormDescription>
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
                        {f.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                        {f.status === 'canceled' && <XCircle className="w-4 h-4 text-gray-500"/>}
                        {f.status === 'error' && <XCircle className="w-4 h-4 text-destructive"/>}
                        {f.status === 'pending' && <FileIcon className="w-4 h-4 text-muted-foreground"/>}
                        <span className="truncate flex-1">{f.file.name}</span>
                        <span className="text-muted-foreground text-xs">{f.status}</span>
                      </div>
                      {(f.status === 'uploading') && <Progress value={f.progress} className="h-2 mt-1" />}
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

    
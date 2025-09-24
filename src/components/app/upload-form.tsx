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
import { schemes, branches, years, semesters as allSemesters, cycles, Subject } from '@/lib/data';
import { vtuResources } from '@/lib/vtu-data';
import { Loader2, Upload, File as FileIcon, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToDrive } from '@/ai/flows/upload-flow';
import { useAuth } from '@/context/auth-context';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileSchema = z.instanceof(File).refine(file => file.size < MAX_FILE_SIZE_BYTES, {
    message: `File must be less than ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
});

const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please select a subject'),
  resourceType: z.enum(['notes', 'questionPaper']),
  file: fileSchema,
  module: z.string().optional(),
}).refine(data => {
    if (data.resourceType === 'notes') {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'complete' | 'error'>('pending');
  const { toast } = useToast();
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
      module: 'module1',
    },
  });

  const { watch, reset, resetField } = form;
  const watchedScheme = watch('scheme');
  const watchedBranch = watch('branch');
  const watchedSemester = watch('semester');
  const selectedYear = watch('year');
  const resourceType = watch('resourceType');

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
  }, [watchedScheme, watchedBranch, watchedSemester, resetField]);
  
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
  };

  async function onSubmit(values: FormValues) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to upload a file.',
        });
        return;
    }
    setIsSubmitting(true);
    setUploadStatus('uploading');
    setUploadProgress(10);

    try {
        setUploadProgress(20);
        const idToken = await user.getIdToken();
        const fileContent = await fileToBase64(values.file);
        setUploadProgress(50);
        
        const subjectName = availableSubjects.find(s => s.id === values.subject)?.name || 'Unknown Subject';

        const result = await uploadFileToDrive({
            fileName: values.file.name,
            fileContent,
            mimeType: values.file.type,
            idToken,
            folderPath: `VTU Assistant/${values.scheme}/${values.branch}/${values.semester}/${subjectName}/${values.resourceType}`,
            metadata: {
                module: values.module || '',
                resourceType: values.resourceType,
                subject: subjectName,
                scheme: values.scheme,
                branch: values.branch,
                semester: values.semester,
            }
        });

        if (result.success && result.fileId) {
            setUploadProgress(100);
            setUploadStatus('complete');
            toast({
                title: 'Upload Successful!',
                description: `"${values.file.name}" has been uploaded to your Google Drive.`,
            });
            reset();
            setTimeout(() => {
              setUploadStatus('pending');
            }, 2000);
        } else {
            throw new Error(result.error || "An unknown error occurred during upload.");
        }
    } catch (error: any) {
        setUploadStatus('error');
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message || 'Could not upload the file. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
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
                        </Trigger>
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
                        </Trigger>
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
                        </Trigger>
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
                        </Trigger>
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
                      </Trigger>
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
      
        <FormField
            control={form.control}
            name="file"
            render={({ field: { onChange, ...field } }) => (
                <FormItem>
                    <FormLabel>File</FormLabel>
                    <FormControl>
                        <Input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                onChange(file);
                            }}
                            {...field}
                        />
                    </FormControl>
                    <FormDescription>Upload one PDF file (max 10MB).</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
       
        {isSubmitting && (
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-sm">
                  {uploadStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin"/>}
                  {uploadStatus === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                  {uploadStatus === 'error' && <XCircle className="w-4 h-4 text-destructive"/>}
                  <span className="truncate flex-1">Uploading file...</span>
                  <span className="text-muted-foreground text-xs capitalize">{uploadStatus}</span>
                </div>
                <Progress value={uploadProgress} className="h-2 mt-1" />
            </div>
        )}
       
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload File
            </Button>
        </div>
      </form>
    </Form>
  );
}

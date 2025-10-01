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
import { schemes, branches, years, semesters as allSemesters, cycles } from '@/lib/data';
import { vtuResources } from '@/lib/vtu-data';
import { Loader2, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { uploadResource } from '@/ai/flows/upload-flow';


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
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Max file size is 10MB.`),
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

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


export function UploadForm() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'summarizing' | 'complete' | 'error'>('pending');
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
      resourceType: 'Notes',
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

  async function onSubmit(values: FormValues) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Not Authenticated',
            description: 'You must be logged in to upload a resource.',
        });
        return;
    }
    setIsSubmitting(true);
    setUploadStatus('uploading');
    setUploadProgress(30);

    try {
        const file = values.file[0] as File;
        const fileDataUri = await fileToDataUri(file);
        
        setUploadProgress(60);
        setUploadStatus('summarizing');

        const result = await uploadResource({
            scheme: values.scheme,
            branch: values.branch,
            semester: values.semester,
            subject: values.subject,
            fileName: file.name,
            fileDataUri: fileDataUri,
            resourceType: values.resourceType,
            module: values.resourceType === 'Notes' ? values.module : undefined,
        });


        if (result.fileId) {
            setUploadProgress(100);
            setUploadStatus('complete');
            toast({
                title: 'Upload Successful!',
                description: `"${file.name}" has been uploaded to Google Drive.`,
            });
            reset();
            setTimeout(() => {
              setUploadStatus('pending');
              setUploadProgress(0);
            }, 2000);
        } else {
            throw new Error("An unknown error occurred during upload.");
        }
    } catch (error: any) {
        setUploadStatus('error');
        setUploadProgress(0);
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: error.message || 'Could not upload the file. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  let statusIndicatorContent = null;
  switch (uploadStatus) {
    case 'uploading':
      statusIndicatorContent = <p className="text-sm text-muted-foreground mt-1">Uploading to Drive...</p>;
      break;
    case 'summarizing':
      statusIndicatorContent = <p className="text-sm text-muted-foreground mt-1">Analyzing and summarizing file...</p>;
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
                          {s.name} ({s.id})
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
      
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} />
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
      </form>
    </Form>
  );
}

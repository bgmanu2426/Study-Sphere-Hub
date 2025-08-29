
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
import { Loader2, Upload, File as FileIcon, CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { firebaseApp } from '@/lib/firebase';
import { getStorage, ref, uploadBytesResumable, UploadTaskSnapshot } from 'firebase/storage';

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
  return false;
}, {
  message: 'Please upload at least one file.',
  path: ['questionPaperFile'],
});

type FormValues = z.infer<typeof formSchema>;

type UploadableFile = {
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

export function UploadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const { toast } = useToast();

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

  const uploadFile = (fileToUpload: UploadableFile) => {
    return new Promise((resolve, reject) => {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, fileToUpload.path);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload.file);

      uploadTask.on('state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadableFiles(prevFiles => 
            prevFiles.map(f => f.path === fileToUpload.path ? { ...f, progress, status: 'uploading' } : f)
          );
        },
        (error) => {
          console.error("Upload failed for file:", fileToUpload.file.name, error);
          setUploadableFiles(prevFiles => 
            prevFiles.map(f => f.path === fileToUpload.path ? { ...f, status: 'error' } : f)
          );
          reject(error);
        },
        () => {
          setUploadableFiles(prevFiles => 
            prevFiles.map(f => f.path === fileToUpload.path ? { ...f, progress: 100, status: 'complete' } : f)
          );
          resolve(fileToUpload.file.name);
        }
      );
    });
  };

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

    setUploadableFiles(allFilesToProcess.map(f => ({ ...f, progress: 0, status: 'pending' })));
    setIsSubmitting(true);
    
    let filesUploadedCount = 0;
    for (const fileToUpload of allFilesToProcess) {
      try {
        await uploadFile({ ...fileToUpload, progress: 0, status: 'pending' });
        filesUploadedCount++;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: `Upload Failed for ${fileToUpload.file.name}`,
          description: 'Please try again.',
        });
        // Stop on first error
        break;
      }
    }
    
    setIsSubmitting(false);

    if (filesUploadedCount === allFilesToProcess.length) {
      toast({
        title: 'Upload Successful',
        description: `${filesUploadedCount} file(s) have been uploaded.`,
      });
      form.reset();
      setUploadableFiles([]);
       const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      fileInputs.forEach(input => input.value = '');
    } else {
        toast({
        variant: 'destructive',
        title: 'Upload Incomplete',
        description: `Only ${filesUploadedCount} of ${allFilesToProcess.length} files were uploaded.`,
      });
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
            <h3 className="text-lg font-medium">Module Notes</h3>
            <FormDescription>Upload one or more PDF files for each module.</FormDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((moduleNumber) => (
                 <FormField
                    key={moduleNumber}
                    control={form.control}
                    name={`module${moduleNumber}Files` as keyof FormValues}
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>Module {moduleNumber}</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              ))}
            </div>
          </div>
        )}

        {resourceType === 'questionPaper' && (
           <FormField
            control={form.control}
            name="questionPaperFile"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Question Paper File</FormLabel>
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
        )}
       
        {isSubmitting && uploadableFiles.length > 0 && (
            <div className="space-y-4 rounded-lg border p-4">
               <h3 className="text-lg font-medium">Upload Progress</h3>
               <div className='space-y-2'>
                {uploadableFiles.map(f => (
                  <div key={f.path} className="w-full">
                      <div className="flex items-center gap-2 text-sm">
                        {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin"/>}
                        {f.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-500"/>}
                        {f.status === 'pending' && <FileIcon className="w-4 h-4 text-muted-foreground"/>}
                        <span className="truncate flex-1">{f.file.name}</span>
                        <span className="text-muted-foreground">{Math.round(f.progress)}%</span>
                      </div>
                      <Progress value={f.progress} className="h-2 mt-1" />
                  </div>
                ))}
               </div>
            </div>
        )}
       
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
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

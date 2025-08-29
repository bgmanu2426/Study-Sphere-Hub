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
import { schemes, branches, years, semesters as allSemesters, cycles } from '@/lib/data';
import { Loader2, Upload } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { firebaseApp } from '@/lib/firebase';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please enter a subject name'),
  resourceType: z.enum(['notes', 'questionPaper']),
  file: z.instanceof(File).refine(file => file.size > 0, 'Please select a file'),
});

export function UploadForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheme: '',
      branch: '',
      year: '',
      semester: '',
      subject: '',
      resourceType: 'notes',
      file: undefined,
    },
  });

  const selectedYear = form.watch('year');

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, `resources/${values.scheme}/${values.branch}/${values.semester}/${values.subject}/${values.file.name}`);

      await uploadBytes(storageRef, values.file);

      console.log('Form submitted:', values);
      toast({
        title: 'Upload Successful',
        description: `Your file "${values.file.name}" has been uploaded successfully.`,
      });
      form.reset();
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if(fileInput) fileInput.value = '';

    } catch (error) {
       console.error("Upload error:", error);
       toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'There was an error uploading your file. Please try again.',
       });
    } finally {
      setIsLoading(false);
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        form.resetField('semester');
                    }} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedYear}>
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
                    <FormLabel>Subject Name or Code</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Data Structures or 22CS32" {...field} />
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
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
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
       
        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => onChange(e.target.files?.[0])}
                  {...rest}
                />
              </FormControl>
              <FormDescription>Please upload a PDF file.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
                {isLoading ? (
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

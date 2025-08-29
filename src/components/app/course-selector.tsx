
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { schemes, branches, years, semesters as allSemesters } from '@/lib/data';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const formSchema = z.object({
  scheme: z.string().min(1, 'Please select a scheme'),
  branch: z.string().min(1, 'Please select a branch'),
  year: z.string().min(1, 'Please select a year'),
  semester: z.string().min(1, 'Please select a semester'),
});

type CourseSelectorProps = {
  onSearch: (filters: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
};

export function CourseSelector({ onSearch, isLoading }: CourseSelectorProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheme: '',
      branch: '',
      year: '',
      semester: '',
    },
  });

  const selectedYear = form.watch('year');

  useEffect(() => {
    if (selectedYear === '1') {
      form.setValue('semester', '1');
    }
  }, [selectedYear, form]);

  const availableSemesters = useMemo(() => {
    if (!selectedYear || selectedYear === '1') return [];
    
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSearch(values);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Find Your Resources</CardTitle>
        <CardDescription>Select your course details to find notes and question papers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        if (value !== '1') {
                            form.resetField('semester');
                        }
                    }} defaultValue={field.value}>
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{semesterLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedYear || selectedYear === '1'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedYear === '1' ? 'P & C Cycle' : (selectedYear ? `Select ${semesterLabel}`: "Select Year first")} />
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
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} className="hover:bg-accent/90">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Get Resources
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

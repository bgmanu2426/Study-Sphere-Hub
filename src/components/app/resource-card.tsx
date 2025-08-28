import { Subject } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '../ui/separator';

type ResourceCardProps = {
  subject: Subject;
};

export function ResourceCard({ subject }: ResourceCardProps) {
  return (
    <Card className="flex flex-col transition-all hover:shadow-xl hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{subject.name}</CardTitle>
            <CardDescription className="pt-1">{subject.id}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow" />
      <Separator />
      <CardFooter className="flex flex-col items-stretch gap-2 p-4">
        <Button asChild variant="secondary" className="w-full justify-start">
          <Link href={subject.notesUrl} target="_blank">
            <Download className="mr-2 h-4 w-4" />
            <span>Notes</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href={subject.qpUrl} target="_blank">
            <FileText className="mr-2 h-4 w-4" />
            <span>Question Papers</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

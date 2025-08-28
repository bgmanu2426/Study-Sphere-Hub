import { Subject } from '@/lib/data';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FolderOpen } from 'lucide-react';
import { ResourceDialog } from './resource-dialog';
import { useState } from 'react';

type ResourceCardProps = {
  subject: Subject;
};

export function ResourceCard({ subject }: ResourceCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
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
        <div className="flex-grow" />
        <CardFooter className="p-4">
          <Button onClick={() => setDialogOpen(true)} className="w-full">
            <FolderOpen className="mr-2 h-4 w-4" />
            View Resources
          </Button>
        </CardFooter>
      </Card>
      <ResourceDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        subject={subject}
      />
    </>
  );
}


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Subject, ResourceFile } from '@/lib/data';
import Link from 'next/link';
import { Book, FileText } from 'lucide-react';
import { Separator } from '../ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

type ResourceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject;
};

function ResourceItem({ resource }: { resource: ResourceFile }) {
    if (!resource || !resource.url || resource.url === '#') {
        return <p className="text-sm text-muted-foreground px-2 py-1">No resource available.</p>;
    }
    return (
        <div className="flex flex-col gap-2">
            <Link
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline' }), "justify-start text-left h-auto flex flex-col items-start p-2")}
            >
                <span className='font-semibold'>{resource.name}</span>
                {resource.summary && (
                    <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.summary}</span>
                )}
            </Link>
        </div>
    )
}

export function ResourceDialog({ isOpen, onOpenChange, subject }: ResourceDialogProps) {
  const hasNotes = subject.notes && Object.values(subject.notes).some(r => r && r.url !=='#');
  const hasQuestionPapers = subject.questionPapers && subject.questionPapers.some(r => r && r.url !== '#');
  
  const notesModules = Object.entries(subject.notes || {}).sort(([a], [b]) => a.localeCompare(b));
  const questionPapers = (subject.questionPapers || []).filter(qp => qp && qp.url && qp.url !=='#');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{subject.name}</DialogTitle>
          <DialogDescription>Resources for {subject.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {hasNotes && (
              <div>
                  <h4 className="font-semibold mb-2 flex items-center"><Book className="mr-2 h-4 w-4"/>Notes</h4>
                  <Separator />
                  <Accordion type="single" collapsible className="w-full" defaultValue={notesModules.length > 0 ? notesModules[0][0] : undefined}>
                     {notesModules.map(([module, resourceFile]) => (
                        <AccordionItem value={module} key={module}>
                            <AccordionTrigger>{`Module ${module.replace('module', '')}`}</AccordionTrigger>
                            <AccordionContent>
                               <ResourceItem resource={resourceFile} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                  </Accordion>
              </div>
            )}
            {hasQuestionPapers && (
              <div className="mt-4">
                  <h4 className="font-semibold mb-2 flex items-center"><FileText className="mr-2 h-4 w-4"/>Question Papers</h4>
                  <Separator />
                  <div className="grid grid-cols-1 gap-2 mt-2">
                      {questionPapers.map((qp, index) => (
                        <ResourceItem key={`${qp.url}-${index}`} resource={qp} />
                      ))}
                  </div>
              </div>
            )}
            {!hasNotes && !hasQuestionPapers && (
              <p className="text-center text-muted-foreground">No resources found for this subject yet.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

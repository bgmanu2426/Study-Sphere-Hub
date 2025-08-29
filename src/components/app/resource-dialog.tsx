
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Subject, ResourceFile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Book, FileText } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type ResourceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject;
};

function ResourceItem({ resource }: { resource: ResourceFile }) {
    return (
        <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start text-left h-auto">
                <Link href={resource.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-start">
                    <span className='font-semibold'>{resource.name}</span>
                    {resource.summary && (
                        <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.summary}</span>
                    )}
                </Link>
            </Button>
        </div>
    )
}

export function ResourceDialog({ isOpen, onOpenChange, subject }: ResourceDialogProps) {
  const hasNotes = subject.notes && Object.keys(subject.notes).length > 0;
  const hasQuestionPapers = subject.questionPapers && subject.questionPapers.length > 0;

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
                  <Accordion type="single" collapsible className="w-full">
                     {Object.entries(subject.notes).map(([module, resourceFile]) => (
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
                      {subject.questionPapers.map((qp) => (
                        <ResourceItem key={qp.url} resource={qp} />
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Subject } from '@/lib/data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Book, FileText } from 'lucide-react';
import { Separator } from '../ui/separator';

type ResourceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject;
};

export function ResourceDialog({ isOpen, onOpenChange, subject }: ResourceDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{subject.name}</DialogTitle>
          <DialogDescription>{subject.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div>
                <h4 className="font-semibold mb-2 flex items-center"><Book className="mr-2 h-4 w-4"/>Notes</h4>
                <Separator />
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(subject.notes).map(([key, value], index) => (
                        <Button asChild variant="outline" key={key}>
                            <Link href={value} target="_blank">
                                Module {index + 1}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>
             <div>
                <h4 className="font-semibold mb-2 flex items-center"><FileText className="mr-2 h-4 w-4"/>Question Papers</h4>
                <Separator />
                <div className="grid grid-cols-1 gap-2 mt-2">
                    <Button asChild variant="secondary">
                        <Link href={subject.questionPapers.current} target="_blank">
                           Current Year Model Paper
                        </Link>
                    </Button>
                     <Button asChild variant="secondary">
                        <Link href={subject.questionPapers.previous} target="_blank">
                           Previous Year Model Paper
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

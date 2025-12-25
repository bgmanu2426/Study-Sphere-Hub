
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Subject, ResourceFile } from '@/lib/data';
import Link from 'next/link';
import { Book, FileText, Bot } from 'lucide-react';
import { Separator } from '../ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { useChatbot } from '@/context/chatbot-context';

type ResourceDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject;
};

type ResourceItemProps = {
  resource: ResourceFile;
  module?: string;
  showAskAI?: boolean;
  onCloseDialog?: () => void;
};

function ResourceItem({ resource, module, showAskAI = false, onCloseDialog }: ResourceItemProps) {
  const { openWithPdf } = useChatbot();

  if (!resource || !resource.url) {
      return <p className="text-sm text-muted-foreground px-2 py-1">No resource available.</p>;
  }

  const handleAskWithAI = () => {
    // Close the dialog first
    if (onCloseDialog) {
      onCloseDialog();
    }
    // Then open the chatbot with PDF context
    openWithPdf({
      url: resource.url,
      name: resource.name,
      module: module
    });
  };

  return (
    <div className="flex items-center gap-2 group">
        <Link
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }), "flex-1 justify-start text-left h-auto flex flex-col items-start p-2")}
        >
            <span className='font-semibold'>{resource.name}</span>
            {resource.summary && (
                <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.summary}</span>
            )}
        </Link>
        {showAskAI && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleAskWithAI}
            className="flex items-center gap-1.5 shrink-0"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Ask with AI</span>
          </Button>
        )}
    </div>
  );
}

export function ResourceDialog({ isOpen, onOpenChange, subject }: ResourceDialogProps) {

  const hasNotes = subject.notes && Object.values(subject.notes).some(r => r && r.url);
  const hasQuestionPapers = subject.questionPapers && subject.questionPapers.length > 0;
  
  const notesModules = Object.entries(subject.notes || {}).sort(([a], [b]) => a.localeCompare(b));
  const questionPapers = subject.questionPapers || [];

  const handleCloseDialog = () => {
    onOpenChange(false);
  };

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
                                <ResourceItem 
                                  resource={resourceFile} 
                                  module={`Module ${module.replace('module', '')}`}
                                  showAskAI={true}
                                  onCloseDialog={handleCloseDialog}
                                />
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
                        <ResourceItem key={`${qp.url}-${index}`} resource={qp}/>
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

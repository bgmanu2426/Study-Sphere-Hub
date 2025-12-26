'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, X, Bot, User, Loader2, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getChatbotResponse } from '@/lib/actions';
import toast from 'react-hot-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useChatbot } from '@/context/chatbot-context';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'bot';
  content: string;
};

export function Chatbot() {
  const { isOpen, pdfContext, openChatbot, closeChatbot, clearPdfContext } = useChatbot();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hello! How can I help you with VTU today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Reset messages when PDF context changes
  useEffect(() => {
    if (pdfContext) {
      setMessages([
        { 
          role: 'bot', 
          content: `I'm now ready to answer questions about "${pdfContext.name}"${pdfContext.module ? ` (${pdfContext.module})` : ''}. What would you like to know?` 
        }
      ]);
    }
  }, [pdfContext]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isOpen]);

  const handleClose = () => {
    closeChatbot();
    // Optionally clear PDF context when closing
    // clearPdfContext();
  };

  const handleClearPdfContext = () => {
    clearPdfContext();
    setMessages([
      { role: 'bot', content: "Hello! How can I help you with VTU today?" }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await getChatbotResponse(
        [...messages, userMessage], 
        input,
        pdfContext ? { url: pdfContext.url, name: pdfContext.name } : undefined
      );

      if (result.error) {
        toast.error(result.error);
        setMessages((prev) => [...prev, { role: 'bot', content: "Sorry, I couldn't process that. Please try again." }]);
      } else if (result.answer) {
        setMessages((prev) => [...prev, { role: 'bot', content: result.answer as string }]);
      }
    } catch (error) {
       toast.error('An unexpected error occurred.');
       setMessages((prev) => [...prev, { role: 'bot', content: "Sorry, an error occurred. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={cn("fixed bottom-4 right-4 z-50 transition-transform duration-300 ease-in-out", isOpen ? "translate-x-[500px]" : "translate-x-0")}>
        <Button
          onClick={() => openChatbot()}
          className="rounded-full w-16 h-16 bg-primary shadow-lg hover:bg-primary/90"
          aria-label="Open chat"
          suppressHydrationWarning
        >
          <MessageSquare className="w-8 h-8 text-primary-foreground" />
        </Button>
      </div>

      <div className={cn("fixed bottom-4 right-4 z-50 w-full max-w-sm transition-transform duration-300 ease-in-out", isOpen ? "translate-x-0" : "translate-x-[500px]")}>
          <Card className="flex flex-col h-[60vh] shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6 text-primary" />
                <CardTitle>Study Sphere Assistant</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            {pdfContext && (
              <div className="px-6 pb-2">
                <Badge variant="secondary" className="flex items-center gap-2 w-full justify-between py-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate text-xs">{pdfContext.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={handleClearPdfContext}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
            )}
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                    <div className="space-y-4 overflow-hidden">
                    {messages.map((message, index) => (
                        <div
                        key={index}
                        className={cn(
                            'flex items-end gap-2 w-full',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                        >
                        {message.role === 'bot' && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="w-5 h-5"/></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn(
                            'max-w-[75%] rounded-lg px-3 py-2 text-sm overflow-hidden',
                            message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                            {message.role === 'bot' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:break-all [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_*]:max-w-full">
                                <ReactMarkdown>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              message.content
                            )}
                        </div>
                        {message.role === 'user' && (
                             <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                            </Avatar>
                        )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback className='bg-primary text-primary-foreground'><Bot className="w-5 h-5"/></AvatarFallback>
                            </Avatar>
                            <p className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </p>
                        </div>
                    )}
                    </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about VTU..."
                  autoComplete="off"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
      </div>
    </>
  );
}

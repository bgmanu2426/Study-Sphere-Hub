'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type PdfContext = {
  url: string;
  name: string;
  module?: string;
} | null;

type ChatbotContextType = {
  isOpen: boolean;
  pdfContext: PdfContext;
  openChatbot: () => void;
  closeChatbot: () => void;
  openWithPdf: (pdf: NonNullable<PdfContext>) => void;
  clearPdfContext: () => void;
};

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfContext, setPdfContext] = useState<PdfContext>(null);

  const openChatbot = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChatbot = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openWithPdf = useCallback((pdf: NonNullable<PdfContext>) => {
    setPdfContext(pdf);
    setIsOpen(true);
  }, []);

  const clearPdfContext = useCallback(() => {
    setPdfContext(null);
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        pdfContext,
        openChatbot,
        closeChatbot,
        openWithPdf,
        clearPdfContext,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}

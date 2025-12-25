import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/app/header';
import { Toaster } from 'react-hot-toast';
import { Chatbot } from '@/components/app/chatbot';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/auth-context';
import { ChatbotProvider } from '@/context/chatbot-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Study Sphere Hub',
  description: 'Your one-stop solution for VTU resources and an AI-powered chatbot.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased', inter.variable)}>
        <AuthProvider>
          <ChatbotProvider>
            <div className="relative flex min-h-screen w-full flex-col">
              <AppHeader />
              <main className="flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
              <Chatbot />
            </div>
            <Toaster position="top-center" />
          </ChatbotProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

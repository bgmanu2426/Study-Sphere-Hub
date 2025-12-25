'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UploadForm } from '@/components/app/upload-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function UploadPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until loading is false

    if (!user) {
      // If not logged in at all, redirect to login
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      // If logged in but not admin, redirect to home
      router.push('/');
    }
  }, [user, loading, isAdmin, router]);

  // Show a loading state while we verify the user
  if (loading || !user || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Only render the form if the user is the admin
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Admin Upload</CardTitle>
          <CardDescription>Add or manage notes and question papers.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>
    </div>
  );
}

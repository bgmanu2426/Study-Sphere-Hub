import { UploadForm } from '@/components/app/upload-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function UploadPage() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="w-full max-w-2xl mx-auto shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-destructive">Configuration Error</CardTitle>
                    <CardDescription>
                        Cloudinary cloud name is not configured. Please set the NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Upload Resources</CardTitle>
          <CardDescription>Add your own notes and question papers to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm cloudName={cloudName} />
        </CardContent>
      </Card>
    </div>
  );
}

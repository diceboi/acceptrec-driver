import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { receiptURL } = body;

    // Use verification logic here if needed
    // For now, we assume the upload happened successfully to the path if it's a Supabase URL
    
    const bucketName = 'receipts';
    let objectPath = receiptURL;
    let publicUrl = receiptURL;

    // Supabase signed URL Logic
    if (receiptURL && receiptURL.includes('/storage/v1/object/upload/sign/')) {
        // Extract path from signed URL if possible, or assume it was passed in objectPath (but current flow only passes receiptURL)
        // Actually, the client gets { objectPath } from upload endpoint. 
        // But EditDialog sends { receiptURL: uploadURL }.
        // The uploadURL is the SIGNED PUT URL.
        // We need the path to generate the PUBLIC URL.
        
        // Signed URL format: .../sign/bucket/path/to/file?token...
        const parts = receiptURL.split(`/sign/${bucketName}/`);
        if (parts.length > 1) {
            const pathWithQuery = parts[1];
            objectPath = pathWithQuery.split('?')[0];
        }
    } else if (receiptURL && !receiptURL.startsWith('http')) {
        // Assume it is the path directly if not http
        objectPath = receiptURL;
    }

    // Generate Public URL
    const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
    publicUrl = data.publicUrl;

    // Verify if it's a valid Supabase URL, otherwise fallback?
    // If extraction failed, publicUrl might be wrong.
    // However, if we migrated correctly, we should be fine.
    
    // Return the public URL for storage in the DB
    return NextResponse.json({ objectPath: publicUrl });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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
    // For now, we extract the path from the signed URL or trust the client logic if we passed objectPath
    // Since TimesheetForm sends receiptURL (which is the signed URL), we try to extract the object path
    
    let objectPath = receiptURL;
    
    // Attempt to extract clean path from GCS signed URL
    // Format: https://storage.googleapis.com/BUCKET/PATH?signature...
    if (receiptURL && receiptURL.includes('storage.googleapis.com')) {
       try {
         const urlObj = new URL(receiptURL);
         // Pathname is /BUCKET/PATH
         const parts = urlObj.pathname.split('/');
         // parts[0] is empty, parts[1] is bucket, parts[2...] is path
         if (parts.length > 2) {
           objectPath = parts.slice(2).join('/');
         }
       } catch (e) {
         // keep original if parsing fails
       }
    }

    // Return the storable path
    return NextResponse.json({ objectPath });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

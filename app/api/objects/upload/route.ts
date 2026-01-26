import { NextResponse } from 'next/server';
import { getBucket } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const bucket = getBucket();
    const filename = `uploads/${uuidv4()}`;
    const file = bucket.file(filename);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream',
    });

    return NextResponse.json({
      method: "PUT",
      url,
      // We pass the filename/path back so the client can send it to /api/receipts or use it directly
      objectPath: filename
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Return a mock URL for development if GCS is not configured
    if (process.env.NODE_ENV === 'development') {
       console.warn('Returning MOCK upload URL because GCS failed');
       return NextResponse.json({
         method: "PUT",
         url: "https://example.com/mock-upload",
         objectPath: "mock/path"
       });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Create a service role client to bypass RLS for storage operations
  const serviceRoleClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const filename = `uploads/${user.id}/${randomUUID()}`;
    const bucketName = 'receipts';

    // Generate a signed URL for uploading to Supabase Storage using service role
    const { data, error } = await serviceRoleClient
      .storage
      .from(bucketName)
      .createSignedUploadUrl(filename);

    if (error) {
      console.error('Error creating signed upload URL:', error);
      throw error;
    }

    return NextResponse.json({
      method: "PUT",
      url: data.signedUrl, 
      objectPath: filename
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

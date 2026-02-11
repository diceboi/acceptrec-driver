
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('Checking storage buckets...');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
    process.exit(1);
  }

  const bucketName = 'receipts';
  const existingBucket = buckets.find(b => b.name === bucketName);

  if (!existingBucket) {
    console.log(`Creating bucket: ${bucketName}`);
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/*', 'application/pdf']
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      process.exit(1);
    }
    console.log('Bucket created successfully.');
  } else {
    console.log(`Bucket '${bucketName}' already exists.`);
  }
  
  // Update public to true just in case
  await supabase.storage.updateBucket(bucketName, { public: true });
  
  console.log('Setup complete.');
}

setupStorage();

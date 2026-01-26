import { Storage } from '@google-cloud/storage';

// Initialize storage with credentials from env
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : process.env.GOOGLE_APPLICATION_CREDENTIALS;

// If explicitly provided via individual env vars (fallback)
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

export const storage = new Storage({
  projectId,
  credentials: typeof credentials === 'string' ? undefined : credentials,
  keyFilename: typeof credentials === 'string' ? credentials : undefined,
});

export const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'your-bucket-name';

export const getBucket = () => storage.bucket(bucketName);

-- Migration to make contact fields optional in clients table
-- Run this script to apply the schema changes

ALTER TABLE "clients" ALTER COLUMN "contact_name" DROP NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL;

-- Verify the changes
-- SELECT column_name, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'clients' AND column_name IN ('contact_name', 'email');

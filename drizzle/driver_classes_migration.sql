-- Driver Classes Management - Migration
-- Creates tables for driver job roles and per-client hourly rates

-- Driver classes table
CREATE TABLE IF NOT EXISTS driver_classes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR
);

-- Driver class rates table (per-client hourly rate for each class)
CREATE TABLE IF NOT EXISTS driver_class_rates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_class_id VARCHAR NOT NULL REFERENCES driver_classes(id) ON DELETE CASCADE,
  client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  hourly_rate REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Unique constraint: one rate per class per client
CREATE UNIQUE INDEX IF NOT EXISTS unique_class_client ON driver_class_rates(driver_class_id, client_id);

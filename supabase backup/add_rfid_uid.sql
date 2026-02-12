-- Add UID column to students table for RFID cards
-- Run this in Supabase SQL Editor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS rfid_uid VARCHAR(50) UNIQUE;

-- Add index for faster RFID lookups
CREATE INDEX IF NOT EXISTS idx_students_rfid_uid ON students(rfid_uid);

-- Add comment
COMMENT ON COLUMN students.rfid_uid IS 'RFID card UID for automatic student identification';

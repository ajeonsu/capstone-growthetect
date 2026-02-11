-- Migration: Add RFID Tag column to students table
-- Date: 2026-02-10
-- Description: Adds rfid_tag column to store unique RFID identifiers for each student

-- Add rfid_tag column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS rfid_tag VARCHAR(255) UNIQUE;

-- Add index for faster RFID lookups
CREATE INDEX IF NOT EXISTS idx_students_rfid_tag ON students(rfid_tag);

-- Add comment to column
COMMENT ON COLUMN students.rfid_tag IS 'Unique RFID tag identifier for student attendance tracking';

-- Make the lrn column nullable so students without an LRN can be registered.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE students ALTER COLUMN lrn DROP NOT NULL;

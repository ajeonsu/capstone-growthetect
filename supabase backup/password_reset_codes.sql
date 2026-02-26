-- Create password_reset_codes table for forgot password functionality
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (PostgreSQL syntax — must be separate from CREATE TABLE)
CREATE INDEX IF NOT EXISTS idx_password_reset_email_code ON password_reset_codes (email, code);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_codes (expires_at);

-- Add comment to table
COMMENT ON TABLE password_reset_codes IS 'Stores password reset verification codes with expiration';

-- Optional: Function to automatically clean up expired/used codes
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_codes
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

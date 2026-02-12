import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerClient();

    console.log('Starting migration...');

    // Since we can't execute raw SQL via Supabase client directly,
    // we'll try to check if the table exists by querying it
    const { data: existingData, error: checkError } = await supabase
      .from('password_reset_codes')
      .select('count')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Table already exists! Migration not needed.',
        alreadyExists: true,
      });
    }

    // If we get here, the table doesn't exist
    // We need to provide instructions
    const sql = `
-- Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/sql/new

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_code ON password_reset_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_expires_at ON password_reset_codes(expires_at);

COMMENT ON TABLE password_reset_codes IS 'Stores password reset verification codes with expiration';

-- Grant permissions
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for API routes)
CREATE POLICY "Allow service role all access" ON password_reset_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
`;

    return NextResponse.json({
      success: false,
      message: 'Table does not exist. Please run the SQL manually.',
      sql: sql,
      instructions: [
        '1. Go to: https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/sql/new',
        '2. Copy the SQL from the "sql" field in this response',
        '3. Paste it into the SQL Editor',
        '4. Click "Run" to execute',
        '5. Refresh this page to verify',
      ],
      supabaseUrl: 'https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/sql/new',
    });

  } catch (error: any) {
    console.error('Migration check error:', error);
    return NextResponse.json({
      success: false,
      message: error.message,
      error: error.toString(),
    }, { status: 500 });
  }
}

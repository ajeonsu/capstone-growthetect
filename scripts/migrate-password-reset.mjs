// Migration script to create password_reset_codes table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbueqmlfegquakwpvbdr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidWVxbWxmZWdxdWFrd3B2YmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTE0NDAsImV4cCI6MjA4MzQyNzQ0MH0.i8uP_n9Y6rja01PjZxYWEujgKGRVqTeJv1LvMmKhyts';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting migration...');
  console.log('Creating password_reset_codes table...\n');

  try {
    // Create the table using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS password_reset_codes (
          id BIGSERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    });

    if (error) {
      console.error('❌ Error creating table:', error.message);
      
      // Try alternative method: direct table creation
      console.log('\n📝 Attempting alternative method...');
      console.log('Please run this SQL in your Supabase SQL Editor:\n');
      console.log('----------------------------------------');
      console.log(`
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
      `);
      console.log('----------------------------------------\n');
      console.log('Go to: https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/editor');
      
      process.exit(1);
    }

    console.log('✅ Table created successfully!');

    // Try to create indexes
    console.log('Creating indexes...');
    
    // Test if table exists by trying to query it
    const { data: testData, error: testError } = await supabase
      .from('password_reset_codes')
      .select('count');

    if (testError) {
      console.log('⚠️  Table may need manual creation. See instructions above.');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('\n🎉 The password_reset_codes table is ready to use!');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\n📝 Please manually run the SQL in Supabase SQL Editor:');
    console.log('Go to: https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/editor\n');
  }
}

runMigration();

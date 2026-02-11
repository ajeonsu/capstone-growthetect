'use client';

import { useState } from 'react';

export default function MigrationPage() {
  const [status, setStatus] = useState<'checking' | 'exists' | 'needed' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const sql = `-- Run this SQL in your Supabase SQL Editor
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

-- Grant permissions (important for API routes to work)
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role all access (for API routes)
CREATE POLICY "Allow service role all access" ON password_reset_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);`;

  const checkMigration = async () => {
    setStatus('checking');
    setMessage('Checking if table exists...');

    try {
      const response = await fetch('/api/migrate/password-reset');
      const data = await response.json();

      if (data.alreadyExists) {
        setStatus('exists');
        setMessage('✅ Table already exists! No migration needed.');
      } else {
        setStatus('needed');
        setMessage('⚠️ Table needs to be created. Copy and run the SQL below.');
      }
    } catch (error: any) {
      setStatus('needed');
      setMessage('Unable to verify. Please run the SQL to ensure table exists.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/sql/new', '_blank');
  };

  useState(() => {
    checkMigration();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-4">
            Database Migration: Password Reset
          </h1>
          
          <div className="mb-6">
            <button
              onClick={checkMigration}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Check Migration Status
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-lg text-white">{message}</p>
          </div>

          {(status === 'needed' || status === 'error') && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-3">
                  Steps to Run Migration:
                </h2>
                <ol className="list-decimal list-inside text-gray-300 space-y-2">
                  <li>Click the "Copy SQL" button below</li>
                  <li>Click "Open Supabase SQL Editor"</li>
                  <li>Paste the SQL into the editor</li>
                  <li>Click "Run" to execute</li>
                  <li>Come back here and click "Check Migration Status"</li>
                </ol>
              </div>

              <div className="mb-4 flex gap-4">
                <button
                  onClick={copyToClipboard}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy SQL'}
                </button>
                <button
                  onClick={openSupabase}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Open Supabase SQL Editor →
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                <pre className="text-sm text-green-400 overflow-x-auto">
                  <code>{sql}</code>
                </pre>
              </div>
            </>
          )}

          {status === 'exists' && (
            <div className="p-6 bg-green-900 bg-opacity-30 border border-green-600 rounded-lg">
              <p className="text-green-400 text-lg">
                🎉 Great! The password_reset_codes table exists and is ready to use.
              </p>
              <p className="text-gray-300 mt-2">
                Your forgot password functionality should work properly now.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

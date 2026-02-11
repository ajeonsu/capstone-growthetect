$sql = @"
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

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all access" ON password_reset_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
"@

Write-Host "========================================" -ForegroundColor Green
Write-Host "CREATING PASSWORD RESET TABLE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Clipboard -Value $sql
Write-Host "SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

Write-Host "Opening Supabase SQL Editor..." -ForegroundColor Yellow
Start-Process "https://supabase.com/dashboard/project/fbueqmlfegquakwpvbdr/sql/new"

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Wait for browser to open" -ForegroundColor White
Write-Host "2. Press Ctrl+V to paste the SQL" -ForegroundColor White
Write-Host "3. Click the green RUN button" -ForegroundColor White
Write-Host "4. Done! Table created." -ForegroundColor White
Write-Host ""

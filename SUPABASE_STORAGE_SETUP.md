# Supabase Storage Setup for PDF Reports

## Create Storage Bucket

You need to create a storage bucket in Supabase to store PDF report files.

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Fill in the details:
   - **Name**: `reports`
   - **Public bucket**: ✅ **YES** (Check this box)
   - Click **Create bucket**

### Why Public?
- The bucket needs to be public so that nutritionists and admins can view/download PDF reports without authentication issues
- The reports themselves are protected by the application's authentication system

### Storage Policies (Optional - for extra security)

If you want to add RLS policies to the storage bucket:

```sql
-- Allow authenticated users to read reports
CREATE POLICY "Allow authenticated users to read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Allow authenticated users to upload reports
CREATE POLICY "Allow authenticated users to upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');
```

### File Structure

PDFs will be stored with the following structure:
```
reports/
  └── report-{report_id}-{timestamp}.pdf
```

Example: `reports/report-123-1706284800000.pdf`

## Verification

After creating the bucket, test the upload by:
1. Go to Reports page
2. Generate a new monthly BMI report
3. Click "View" - the PDF should be generated and automatically uploaded to Supabase Storage
4. The second time you view the same report, it should load instantly from storage!

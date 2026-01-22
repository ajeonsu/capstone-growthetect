import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - View CSV file content
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { success: false, message: 'File path is required' },
        { status: 400 }
      );
    }

    // Check if CSV is stored in database (format: db:csv:timestamp:id)
    if (filePath.startsWith('db:csv:')) {
      // Get report to retrieve CSV content from data field
      const reportId = searchParams.get('report_id');
      if (reportId) {
        const { data: report, error: reportError } = await supabase
          .from('reports')
          .select('data')
          .eq('id', reportId)
          .single();

        if (!reportError && report?.data) {
          let reportData: any = {};
          try {
            reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
          } catch (e) {
            // Ignore parse errors
          }

          if (reportData.csv_content) {
            const filename = `report_${reportId}.csv`;
            return new NextResponse(reportData.csv_content, {
              headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `inline; filename="${filename}"`,
              },
            });
          }
        }
      }
      
      return NextResponse.json(
        { success: false, message: 'CSV content not found in database' },
        { status: 404 }
      );
    }

    // Normalize the path for storage
    let storagePath = filePath.replace(/^\/+/, '');
    if (storagePath.startsWith('1/capstone/')) {
      storagePath = storagePath.replace('1/capstone/', '');
    } else if (storagePath.startsWith('capstone/')) {
      storagePath = storagePath.replace('capstone/', '');
    }

    // Try to download the file from Supabase Storage
    const possibleBuckets = ['capstone', 'uploads', 'reports', 'files'];
    
    for (const bucketName of possibleBuckets) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(storagePath);

        if (!downloadError && fileData) {
          const csvContent = await fileData.text();
          
          // Return CSV content with proper headers
          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
            },
          });
        }
      } catch (err) {
        // Try next bucket
        continue;
      }
    }

    return NextResponse.json(
      { success: false, message: 'CSV file not found in storage' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[VIEW CSV] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error viewing CSV file', error: error?.message },
      { status: 500 }
    );
  }
}

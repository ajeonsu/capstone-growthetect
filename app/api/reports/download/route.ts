import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Download report file (CSV, PDF, HTML)
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');
    const reportId = searchParams.get('report_id');

    if (!fileName && !reportId) {
      return NextResponse.json(
        { success: false, message: 'File name or report ID is required' },
        { status: 400 }
      );
    }

    // If report_id is provided, get the report first
    let filePath = fileName || '';
    let csvContent = '';
    
    if (reportId) {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('pdf_file, data')
        .eq('id', reportId)
        .single();

      if (reportError || !report) {
        return NextResponse.json(
          { success: false, message: 'Report not found' },
          { status: 404 }
        );
      }

      filePath = report.pdf_file || '';
      
      // Check if CSV is stored in database
      if (filePath.startsWith('db:csv:') && report.data) {
        let reportData: any = {};
        try {
          reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
        } catch (e) {
          // Ignore parse errors
        }
        
        if (reportData.csv_content) {
          csvContent = reportData.csv_content;
        }
      }
    }

    // If CSV content is available from database, serve it directly
    if (csvContent) {
      const filename = fileName || `report_${reportId || 'download'}.csv`;
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Try to download from storage
    if (!filePath) {
      return NextResponse.json(
        { success: false, message: 'File path not found' },
        { status: 404 }
      );
    }

    // Normalize path for storage
    let storagePath = filePath.replace(/^\/+/, '');
    if (storagePath.startsWith('1/capstone/')) {
      storagePath = storagePath.replace('1/capstone/', '');
    } else if (storagePath.startsWith('capstone/')) {
      storagePath = storagePath.replace('capstone/', '');
    }

    // Determine content type based on file extension
    const isCsv = filePath.endsWith('.csv') || filePath.startsWith('db:csv:');
    const contentType = isCsv 
      ? 'text/csv;charset=utf-8' 
      : filePath.endsWith('.pdf') 
        ? 'application/pdf' 
        : 'text/html';

    // Try to download from Supabase Storage
    const possibleBuckets = ['capstone', 'uploads', 'reports', 'files'];
    
    for (const bucketName of possibleBuckets) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(storagePath);

        if (!downloadError && fileData) {
          const content = await fileData.text();
          
          return new NextResponse(content, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${fileName || filePath.split('/').pop() || 'download'}"`,
            },
          });
        }
      } catch (err) {
        // Try next bucket
        continue;
      }
    }

    return NextResponse.json(
      { success: false, message: 'File not found in storage' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[DOWNLOAD] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error downloading file', error: error?.message },
      { status: 500 }
    );
  }
}

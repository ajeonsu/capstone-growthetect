import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// POST - Upload PDF blob to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File;
    const reportId = formData.get('report_id') as string;

    if (!pdfFile || !reportId) {
      return NextResponse.json(
        { success: false, message: 'Missing PDF file or report ID' },
        { status: 400 }
      );
    }

    console.log('[UPLOAD PDF] Uploading PDF for report:', reportId);

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `report-${reportId}-${timestamp}.pdf`;
    const filePath = `reports/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports') // Make sure this bucket exists in Supabase
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[UPLOAD PDF] Upload error:', uploadError);
      return NextResponse.json(
        { success: false, message: 'Error uploading PDF', error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update report with PDF file path
    const { error: updateError } = await supabase
      .from('reports')
      .update({ pdf_file: publicUrl })
      .eq('id', reportId);

    if (updateError) {
      console.error('[UPLOAD PDF] Error updating report:', updateError);
      return NextResponse.json(
        { success: false, message: 'Error updating report with PDF URL' },
        { status: 500 }
      );
    }

    console.log('[UPLOAD PDF] PDF uploaded successfully:', publicUrl);

    return NextResponse.json({
      success: true,
      pdf_url: publicUrl,
      message: 'PDF uploaded successfully',
    });
  } catch (error: any) {
    console.error('[UPLOAD PDF] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Error uploading PDF', error: error?.message },
      { status: 500 }
    );
  }
}

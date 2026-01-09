import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser, requireRole } from '@/lib/auth';

// GET - Fetch reports
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Get single report by ID
    if (reportId) {
      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        console.error('[REPORTS] Error fetching report:', error);
        return NextResponse.json(
          { success: false, message: 'Report not found', error: error?.message },
          { status: 404 }
        );
      }

      // Get user names if needed (optional - don't fail if this fails)
      if (report.generated_by) {
        const { data: generator } = await supabase
          .from('users')
          .select('name')
          .eq('id', report.generated_by)
          .single();
        if (generator) {
          (report as any).generator_name = generator.name;
        }
      }

      if (report.reviewed_by) {
        const { data: reviewer } = await supabase
          .from('users')
          .select('name')
          .eq('id', report.reviewed_by)
          .single();
        if (reviewer) {
          (report as any).reviewer_name = reviewer.name;
        }
      }

      // Parse data JSON
      if (report.data && typeof report.data === 'string') {
        try {
          report.data = JSON.parse(report.data);
        } catch (e) {
          report.data = {};
        }
      }

      return NextResponse.json({ success: true, report });
    }

    console.log('[REPORTS] Fetching reports for user:', {
      userId: user.id,
      role: user.role,
      status,
      type,
    });

    // Get reports list
    let query = supabase
      .from('reports')
      .select('*');

    // Filter by user role - nutritionists can only see their own reports
    if (user.role === 'nutritionist') {
      console.log('[REPORTS] Filtering by generated_by:', user.id);
      query = query.eq('generated_by', user.id);
    } else {
      console.log('[REPORTS] Admin user - showing all reports');
    }

    // Filter by status
    if (status && status !== '') {
      console.log('[REPORTS] Filtering by status:', status);
      query = query.eq('status', status);
    }

    // Filter by type
    if (type && type !== '') {
      console.log('[REPORTS] Filtering by type:', type);
      query = query.eq('report_type', type);
    }

    // Order by generated_at
    query = query.order('generated_at', { ascending: false });

    console.log('[REPORTS] Executing query...');
    const { data: reports, error } = await query;
    
    console.log('[REPORTS] Query result:', {
      reportsCount: reports?.length || 0,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
    });
    
    // If no reports found for nutritionist, check if there are any reports at all
    if (user.role === 'nutritionist' && (!reports || reports.length === 0)) {
      const { data: allReports } = await supabase
        .from('reports')
        .select('id, generated_by, title')
        .limit(5);
      console.log('[REPORTS] Sample of all reports in DB:', allReports);
      console.log('[REPORTS] Current user ID:', user.id);
      console.log('[REPORTS] Reports in DB have generated_by values:', allReports?.map(r => r.generated_by));
    }

    if (error) {
      console.error('[REPORTS] Supabase query error:', error);
      console.error('[REPORTS] Error code:', error.code);
      console.error('[REPORTS] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          message: `Error fetching reports: ${error.message || 'Database error'}`,
          error: error.message,
          errorCode: error.code,
        },
        { status: 500 }
      );
    }

    // Get user names for all reports (batch fetch)
    const userIds = new Set<number>();
    (reports || []).forEach((report: any) => {
      if (report.generated_by) userIds.add(report.generated_by);
      if (report.reviewed_by) userIds.add(report.reviewed_by);
    });

    const userNamesMap = new Map<number, string>();
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(userIds));
      
      if (users) {
        users.forEach((user: any) => {
          userNamesMap.set(user.id, user.name);
        });
      }
    }

    // Parse data JSON for each report and add user names
    const parsedReports = (reports || []).map((report: any) => {
      if (report.data && typeof report.data === 'string') {
        try {
          report.data = JSON.parse(report.data);
        } catch (e) {
          report.data = {};
        }
      }
      
      // Add user names
      if (report.generated_by && userNamesMap.has(report.generated_by)) {
        report.generator_name = userNamesMap.get(report.generated_by);
      }
      if (report.reviewed_by && userNamesMap.has(report.reviewed_by)) {
        report.reviewer_name = userNamesMap.get(report.reviewed_by);
      }
      
      return report;
    });

    return NextResponse.json({ success: true, reports: parsedReports });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Generate, approve, or reject report
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const body = await request.formData();
    const action = body.get('action') as string;

    const supabase = getSupabaseClient();

    if (action === 'generate') {
      const title = (body.get('title') as string)?.trim() || '';
      const reportType = (body.get('report_type') as string)?.trim() || '';
      const description = (body.get('description') as string)?.trim() || '';
      const reportMonth = body.get('report_month') as string | null;
      const pdfFile = body.get('pdf_file') as string | null;
      let data = body.get('data') as string | null;

      if (!title || !reportType) {
        return NextResponse.json(
          { success: false, message: 'Title and report type are required' },
          { status: 400 }
        );
      }

      // Parse and update data JSON
      let dataObj: any = {};
      if (data) {
        try {
          dataObj = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          dataObj = {};
        }
      }

      if (reportMonth) {
        dataObj.report_month = reportMonth;
      }

      const status = user.role === 'nutritionist' ? 'pending' : 'draft';

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([
          {
            title,
            report_type: reportType,
            description,
            data: JSON.stringify(dataObj),
            pdf_file: pdfFile,
            status,
            generated_by: user.id,
          },
        ])
        .select('id')
        .single();

      if (error || !newReport) {
        console.error('Supabase insert error:', error);
        return NextResponse.json(
          { success: false, message: 'Error generating report' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Report generated successfully',
        report_id: newReport.id,
      });
    } else if (action === 'approve' || action === 'reject') {
      // Only administrators can approve/reject
      await requireRole('administrator', request);

      const reportId = parseInt(body.get('report_id') as string);
      const notes = (body.get('notes') as string)?.trim() || '';
      const status = action === 'approve' ? 'approved' : 'rejected';

      if (!reportId) {
        return NextResponse.json(
          { success: false, message: 'Report ID is required' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', reportId);

      if (error) {
        console.error('Supabase update error:', error);
        return NextResponse.json(
          { success: false, message: 'Error updating report' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Report ${status} successfully`,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    console.error('Error in reports POST:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PUT - Update report
export async function PUT(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const body = await request.json();
    const reportId = parseInt(body.id);
    const title = (body.title as string)?.trim() || '';
    const reportType = (body.report_type as string)?.trim() || '';
    const description = (body.description as string)?.trim() || '';
    const reportMonth = body.report_month || null;

    if (!reportId) {
      return NextResponse.json(
        { success: false, message: 'Report ID is required' },
        { status: 400 }
      );
    }

    if (!title || !reportType) {
      return NextResponse.json(
        { success: false, message: 'Title and report type are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Get current report
    const { data: currentReport, error: fetchError } = await supabase
      .from('reports')
      .select('data, generated_by, status')
      .eq('id', reportId)
      .single();

    if (fetchError || !currentReport) {
      return NextResponse.json(
        { success: false, message: 'Report not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === 'nutritionist') {
      if (currentReport.generated_by !== user.id) {
        return NextResponse.json(
          { success: false, message: 'You do not have permission to edit this report' },
          { status: 403 }
        );
      }

      if (currentReport.status === 'approved') {
        return NextResponse.json(
          { success: false, message: 'Cannot edit an approved report' },
          { status: 400 }
        );
      }
    }

    // Update data JSON
    let dataObj: any = {};
    if (currentReport.data) {
      try {
        dataObj =
          typeof currentReport.data === 'string'
            ? JSON.parse(currentReport.data)
            : currentReport.data;
      } catch (e) {
        dataObj = {};
      }
    }

    if (reportMonth) {
      dataObj.report_month = reportMonth;
    } else {
      delete dataObj.report_month;
    }

    // Update report
    const { error } = await supabase
      .from('reports')
      .update({
        title,
        report_type: reportType,
        description,
        data: JSON.stringify(dataObj),
      })
      .eq('id', reportId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { success: false, message: 'Error updating report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete report
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getCurrentUser(request);
    if (!user) throw new Error('Unauthorized');

    const { searchParams } = new URL(request.url);
    const reportId = parseInt(searchParams.get('id') || '0');

    if (!reportId) {
      return NextResponse.json(
        { success: false, message: 'Report ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if report exists and permissions
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('generated_by')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { success: false, message: 'Report not found' },
        { status: 404 }
      );
    }

    // Check permissions - nutritionists can only delete their own reports
    if (user.role === 'nutritionist' && report.generated_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete this report' },
        { status: 403 }
      );
    }

    // Delete report
    const { error, count } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .select('id');

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { success: false, message: 'Error deleting report' },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { success: false, message: 'Report not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}

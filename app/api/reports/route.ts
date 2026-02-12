import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import { requireAuth, getCurrentUser, requireRole } from '@/lib/auth';
import { calculateBMI, getBMIStatus, calculateAge } from '@/lib/helpers';

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
      const gradeLevel = body.get('grade_level') as string | null;
      let pdfFile = body.get('pdf_file') as string | null;
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

      if (gradeLevel) {
        dataObj.grade_level = gradeLevel;
      }

      const status = user.role === 'nutritionist' ? 'pending' : 'draft';

      // Store PDF generation info - will be generated on-demand
      let pdfPath = `pdf:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
      
      // Generate and save snapshot data for both report types
      if (reportType === 'monthly_bmi' && gradeLevel && reportMonth) {
        try {
          // Call the generate-pdf API to get snapshot data
          const monthlyReportResponse = await fetch(`${request.nextUrl.origin}/api/reports/generate-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              report_id: null,
              grade_level: gradeLevel,
              report_month: reportMonth,
              school_name: dataObj.school_name || 'SCIENCE CITY OF MUNOZ',
              school_year: dataObj.school_year || '2025-2026',
            }),
          });
          
          const monthlyReportData = await monthlyReportResponse.json();
          
          if (monthlyReportData.success && monthlyReportData.pdf_data) {
            // Save the snapshot data
            dataObj = {
              ...dataObj,
              ...monthlyReportData.pdf_data,
              pdf_ready: true,
              snapshot_date: new Date().toISOString(),
            };
          }
        } catch (error) {
          console.error('[REPORTS] Error generating monthly report snapshot:', error);
        }
      } else if (reportType === 'pre_post') {
        // List for Feeding report - generate and save snapshot data
        try {
          const feedingListResponse = await fetch(`${request.nextUrl.origin}/api/reports/generate-feeding-list`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              report_id: null,
              school_name: dataObj.school_name || 'SCIENCE CITY OF MUNOZ',
              school_year: dataObj.school_year || '2025-2026',
              title: title,
            }),
          });
          
          const feedingListData = await feedingListResponse.json();
          
          if (feedingListData.success && feedingListData.pdf_data) {
            // Save the snapshot data
            dataObj = {
              ...dataObj,
              ...feedingListData.pdf_data,
              pdf_ready: true,
              snapshot_date: new Date().toISOString(),
            };
          }
        } catch (error) {
          console.error('[REPORTS] Error generating feeding list snapshot:', error);
        }
      } else if (reportType === 'overview') {
        // BMI and HFA Report - generate and save snapshot data
        try {
          console.log('[REPORTS] Generating overview report data...');
          
          // Get all students
          const studentsResponse = await fetch(`${request.nextUrl.origin}/api/students`, {
            headers: {
              'Cookie': request.headers.get('cookie') || '',
            },
          });
          const studentsData = await studentsResponse.json();
          const allStudents = studentsData.success ? studentsData.students : [];

          // Get all BMI records
          const bmiResponse = await fetch(`${request.nextUrl.origin}/api/bmi-records`, {
            headers: {
              'Cookie': request.headers.get('cookie') || '',
            },
          });
          const bmiData = await bmiResponse.json();
          const allRecords = bmiData.success ? bmiData.records : [];

          // Get latest BMI record for each student
          const latestRecords: Record<number, any> = {};
          allRecords.forEach((record: any) => {
            if (!latestRecords[record.student_id] ||
              new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
              latestRecords[record.student_id] = record;
            }
          });

          // Group students by grade level
          const gradeMapping: Record<number, string> = {
            0: 'Kinder',
            1: 'Grade 1',
            2: 'Grade 2',
            3: 'Grade 3',
            4: 'Grade 4',
            5: 'Grade 5',
            6: 'Grade 6',
            7: 'SPED'
          };

          const gradeOrder = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'SPED'];
          const gradeMap: Record<string, any[]> = {};
          
          allStudents.forEach((student: any) => {
            const gradeLabel = gradeMapping[student.grade_level] || `Grade ${student.grade_level}`;
            if (!gradeMap[gradeLabel]) {
              gradeMap[gradeLabel] = [];
            }
            gradeMap[gradeLabel].push(student);
          });

          const reportData: any[] = [];

          gradeOrder.forEach((grade) => {
            const students = gradeMap[grade] || [];
            const maleStudents = students.filter((s: any) => s.gender === 'M' || s.gender === 'Male');
            const femaleStudents = students.filter((s: any) => s.gender === 'F' || s.gender === 'Female');

            const gradeData: any = {
              gradeLevel: grade,
              enrollment: {
                M: maleStudents.length,
                F: femaleStudents.length,
                Total: students.length
              },
              bmi: {
                pupilsWeighed: { M: 0, F: 0, Total: 0 },
                severelyWasted: { M: 0, F: 0, Total: 0, percent: 0 },
                wasted: { M: 0, F: 0, Total: 0, percent: 0 },
                normal: { M: 0, F: 0, Total: 0, percent: 0 },
                overweight: { M: 0, F: 0, Total: 0, percent: 0 },
                obese: { M: 0, F: 0, Total: 0, percent: 0 },
                primaryBeneficiaries: { M: 0, F: 0, Total: 0 }
              },
              hfa: {
                pupilsTakenHeight: { M: 0, F: 0, Total: 0 },
                severelyStunted: { M: 0, F: 0, Total: 0, percent: 0 },
                stunted: { M: 0, F: 0, Total: 0, percent: 0 },
                severelyStuntedNotSW: { M: 0, F: 0, Total: 0 },
                stuntedNotSW: { M: 0, F: 0, Total: 0 },
                secondaryBeneficiaries: { M: 0, F: 0, Total: 0 },
                normal: { M: 0, F: 0, Total: 0, percent: 0 },
                tall: { M: 0, F: 0, Total: 0, percent: 0 }
              },
              totalBeneficiaries: { M: 0, F: 0, Total: 0 }
            };

            // Process each student in this grade
            students.forEach((student: any) => {
              const record = latestRecords[student.id];
              if (!record) return;

              const gender = student.gender;
              const sexKey = (gender === 'Male' || gender === 'M') ? 'M' : 'F';

              // Count pupils weighed/taken height
              gradeData.bmi.pupilsWeighed[sexKey]++;
              gradeData.bmi.pupilsWeighed.Total++;
              gradeData.hfa.pupilsTakenHeight[sexKey]++;
              gradeData.hfa.pupilsTakenHeight.Total++;

              // BMI Status
              if (record.bmi_status === 'Severely Wasted') {
                gradeData.bmi.severelyWasted[sexKey]++;
                gradeData.bmi.severelyWasted.Total++;
                gradeData.bmi.primaryBeneficiaries[sexKey]++;
                gradeData.bmi.primaryBeneficiaries.Total++;
              } else if (record.bmi_status === 'Wasted') {
                gradeData.bmi.wasted[sexKey]++;
                gradeData.bmi.wasted.Total++;
                gradeData.bmi.primaryBeneficiaries[sexKey]++;
                gradeData.bmi.primaryBeneficiaries.Total++;
              } else if (record.bmi_status === 'Normal') {
                gradeData.bmi.normal[sexKey]++;
                gradeData.bmi.normal.Total++;
              } else if (record.bmi_status === 'Overweight') {
                gradeData.bmi.overweight[sexKey]++;
                gradeData.bmi.overweight.Total++;
              } else if (record.bmi_status === 'Obese') {
                gradeData.bmi.obese[sexKey]++;
                gradeData.bmi.obese.Total++;
              }

              // HFA Status
              const hasBadBMI = record.bmi_status === 'Severely Wasted' || record.bmi_status === 'Wasted';
              if (record.height_for_age_status === 'Severely Stunted') {
                gradeData.hfa.severelyStunted[sexKey]++;
                gradeData.hfa.severelyStunted.Total++;
                if (!hasBadBMI) {
                  gradeData.hfa.severelyStuntedNotSW[sexKey]++;
                  gradeData.hfa.severelyStuntedNotSW.Total++;
                  gradeData.hfa.secondaryBeneficiaries[sexKey]++;
                  gradeData.hfa.secondaryBeneficiaries.Total++;
                }
              } else if (record.height_for_age_status === 'Stunted') {
                gradeData.hfa.stunted[sexKey]++;
                gradeData.hfa.stunted.Total++;
                if (!hasBadBMI) {
                  gradeData.hfa.stuntedNotSW[sexKey]++;
                  gradeData.hfa.stuntedNotSW.Total++;
                  gradeData.hfa.secondaryBeneficiaries[sexKey]++;
                  gradeData.hfa.secondaryBeneficiaries.Total++;
                }
              } else if (record.height_for_age_status === 'Normal') {
                gradeData.hfa.normal[sexKey]++;
                gradeData.hfa.normal.Total++;
              } else if (record.height_for_age_status === 'Tall') {
                gradeData.hfa.tall[sexKey]++;
                gradeData.hfa.tall.Total++;
              }
            });

            // Calculate percentages
            if (gradeData.bmi.pupilsWeighed.Total > 0) {
              gradeData.bmi.severelyWasted.percent = (gradeData.bmi.severelyWasted.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
              gradeData.bmi.wasted.percent = (gradeData.bmi.wasted.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
              gradeData.bmi.normal.percent = (gradeData.bmi.normal.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
              gradeData.bmi.overweight.percent = (gradeData.bmi.overweight.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
              gradeData.bmi.obese.percent = (gradeData.bmi.obese.Total / gradeData.bmi.pupilsWeighed.Total) * 100;
            }

            if (gradeData.hfa.pupilsTakenHeight.Total > 0) {
              gradeData.hfa.severelyStunted.percent = (gradeData.hfa.severelyStunted.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
              gradeData.hfa.stunted.percent = (gradeData.hfa.stunted.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
              gradeData.hfa.normal.percent = (gradeData.hfa.normal.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
              gradeData.hfa.tall.percent = (gradeData.hfa.tall.Total / gradeData.hfa.pupilsTakenHeight.Total) * 100;
            }

            // Total beneficiaries
            gradeData.totalBeneficiaries.M = gradeData.bmi.primaryBeneficiaries.M + gradeData.hfa.secondaryBeneficiaries.M;
            gradeData.totalBeneficiaries.F = gradeData.bmi.primaryBeneficiaries.F + gradeData.hfa.secondaryBeneficiaries.F;
            gradeData.totalBeneficiaries.Total = gradeData.bmi.primaryBeneficiaries.Total + gradeData.hfa.secondaryBeneficiaries.Total;

            reportData.push(gradeData);
          });

          // Calculate grand total
          const grandTotal: any = {
            gradeLevel: 'GRAND TOTAL',
            enrollment: { M: 0, F: 0, Total: 0 },
            bmi: {
              pupilsWeighed: { M: 0, F: 0, Total: 0 },
              severelyWasted: { M: 0, F: 0, Total: 0, percent: 0 },
              wasted: { M: 0, F: 0, Total: 0, percent: 0 },
              normal: { M: 0, F: 0, Total: 0, percent: 0 },
              overweight: { M: 0, F: 0, Total: 0, percent: 0 },
              obese: { M: 0, F: 0, Total: 0, percent: 0 },
              primaryBeneficiaries: { M: 0, F: 0, Total: 0 }
            },
            hfa: {
              pupilsTakenHeight: { M: 0, F: 0, Total: 0 },
              severelyStunted: { M: 0, F: 0, Total: 0, percent: 0 },
              stunted: { M: 0, F: 0, Total: 0, percent: 0 },
              severelyStuntedNotSW: { M: 0, F: 0, Total: 0 },
              stuntedNotSW: { M: 0, F: 0, Total: 0 },
              secondaryBeneficiaries: { M: 0, F: 0, Total: 0 },
              normal: { M: 0, F: 0, Total: 0, percent: 0 },
              tall: { M: 0, F: 0, Total: 0, percent: 0 }
            },
            totalBeneficiaries: { M: 0, F: 0, Total: 0 }
          };

          reportData.forEach((grade) => {
            grandTotal.enrollment.M += grade.enrollment.M;
            grandTotal.enrollment.F += grade.enrollment.F;
            grandTotal.enrollment.Total += grade.enrollment.Total;
            grandTotal.bmi.pupilsWeighed.M += grade.bmi.pupilsWeighed.M;
            grandTotal.bmi.pupilsWeighed.F += grade.bmi.pupilsWeighed.F;
            grandTotal.bmi.pupilsWeighed.Total += grade.bmi.pupilsWeighed.Total;
            grandTotal.bmi.severelyWasted.M += grade.bmi.severelyWasted.M;
            grandTotal.bmi.severelyWasted.F += grade.bmi.severelyWasted.F;
            grandTotal.bmi.severelyWasted.Total += grade.bmi.severelyWasted.Total;
            grandTotal.bmi.wasted.M += grade.bmi.wasted.M;
            grandTotal.bmi.wasted.F += grade.bmi.wasted.F;
            grandTotal.bmi.wasted.Total += grade.bmi.wasted.Total;
            grandTotal.bmi.normal.M += grade.bmi.normal.M;
            grandTotal.bmi.normal.F += grade.bmi.normal.F;
            grandTotal.bmi.normal.Total += grade.bmi.normal.Total;
            grandTotal.bmi.overweight.M += grade.bmi.overweight.M;
            grandTotal.bmi.overweight.F += grade.bmi.overweight.F;
            grandTotal.bmi.overweight.Total += grade.bmi.overweight.Total;
            grandTotal.bmi.obese.M += grade.bmi.obese.M;
            grandTotal.bmi.obese.F += grade.bmi.obese.F;
            grandTotal.bmi.obese.Total += grade.bmi.obese.Total;
            grandTotal.bmi.primaryBeneficiaries.M += grade.bmi.primaryBeneficiaries.M;
            grandTotal.bmi.primaryBeneficiaries.F += grade.bmi.primaryBeneficiaries.F;
            grandTotal.bmi.primaryBeneficiaries.Total += grade.bmi.primaryBeneficiaries.Total;
            grandTotal.hfa.pupilsTakenHeight.M += grade.hfa.pupilsTakenHeight.M;
            grandTotal.hfa.pupilsTakenHeight.F += grade.hfa.pupilsTakenHeight.F;
            grandTotal.hfa.pupilsTakenHeight.Total += grade.hfa.pupilsTakenHeight.Total;
            grandTotal.hfa.severelyStunted.M += grade.hfa.severelyStunted.M;
            grandTotal.hfa.severelyStunted.F += grade.hfa.severelyStunted.F;
            grandTotal.hfa.severelyStunted.Total += grade.hfa.severelyStunted.Total;
            grandTotal.hfa.stunted.M += grade.hfa.stunted.M;
            grandTotal.hfa.stunted.F += grade.hfa.stunted.F;
            grandTotal.hfa.stunted.Total += grade.hfa.stunted.Total;
            grandTotal.hfa.severelyStuntedNotSW.M += grade.hfa.severelyStuntedNotSW.M;
            grandTotal.hfa.severelyStuntedNotSW.F += grade.hfa.severelyStuntedNotSW.F;
            grandTotal.hfa.severelyStuntedNotSW.Total += grade.hfa.severelyStuntedNotSW.Total;
            grandTotal.hfa.stuntedNotSW.M += grade.hfa.stuntedNotSW.M;
            grandTotal.hfa.stuntedNotSW.F += grade.hfa.stuntedNotSW.F;
            grandTotal.hfa.stuntedNotSW.Total += grade.hfa.stuntedNotSW.Total;
            grandTotal.hfa.secondaryBeneficiaries.M += grade.hfa.secondaryBeneficiaries.M;
            grandTotal.hfa.secondaryBeneficiaries.F += grade.hfa.secondaryBeneficiaries.F;
            grandTotal.hfa.secondaryBeneficiaries.Total += grade.hfa.secondaryBeneficiaries.Total;
            grandTotal.hfa.normal.M += grade.hfa.normal.M;
            grandTotal.hfa.normal.F += grade.hfa.normal.F;
            grandTotal.hfa.normal.Total += grade.hfa.normal.Total;
            grandTotal.hfa.tall.M += grade.hfa.tall.M;
            grandTotal.hfa.tall.F += grade.hfa.tall.F;
            grandTotal.hfa.tall.Total += grade.hfa.tall.Total;
            grandTotal.totalBeneficiaries.M += grade.totalBeneficiaries.M;
            grandTotal.totalBeneficiaries.F += grade.totalBeneficiaries.F;
            grandTotal.totalBeneficiaries.Total += grade.totalBeneficiaries.Total;
          });

          // Calculate grand total percentages
          if (grandTotal.bmi.pupilsWeighed.Total > 0) {
            grandTotal.bmi.severelyWasted.percent = (grandTotal.bmi.severelyWasted.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
            grandTotal.bmi.wasted.percent = (grandTotal.bmi.wasted.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
            grandTotal.bmi.normal.percent = (grandTotal.bmi.normal.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
            grandTotal.bmi.overweight.percent = (grandTotal.bmi.overweight.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
            grandTotal.bmi.obese.percent = (grandTotal.bmi.obese.Total / grandTotal.bmi.pupilsWeighed.Total) * 100;
          }

          if (grandTotal.hfa.pupilsTakenHeight.Total > 0) {
            grandTotal.hfa.severelyStunted.percent = (grandTotal.hfa.severelyStunted.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
            grandTotal.hfa.stunted.percent = (grandTotal.hfa.stunted.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
            grandTotal.hfa.normal.percent = (grandTotal.hfa.normal.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
            grandTotal.hfa.tall.percent = (grandTotal.hfa.tall.Total / grandTotal.hfa.pupilsTakenHeight.Total) * 100;
          }

          reportData.push(grandTotal);

          // Save the snapshot data with default detailed format
          pdfPath = 'overview:detailed';
          dataObj = {
            format: 'detailed',
            reportData: reportData,
            generated_date: new Date().toISOString(),
            school_name: dataObj.school_name || 'SCIENCE CITY OF MUNOZ',
            school_year: dataObj.school_year || '2025-2026',
          };

          console.log('[REPORTS] Generated overview report with', reportData.length, 'grades');
        } catch (error) {
          console.error('[REPORTS] Error generating overview report snapshot:', error);
        }
      }

      // Convert to Philippine timezone (UTC+8) for generated_at timestamp
      const now = new Date();
      const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours
      const generatedAt = phTime.toISOString();

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert([
          {
            title,
            report_type: reportType,
            description,
            data: JSON.stringify(dataObj),
            pdf_file: pdfPath || pdfFile,
            status,
            generated_by: user.id,
            generated_at: generatedAt, // Use Philippine time
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
    console.error('[REPORTS POST] Error:', error);
    console.error('[REPORTS POST] Error message:', error.message);
    console.error('[REPORTS POST] Error stack:', error.stack);
    
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      console.error('[REPORTS POST] Authentication failed - user may not be logged in');
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in again.' },
        { status: 401 }
      );
    }
    console.error('Error in reports POST:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred' },
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
    console.log('[REPORTS DELETE] Request received');
    await requireAuth(request);
    console.log('[REPORTS DELETE] Auth passed');
    
    const user = await getCurrentUser(request);
    console.log('[REPORTS DELETE] Current user:', user);
    
    if (!user) {
      console.error('[REPORTS DELETE] No user found - Unauthorized');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please log in again' },
        { status: 401 }
      );
    }

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
    const { error, data } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .select();

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { success: false, message: 'Error deleting report', error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Report not found or already deleted' },
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

/**
 * @deprecated - CSV generation replaced with PDF generation
 * This function is kept for backward compatibility but should not be used for new reports
 */
async function generateCSVReport(
  supabase: any,
  gradeLevel: string,
  reportMonth: string
): Promise<{ path: string; content: string }> {
  // Map grade level string to integer (as stored in database)
  const gradeMap: Record<string, number> = {
    'Kinder': 0,
    'Grade 1': 1,
    'Grade 2': 2,
    'Grade 3': 3,
    'Grade 4': 4,
    'Grade 5': 5,
    'Grade 6': 6,
  };
  const dbGradeLevel = gradeMap[gradeLevel];
  
  if (dbGradeLevel === undefined) {
    throw new Error(`Invalid grade level: ${gradeLevel}. Expected: Kinder, Grade 1-6`);
  }

  // Parse month (format: YYYY-MM)
  const [year, month] = reportMonth.split('-');
  const monthStart = `${year}-${month}-01`;
  const monthEnd = `${year}-${month}-31`;

  // Fetch students by grade level
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('grade_level', dbGradeLevel);

  if (studentsError || !students) {
    throw new Error('Error fetching students');
  }

  // Fetch BMI records for the month
  const { data: bmiRecords, error: bmiError } = await supabase
    .from('bmi_records')
    .select('*, students(*)')
    .gte('measured_at', monthStart)
    .lte('measured_at', monthEnd)
    .order('measured_at', { ascending: false });

  if (bmiError) {
    throw new Error('Error fetching BMI records');
  }

  // Create a map of student_id to latest BMI record for the month
  const latestRecords = new Map();
  bmiRecords?.forEach((record: any) => {
    const studentId = record.student_id;
    const existing = latestRecords.get(studentId);
    if (!existing || new Date(record.measured_at) > new Date(existing.measured_at)) {
      latestRecords.set(studentId, record);
    }
  });

  // Helper function to properly escape CSV fields
  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // If field contains comma, quote, newline, or has leading/trailing spaces, wrap in quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.trim() !== str) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Generate CSV content
  const csvRows: string[] = [];
  
  // CSV Header - Age is split into Y (years) and M (total months) columns
  // Add two header rows: first row has "Age" spanning Y and M, second row has Y and M sub-headers
  // Row 1: Main headers with "Age" in place of Y and M
  const mainHeaders = ['Names', 'Birthday', 'Weight (kg)', 'Height (meters)', 'Sex', 'Height2 (m2)', 'Age', '', 'BMI', 'Nutritional Status', 'Height-For-Age'];
  csvRows.push(mainHeaders.map(escapeCsvField).join(','));
  
  // Row 2: Sub-headers with Y and M under Age
  const subHeaders = ['', '', '', '', '', '', 'Y', 'M', '', '', ''];
  csvRows.push(subHeaders.map(escapeCsvField).join(','));

  // Process each student
  students.forEach((student: any) => {
    const record = latestRecords.get(student.id);
    
    // Get student name
    const fullName = `${student.last_name || ''}, ${student.first_name || ''} ${student.middle_name || ''}`.trim().replace(/,$/, '');
    
    // Format birthday (DD-MMM-YY format like "23-Apr-20")
    let birthday = '';
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const day = birthDate.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[birthDate.getMonth()];
      const year = birthDate.getFullYear().toString().slice(-2);
      birthday = `${day}-${month}-${year}`;
    }

    // Get weight and height from record or student
    const weight = record?.weight || student.weight || '';
    const height = record?.height || student.height || '';
    const heightInMeters = height ? (height / 100).toFixed(2) : '';
    const height2 = heightInMeters ? (parseFloat(heightInMeters) * parseFloat(heightInMeters)).toFixed(4) : '';

    // Get sex
    const sex = student.gender === 'Male' ? 'M' : student.gender === 'Female' ? 'F' : '';

    // Calculate age in months (total months) and years
    let ageYears = '';
    let ageMonths = '';
    if (student.birthdate) {
      const birthDate = new Date(student.birthdate);
      const measuredDate = record?.measured_at ? new Date(record.measured_at) : new Date();
      
      // Calculate total months
      let totalMonths = (measuredDate.getFullYear() - birthDate.getFullYear()) * 12;
      totalMonths += measuredDate.getMonth() - birthDate.getMonth();
      
      if (measuredDate.getDate() < birthDate.getDate()) {
        totalMonths--;
      }
      
      // Calculate years and total months
      const years = Math.floor(totalMonths / 12);
      
      ageYears = years.toString();
      ageMonths = totalMonths.toString(); // Total months for the M column
    }

    // Calculate BMI
    let bmi = '';
    let nutritionalStatus = '';
    if (weight && height) {
      bmi = calculateBMI(weight, height).toFixed(1);
      nutritionalStatus = getBMIStatus(parseFloat(bmi));
      
      // Map to template format
      if (nutritionalStatus === 'Severely Wasted') nutritionalStatus = 'Severely Wasted/SU';
      else if (nutritionalStatus === 'Wasted') nutritionalStatus = 'Wasted/U';
    }

    // Height-For-Age (simplified - you may need to implement proper HFA calculation)
    let heightForAge = record?.height_for_age_status || student.height_for_age_status || '';
    if (!heightForAge && height && student.birthdate) {
      // Simple logic - you may need proper HFA calculation
      heightForAge = 'Normal'; // Placeholder
    }

    // Add row to CSV with proper escaping
    // Age is split into Y (years) and M (total months) columns
    csvRows.push([
      escapeCsvField(fullName),
      escapeCsvField(birthday),
      escapeCsvField(weight || ''),
      escapeCsvField(heightInMeters),
      escapeCsvField(sex),
      escapeCsvField(height2),
      escapeCsvField(ageYears), // Y column (years)
      escapeCsvField(ageMonths), // M column (total months)
      escapeCsvField(bmi),
      escapeCsvField(nutritionalStatus),
      escapeCsvField(heightForAge)
    ].join(','));
  });

  // Generate CSV content
  const csvContent = csvRows.join('\n');

  // Generate filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const filename = `report_${timestamp}_${randomId}.csv`;
  const filePath = `capstone/uploads/reports/${filename}`;

  // Upload to Supabase Storage
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('capstone')
      .upload(filePath, csvContent, {
        contentType: 'text/csv',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading CSV to storage:', uploadError);
      // Return path anyway - file might be saved elsewhere
    }
  } catch (storageError) {
    console.error('Storage upload error:', storageError);
    // Continue - file path is still returned
  }

  // Return both path and content
  return { path: filePath, content: csvContent };
}

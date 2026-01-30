// ============================================
// CENTRAL TYPE DEFINITIONS
// ============================================

// ============================================
// USER & AUTHENTICATION
// ============================================
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'nutritionist';
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'nutritionist';
}

// ============================================
// STUDENT
// ============================================
export interface Student {
  id: number;
  lrn: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  gender: 'Male' | 'Female';
  grade_level: number;
  section?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// BMI & HEALTH STATUS
// ============================================
export type BMIStatus = 'Severely Wasted' | 'Wasted' | 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
export type HFAStatus = 'Severely Stunted' | 'Stunted' | 'Normal' | 'Tall';

export interface BMIRecord {
  id: number;
  student_id: number;
  weight: number;
  height: number;
  bmi: number;
  bmi_status: BMIStatus;
  height_for_age_status: HFAStatus;
  measured_at: string;
  measured_by: number;
  created_at: string;
  student?: Student;
}

export interface BMICounts {
  severelyWasted: number;
  wasted: number;
  underweight: number;
  normal: number;
  overweight: number;
  obese: number;
}

export interface HFACounts {
  severelyStunted: number;
  stunted: number;
  normal: number;
  tall: number;
}

// ============================================
// FEEDING PROGRAM
// ============================================
export type ProgramStatus = 'active' | 'ended';
export type GrowthStatus = 'Improve' | 'Overdone' | 'No/Decline Improvement' | 'No Change';

export interface FeedingProgram {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: ProgramStatus;
  created_by: number;
  created_at: string;
  total_beneficiaries?: number;
}

export interface Beneficiary {
  id: number;
  feeding_program_id: number;
  student_id: number;
  enrollment_date: string;
  created_at: string;
  student?: Student;
  bmi?: number;
  bmi_status?: BMIStatus;
  bmi_at_enrollment?: number;
  bmi_status_at_enrollment?: BMIStatus;
  height_for_age_status?: HFAStatus;
  height_for_age_status_at_enrollment?: HFAStatus;
  attendance_rate?: number;
  total_attendance?: number;
  days_present?: number;
}

export interface EligibleStudent extends Student {
  bmi_status?: BMIStatus;
  height_for_age_status?: HFAStatus;
  isPriority?: boolean;
}

export interface FeedingProgramStats {
  primary: number;
  secondary: number;
  total: number;
}

// ============================================
// REPORTS
// ============================================
export type ReportType = 'monthly_bmi' | 'feeding_program';
export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface Report {
  id: number;
  title: string;
  report_type: ReportType;
  description?: string;
  data: any;
  status: ReportStatus;
  created_by: number;
  generated_at: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  file_url?: string;
}

export interface ReportData {
  program_id?: number;
  program_name?: string;
  start_date?: string;
  end_date?: string;
  grade_level?: string;
  report_month?: string;
  created_date: string;
  school_name: string;
  school_year: string;
  pdf_ready: boolean;
  students?: any[];
  beneficiaries?: any[];
}

// ============================================
// DASHBOARD & SUMMARY
// ============================================
export interface DashboardSummary {
  totalStudents: number;
  pupilsWeighed: number;
  bmiCounts: BMICounts;
  hfaCounts: HFACounts;
  feedingProgram: FeedingProgramStats;
}

export interface MonthlyRecord {
  count: number;
  students: Set<number>;
}

export interface MonthlyData {
  [monthKey: string]: MonthlyRecord;
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// Specific API responses
export interface StudentsResponse extends ApiResponse {
  students: Student[];
}

export interface BMIRecordsResponse extends ApiResponse {
  records: BMIRecord[];
}

export interface ProgramsResponse extends ApiResponse {
  programs: FeedingProgram[];
}

export interface BeneficiariesResponse extends ApiResponse {
  beneficiaries: Beneficiary[];
}

export interface EligibleStudentsResponse extends ApiResponse {
  eligible_students: EligibleStudent[];
}

export interface ReportsResponse extends ApiResponse {
  reports: Report[];
}

// ============================================
// FORM DATA
// ============================================
export interface StudentFormData {
  lrn: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female';
  grade_level: number;
  section?: string;
}

export interface BMIFormData {
  student_id: number;
  weight: number;
  height: number;
  measured_at: string;
}

export interface ProgramFormData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
}

export interface BeneficiaryFormData {
  program_id: number;
  student_id: number;
  enrollment_date: string;
}

// ============================================
// FILTER & SEARCH
// ============================================
export interface FilterOptions {
  gradeLevel?: string;
  bmiStatus?: BMIStatus | '';
  hfaStatus?: HFAStatus | '';
  gender?: 'Male' | 'Female' | '';
  month?: string;
  year?: string;
  search?: string;
}

// ============================================
// UI STATE
// ============================================
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

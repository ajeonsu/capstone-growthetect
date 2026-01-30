// ============================================
// CUSTOM REACT HOOKS FOR API CALLS
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type {
  Student,
  BMIRecord,
  FeedingProgram,
  Beneficiary,
  EligibleStudent,
  Report,
  DashboardSummary,
  ApiResponse,
} from '@/types';

// ============================================
// GENERIC API HOOK
// ============================================

interface UseApiOptions {
  autoFetch?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(url: string, options: UseApiOptions = {}) {
  const { autoFetch = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        credentials: 'include',
      });
      const result: ApiResponse<T> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        onSuccess?.(result.data);
      } else {
        const errorMsg = result.message || 'Failed to fetch data';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [url, onSuccess, onError]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// ============================================
// STUDENTS HOOKS
// ============================================

export function useStudents() {
  return useApi<Student[]>('/api/students');
}

export function useStudentById(studentId: number) {
  return useApi<Student>(`/api/students?id=${studentId}`, {
    autoFetch: studentId > 0,
  });
}

// ============================================
// BMI RECORDS HOOKS
// ============================================

export function useBMIRecords(filters?: {
  studentId?: number;
  month?: string;
  year?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.studentId) params.append('student_id', filters.studentId.toString());
  if (filters?.month) params.append('month', filters.month);
  if (filters?.year) params.append('year', filters.year);

  const url = `/api/bmi-records${params.toString() ? `?${params}` : ''}`;
  
  return useApi<BMIRecord[]>(url);
}

export function useLatestBMI(studentId: number) {
  const { data: records, loading, error, refetch } = useBMIRecords({ studentId });
  
  const latestBMI = records && records.length > 0
    ? records.reduce((latest, record) =>
        new Date(record.measured_at) > new Date(latest.measured_at) ? record : latest
      )
    : null;

  return { data: latestBMI, loading, error, refetch };
}

// ============================================
// FEEDING PROGRAM HOOKS
// ============================================

export function useFeedingPrograms() {
  const [programs, setPrograms] = useState<FeedingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feeding-program?type=programs', {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        setPrograms(result.programs || []);
      } else {
        setError(result.message || 'Failed to fetch programs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return { programs, loading, error, refetch: fetchPrograms };
}

export function useBeneficiaries(programId: number) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBeneficiaries = useCallback(async () => {
    if (!programId) {
      setBeneficiaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/feeding-program?type=beneficiaries&program_id=${programId}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setBeneficiaries(result.beneficiaries || []);
      } else {
        setError(result.message || 'Failed to fetch beneficiaries');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  return { beneficiaries, loading, error, refetch: fetchBeneficiaries };
}

export function useEligibleStudents(programId: number = 0) {
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibleStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/feeding-program?type=eligible_students&program_id=${programId}&t=${Date.now()}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setStudents(result.eligible_students || []);
      } else {
        setError(result.message || 'Failed to fetch eligible students');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchEligibleStudents();
  }, [fetchEligibleStudents]);

  return { students, loading, error, refetch: fetchEligibleStudents };
}

// ============================================
// REPORTS HOOKS
// ============================================

export function useReports(filters?: {
  type?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);

  const url = `/api/reports${params.toString() ? `?${params}` : ''}`;
  
  return useApi<Report[]>(url);
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboard(gradeLevel?: string) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch students
      const studentsRes = await fetch('/api/students', { credentials: 'include' });
      const studentsData = await studentsRes.json();

      let filteredStudents = studentsData.success ? studentsData.students : [];
      if (gradeLevel) {
        filteredStudents = filteredStudents.filter((s: Student) => s.grade_level.toString() === gradeLevel);
      }

      // Fetch BMI records
      const bmiRes = await fetch('/api/bmi-records', { credentials: 'include' });
      const bmiData = await bmiRes.json();

      // Fetch feeding programs
      const programsRes = await fetch('/api/feeding-program?type=programs', { credentials: 'include' });
      const programsData = await programsRes.json();

      if (bmiData.success) {
        const studentIds = new Set(filteredStudents.map((s: Student) => s.id));
        const relevantRecords = gradeLevel
          ? bmiData.records.filter((r: BMIRecord) => studentIds.has(r.student_id))
          : bmiData.records;

        // Get latest BMI for each student
        const latestRecords: Record<number, BMIRecord> = {};
        relevantRecords.forEach((record: BMIRecord) => {
          if (!latestRecords[record.student_id] ||
            new Date(record.measured_at) > new Date(latestRecords[record.student_id].measured_at)) {
            latestRecords[record.student_id] = record;
          }
        });

        // Count statuses
        const bmiCounts = { severelyWasted: 0, wasted: 0, underweight: 0, normal: 0, overweight: 0, obese: 0 };
        const hfaCounts = { severelyStunted: 0, stunted: 0, normal: 0, tall: 0 };

        Object.values(latestRecords).forEach((record) => {
          // BMI counts
          if (record.bmi_status === 'Severely Wasted') bmiCounts.severelyWasted++;
          else if (record.bmi_status === 'Wasted') bmiCounts.wasted++;
          else if (record.bmi_status === 'Underweight') bmiCounts.underweight++;
          else if (record.bmi_status === 'Normal') bmiCounts.normal++;
          else if (record.bmi_status === 'Overweight') bmiCounts.overweight++;
          else if (record.bmi_status === 'Obese') bmiCounts.obese++;

          // HFA counts
          if (record.height_for_age_status === 'Severely Stunted') hfaCounts.severelyStunted++;
          else if (record.height_for_age_status === 'Stunted') hfaCounts.stunted++;
          else if (record.height_for_age_status === 'Normal') hfaCounts.normal++;
          else if (record.height_for_age_status === 'Tall') hfaCounts.tall++;
        });

        setData({
          totalStudents: filteredStudents.length,
          pupilsWeighed: Object.keys(latestRecords).length,
          bmiCounts,
          hfaCounts,
          feedingProgram: { primary: 0, secondary: 0, total: 0 }, // Would need additional logic
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [gradeLevel]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, loading, error, refetch: fetchDashboard };
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useMutation<TData = any, TVariables = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (
      url: string,
      variables: TVariables,
      options?: {
        method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        onSuccess?: (data: TData) => void;
        onError?: (error: string) => void;
      }
    ) => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        if (variables && typeof variables === 'object') {
          Object.entries(variables).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, value.toString());
            }
          });
        }

        const response = await fetch(url, {
          method: options?.method || 'POST',
          credentials: 'include',
          body: formData,
        });

        const result: ApiResponse<TData> = await response.json();

        if (result.success) {
          setData(result.data || null);
          options?.onSuccess?.(result.data as TData);
          return result.data;
        } else {
          const errorMsg = result.message || 'Operation failed';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { mutate, loading, error, data };
}

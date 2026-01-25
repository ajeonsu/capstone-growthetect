import { DISPLAY_DATE_FORMAT, DISPLAY_DATETIME_FORMAT } from './constants';

/**
 * Sanitize input data
 */
export function sanitizeInput(data: any): any {
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  return data;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format
 */
export function isValidDate(date: string, format: string = 'Y-m-d'): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Calculate age from birthdate
 */
export function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, height: number): number {
  if (height === 0) return 0;
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 100) / 100;
}

/**
 * Get BMI Status based on value
 */
export function getBMIStatus(bmi: number): string {
  if (bmi < 16) return 'Severely Wasted';
  if (bmi < 18.5) return 'Wasted';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * Get Height-For-Age status
 * Simplified calculation - ideally should use WHO growth charts
 */
export function getHeightForAgeStatus(height: number, ageYears: number): string {
  if (ageYears <= 0 || height <= 0) return 'Normal';
  
  // Simplified HFA classification based on age and height
  // In production, this should use proper WHO growth charts
  if (height < 100 && ageYears > 5) return 'Severely Stunted';
  if (height < 110 && ageYears > 6) return 'Stunted';
  if (height < 115 && ageYears > 7) return 'Stunted';
  if (height < 120 && ageYears > 8) return 'Stunted';
  if (height < 125 && ageYears > 9) return 'Stunted';
  if (height < 130 && ageYears > 10) return 'Stunted';
  if (height > 150 && ageYears < 10) return 'Tall';
  
  return 'Normal';
}

/**
 * Format date for display
 */
export function formatDate(date: string | null, format: string = DISPLAY_DATE_FORMAT): string {
  if (!date) return 'N/A';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  if (format === DISPLAY_DATE_FORMAT) {
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return dateObj.toLocaleDateString();
}

/**
 * Format datetime for display
 */
export function formatDateTime(datetime: string | null, format: string = DISPLAY_DATETIME_FORMAT): string {
  if (!datetime) return 'N/A';
  const dateObj = new Date(datetime);
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Validate required fields
 */
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): string[] {
  const missing: string[] = [];
  requiredFields.forEach((field) => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  });
  return missing;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, length);
}

/**
 * Check if user has permission
 */
export function hasPermission(userRole: string, allowedRoles: string | string[]): boolean {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
}

/**
 * Get current school year
 */
export function getCurrentSchoolYear(): string {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  
  // School year starts in June (month 6)
  if (currentMonth >= 6) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(2) + ' GB';
  } else if (bytes >= 1048576) {
    return (bytes / 1048576).toFixed(2) + ' MB';
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return bytes + ' bytes';
  }
}

/**
 * Validate LRN format (12 digits)
 */
export function isValidLRN(lrn: string): boolean {
  return /^\d{12}$/.test(lrn);
}

/**
 * Validate Philippine mobile number
 */
export function isValidPhilippineMobile(number: string): boolean {
  // Format: 09XXXXXXXXX or +639XXXXXXXXX
  return /^(09|\+639)\d{9}$/.test(number);
}

/**
 * Get BMI category color
 */
export function getBMIColor(status: string): string {
  const colors: Record<string, string> = {
    'Severely Wasted': 'red',
    'Wasted': 'yellow',
    'Normal': 'green',
    'Overweight': 'orange',
    'Obese': 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Paginate array
 */
export function paginateArray<T>(array: T[], page: number = 1, perPage: number = 50): T[] {
  const offset = (page - 1) * perPage;
  return array.slice(offset, offset + perPage);
}

/**
 * Get pagination info
 */
export function getPaginationInfo(total: number, page: number = 1, perPage: number = 50) {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    per_page: perPage,
    current_page: page,
    total_pages: totalPages,
    has_prev: page > 1,
    has_next: page < totalPages,
  };
}

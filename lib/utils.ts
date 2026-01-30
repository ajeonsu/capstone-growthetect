// ============================================
// UTILITY FUNCTIONS
// ============================================

import type { BMIStatus, HFAStatus, GrowthStatus } from '@/types';

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get Philippine timezone date (UTC+8)
 */
export function getPhilippineDate(date: Date = new Date()): Date {
  const utcTime = date.getTime();
  const phTime = utcTime + (8 * 60 * 60 * 1000); // Add 8 hours for UTC+8
  return new Date(phTime);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format date to localized string
 */
export function formatDateLocale(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Get last day of month
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get current school year
 */
export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // School year starts in June
  if (month >= 6) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// ============================================
// BMI CALCULATIONS
// ============================================

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, height: number): number {
  if (height <= 0 || weight <= 0) return 0;
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Get BMI status based on BMI value and age
 */
export function getBMIStatus(bmi: number, age: number): BMIStatus {
  if (age < 5 || age > 19) return 'Normal';

  // BMI-for-age percentiles (simplified)
  // These are approximate values and should be adjusted based on WHO/CDC standards
  const thresholds: Record<number, { severelyWasted: number; wasted: number; normal: number; overweight: number; obese: number }> = {
    5: { severelyWasted: 12.1, wasted: 13.3, normal: 15.3, overweight: 17.0, obese: 18.3 },
    6: { severelyWasted: 12.1, wasted: 13.3, normal: 15.3, overweight: 17.2, obese: 18.7 },
    7: { severelyWasted: 12.2, wasted: 13.5, normal: 15.5, overweight: 17.7, obese: 19.5 },
    8: { severelyWasted: 12.4, wasted: 13.7, normal: 15.9, overweight: 18.4, obese: 20.6 },
    9: { severelyWasted: 12.7, wasted: 14.0, normal: 16.4, overweight: 19.2, obese: 22.0 },
    10: { severelyWasted: 13.1, wasted: 14.5, normal: 17.0, overweight: 20.1, obese: 23.5 },
    11: { severelyWasted: 13.6, wasted: 15.0, normal: 17.7, overweight: 21.1, obese: 25.1 },
    12: { severelyWasted: 14.2, wasted: 15.7, normal: 18.5, overweight: 22.2, obese: 26.7 },
    13: { severelyWasted: 14.8, wasted: 16.4, normal: 19.4, overweight: 23.3, obese: 28.3 },
    14: { severelyWasted: 15.5, wasted: 17.2, normal: 20.3, overweight: 24.4, obese: 29.8 },
    15: { severelyWasted: 16.2, wasted: 18.0, normal: 21.2, overweight: 25.4, obese: 31.2 },
    16: { severelyWasted: 16.9, wasted: 18.7, normal: 22.0, overweight: 26.3, obese: 32.4 },
    17: { severelyWasted: 17.5, wasted: 19.4, normal: 22.7, overweight: 27.1, obese: 33.5 },
    18: { severelyWasted: 18.0, wasted: 20.0, normal: 23.3, overweight: 27.8, obese: 34.4 },
    19: { severelyWasted: 18.5, wasted: 20.5, normal: 23.9, overweight: 28.4, obese: 35.1 }
  };

  const threshold = thresholds[age] || thresholds[10];

  if (bmi < threshold.severelyWasted) return 'Severely Wasted';
  if (bmi < threshold.wasted) return 'Wasted';
  if (bmi < threshold.overweight) return 'Normal';
  if (bmi < threshold.obese) return 'Overweight';
  return 'Obese';
}

// ============================================
// HEIGHT FOR AGE
// ============================================

/**
 * Get Height-for-Age status
 */
export function getHeightForAgeStatus(height: number, age: number, gender: 'Male' | 'Female'): HFAStatus {
  // WHO height-for-age standards (simplified)
  // These are approximate values for demonstration
  const maleStandards: Record<number, { severelyStunted: number; stunted: number; normal: number; tall: number }> = {
    5: { severelyStunted: 100, stunted: 105, normal: 110, tall: 120 },
    6: { severelyStunted: 105, stunted: 110, normal: 116, tall: 126 },
    7: { severelyStunted: 110, stunted: 116, normal: 122, tall: 132 },
    8: { severelyStunted: 115, stunted: 121, normal: 128, tall: 138 },
    9: { severelyStunted: 120, stunted: 127, normal: 134, tall: 144 },
    10: { severelyStunted: 125, stunted: 133, normal: 140, tall: 150 },
    11: { severelyStunted: 131, stunted: 139, normal: 147, tall: 157 },
    12: { severelyStunted: 137, stunted: 145, normal: 154, tall: 164 },
    13: { severelyStunted: 143, stunted: 152, normal: 161, tall: 171 },
    14: { severelyStunted: 149, stunted: 158, normal: 168, tall: 178 },
    15: { severelyStunted: 154, stunted: 163, normal: 173, tall: 183 },
    16: { severelyStunted: 157, stunted: 166, normal: 176, tall: 186 },
    17: { severelyStunted: 159, stunted: 168, normal: 178, tall: 188 },
    18: { severelyStunted: 160, stunted: 169, normal: 179, tall: 189 },
    19: { severelyStunted: 160, stunted: 169, normal: 179, tall: 189 }
  };

  const femaleStandards: Record<number, { severelyStunted: number; stunted: number; normal: number; tall: number }> = {
    5: { severelyStunted: 99, stunted: 104, normal: 109, tall: 119 },
    6: { severelyStunted: 104, stunted: 109, normal: 115, tall: 125 },
    7: { severelyStunted: 109, stunted: 115, normal: 121, tall: 131 },
    8: { severelyStunted: 114, stunted: 120, normal: 127, tall: 137 },
    9: { severelyStunted: 119, stunted: 126, normal: 133, tall: 143 },
    10: { severelyStunted: 125, stunted: 132, normal: 140, tall: 150 },
    11: { severelyStunted: 131, stunted: 139, normal: 147, tall: 157 },
    12: { severelyStunted: 138, stunted: 146, normal: 154, tall: 164 },
    13: { severelyStunted: 143, stunted: 151, normal: 159, tall: 169 },
    14: { severelyStunted: 146, stunted: 154, normal: 162, tall: 172 },
    15: { severelyStunted: 148, stunted: 156, normal: 164, tall: 174 },
    16: { severelyStunted: 149, stunted: 157, normal: 165, tall: 175 },
    17: { severelyStunted: 149, stunted: 157, normal: 165, tall: 175 },
    18: { severelyStunted: 149, stunted: 157, normal: 165, tall: 175 },
    19: { severelyStunted: 149, stunted: 157, normal: 165, tall: 175 }
  };

  const standards = gender === 'Male' ? maleStandards : femaleStandards;
  const standard = standards[age] || standards[10];

  if (height < standard.severelyStunted) return 'Severely Stunted';
  if (height < standard.stunted) return 'Stunted';
  if (height < standard.tall) return 'Normal';
  return 'Tall';
}

// ============================================
// GROWTH STATUS
// ============================================

/**
 * Determine growth status for feeding program
 */
export function getGrowthStatus(
  baselineBmiStatus: BMIStatus,
  currentBmiStatus: BMIStatus,
  currentBmi: number
): GrowthStatus {
  // If current BMI status is obese or overweight, it's overdone
  if (currentBmiStatus === 'Obese' || currentBmiStatus === 'Overweight') {
    return 'Overdone';
  }

  // Define severity levels (lower number = worse condition)
  const statusLevels: Record<string, number> = {
    'Severely Wasted': 1,
    'Wasted': 2,
    'Underweight': 3,
    'Normal': 4,
    'Overweight': 5,
    'Obese': 6
  };

  const baselineLevel = statusLevels[baselineBmiStatus] || 0;
  const currentLevel = statusLevels[currentBmiStatus] || 0;

  // If improved towards normal
  if (currentLevel > baselineLevel && currentLevel <= 4) {
    return 'Improve';
  }

  // If no improvement or declined
  if (currentLevel <= baselineLevel) {
    return 'No/Decline Improvement';
  }

  // If became overweight/obese from a wasted state
  if (currentLevel > 4) {
    return 'Overdone';
  }

  return 'No Change';
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate LRN format
 */
export function isValidLRN(lrn: string): boolean {
  // LRN should be 12 digits
  return /^\d{12}$/.test(lrn);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format name (capitalize first letter of each word)
 */
export function formatName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get full name from name parts
 */
export function getFullName(firstName: string, middleName: string | undefined, lastName: string): string {
  const parts = [firstName];
  if (middleName) parts.push(middleName);
  parts.push(lastName);
  return parts.join(' ');
}

/**
 * Get grade label
 */
export function getGradeLabel(gradeLevel: number): string {
  return gradeLevel === 0 ? 'Kinder' : `Grade ${gradeLevel}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Get unique values from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// ============================================
// CLASS NAME UTILITIES
// ============================================

/**
 * Conditionally join class names
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get BMI status color class
 */
export function getBMIStatusColor(status: BMIStatus): string {
  switch (status) {
    case 'Severely Wasted':
      return 'bg-red-100 text-red-800';
    case 'Wasted':
      return 'bg-orange-100 text-orange-800';
    case 'Underweight':
      return 'bg-yellow-100 text-yellow-800';
    case 'Normal':
      return 'bg-green-100 text-green-800';
    case 'Overweight':
      return 'bg-purple-100 text-purple-800';
    case 'Obese':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get HFA status color class
 */
export function getHFAStatusColor(status: HFAStatus): string {
  switch (status) {
    case 'Severely Stunted':
      return 'bg-red-100 text-red-800';
    case 'Stunted':
      return 'bg-orange-100 text-orange-800';
    case 'Normal':
      return 'bg-green-100 text-green-800';
    case 'Tall':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get growth status color class
 */
export function getGrowthStatusColor(status: GrowthStatus): string {
  switch (status) {
    case 'Improve':
      return 'bg-green-100 text-green-800';
    case 'Overdone':
      return 'bg-orange-100 text-orange-800';
    case 'No/Decline Improvement':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

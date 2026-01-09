// Application Constants
export const APP_NAME = 'GROWTHetect';
export const APP_VERSION = '1.0.0';

// Base URLs
export const BASE_URL = '/capstone';
export const API_URL = `${BASE_URL}/backend/api`;
export const AUTH_URL = `${BASE_URL}/backend/auth`;
export const UPLOADS_PATH = `${BASE_URL}/uploads`;

// Date and Time
export const DATE_FORMAT = 'Y-m-d';
export const DATETIME_FORMAT = 'Y-m-d H:i:s';
export const DISPLAY_DATE_FORMAT = 'MMMM d, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMMM d, yyyy h:mm a';

// Pagination
export const RECORDS_PER_PAGE = 50;

// BMI Status Categories
export const BMI_CATEGORIES = {
  'Severely Wasted': { min: 0, max: 16, color: 'red' },
  'Wasted': { min: 16, max: 18.5, color: 'yellow' },
  'Normal': { min: 18.5, max: 25, color: 'green' },
  'Overweight': { min: 25, max: 30, color: 'orange' },
  'Obese': { min: 30, max: 100, color: 'red' },
};

// Grade Levels
export const GRADE_LEVELS = [1, 2, 3, 4, 5, 6];

// Roles
export const ROLE_NUTRITIONIST = 'nutritionist';
export const ROLE_ADMINISTRATOR = 'administrator';

// Session Configuration
export const SESSION_TIMEOUT = 3600; // 1 hour in seconds

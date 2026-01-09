# PHP to Next.js Conversion Guide

This document outlines the conversion process and remaining work for converting the PHP GROWTHetect application to Next.js.

## Completed Conversions

### ✅ Core Infrastructure
- [x] Next.js project setup with TypeScript
- [x] Tailwind CSS configuration
- [x] Database connection utilities (mysql2)
- [x] Authentication system (JWT with cookies)
- [x] Helper functions conversion
- [x] Constants conversion
- [x] Login API route
- [x] Signup API route
- [x] Logout API route
- [x] Login page component

## Remaining Work

### 🔄 API Routes to Convert

All routes in `backend/api/` need to be converted:

1. **BMI Records** (`bmi_records.php`)
   - GET: Fetch BMI records with filters
   - POST: Create new BMI record
   - Convert MySQLi queries to mysql2 promises

2. **Students** (`students.php`)
   - GET: List/search students
   - POST: Create student
   - PUT: Update student
   - DELETE: Delete student

3. **Dashboard** (`dashboard.php`)
   - GET: Dashboard statistics
   - Nutritionist dashboard data
   - Administrator dashboard data

4. **Feeding Program** (`feeding_program.php`)
   - GET: List programs, beneficiaries, eligible students
   - POST: Create/update program
   - DELETE: Delete program
   - Enrollment management

5. **Reports** (`reports.php`)
   - GET: List reports
   - POST: Create report
   - PUT: Update report
   - DELETE: Delete report

6. **Generate PDF** (`generate_pdf.php`)
   - POST: Generate PDF report
   - Consider using a Node.js PDF library (pdfkit, puppeteer)

7. **Generate Feeding Report** (`generate_feeding_report.php`)
   - POST: Generate feeding program report

8. **View Report** (`view_report.php`)
   - GET: View report details

9. **Download Report** (`download_report.php`)
   - GET: Download report file

10. **Update Report** (`update_report.php`)
    - POST: Update report status

11. **Update Profile** (`update_profile.php`)
    - POST: Update user profile

12. **Change Password** (`change_password.php`)
    - POST: Change user password

13. **Deactivate Account** (`deactivate_account.php`)
    - POST: Deactivate user account

14. **IoT Sensor** (`iot_sensor.php`)
    - GET/POST: IoT sensor data handling

15. **Test Connection** (`test_connection.php`)
    - GET: Test database connection

### 🔄 Pages to Convert

All pages in `src/` need to be converted:

1. **Login** (`login.php`) - ✅ DONE
2. **Signup** (`signup.php`)
3. **Nutritionist Overview** (`nutritionist_overview.php`)
4. **Admin Dashboard** (`Admin_dashboard.php`)
5. **BMI Tracking** (`bmi_tracking.php`)
6. **Data Logs** (`data_logs.php`)
7. **Student Registration** (`student_registration.php`)
8. **Feeding Program** (`feeding_program.php`)
9. **Reports** (`reports.php`)
10. **Monthly Record** (`monthly_record.php`)
11. **Nutritionist Profile** (`nutritionist_profile.php`)
12. **Admin Profile** (`admin_profile.php`)

### 🔄 Components to Convert

1. **Nutritionist Sidebar** (`includes/nutritionist_sidebar.php`)
   - Convert to React component
   - Handle navigation
   - User profile display
   - Logout functionality

2. **Admin Sidebar** (`includes/admin_sidebar.php`)
   - Convert to React component
   - Handle navigation
   - User profile display
   - Logout functionality

3. **Utils** (`includes/utils.js`)
   - Convert to TypeScript
   - Update API base URLs

## Conversion Patterns

### PHP Session → JWT Authentication

**PHP:**
```php
session_start();
$_SESSION['user_id'] = $user['id'];
```

**Next.js:**
```typescript
import { createToken, setAuthCookie } from '@/lib/auth';
const token = createToken(user);
setAuthCookie(token, response);
```

### MySQLi → mysql2

**PHP:**
```php
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
```

**Next.js:**
```typescript
import { getDBConnection } from '@/lib/db';
const conn = await getDBConnection();
const [rows]: any = await conn.execute(
  'SELECT * FROM users WHERE id = ?',
  [id]
);
const user = rows[0];
```

### PHP Page → Next.js Page

**PHP:**
```php
<?php
session_start();
require_once '../config/database.php';
// ... PHP code ...
?>
<!DOCTYPE html>
<html>
  <!-- HTML -->
</html>
```

**Next.js:**
```typescript
'use client'; // or 'use server' for server components
import { useEffect, useState } from 'react';
// ... React component ...
export default function Page() {
  // Component code
}
```

### API Route Conversion

**PHP:**
```php
<?php
header('Content-Type: application/json');
$data = $_POST;
echo json_encode(['success' => true, 'data' => $data]);
?>
```

**Next.js:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ success: true, data: body });
}
```

## File Structure Mapping

| PHP Location | Next.js Location |
|-------------|------------------|
| `src/login.php` | `app/login/page.tsx` |
| `src/nutritionist_overview.php` | `app/nutritionist-overview/page.tsx` |
| `src/Admin_dashboard.php` | `app/admin-dashboard/page.tsx` |
| `backend/api/*.php` | `app/api/*/route.ts` |
| `backend/auth/*.php` | `app/api/auth/*/route.ts` |
| `config/database.php` | `lib/db.ts` |
| `config/helpers.php` | `lib/helpers.ts` |
| `config/constants.php` | `lib/constants.ts` |
| `includes/*.php` | `components/*.tsx` |

## Environment Variables

Create `.env.local`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=growthetect_db
DB_PORT=3306
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

## Testing Checklist

- [ ] Login functionality
- [ ] Signup functionality
- [ ] Authentication middleware
- [ ] Database queries
- [ ] API endpoints
- [ ] Page routing
- [ ] Form submissions
- [ ] File uploads (if applicable)
- [ ] PDF generation
- [ ] Session management

## Notes

- All PHP sessions are replaced with JWT tokens in HTTP-only cookies
- MySQLi is replaced with mysql2 promise-based client
- Server-side rendering can be used where appropriate
- Client-side components use 'use client' directive
- API routes are in `app/api/` directory
- Pages are in `app/` directory with route-based structure

## Next Steps

1. Convert remaining API routes one by one
2. Convert pages starting with most used (dashboard, BMI tracking)
3. Convert sidebar components
4. Test each conversion thoroughly
5. Update any hardcoded paths
6. Test authentication flow end-to-end
7. Deploy and test in production environment

# GROWTHetect - Next.js Conversion

This is the Next.js version of the GROWTHetect application, converted from PHP.

## Features

- Student Growth Monitoring
- BMI Tracking
- Feeding Program Management
- Report Generation
- Administrator Dashboard
- Nutritionist Dashboard

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL (using mysql2)
- **Authentication**: JWT with HTTP-only cookies
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=growthetect_db
DB_PORT=3306
JWT_SECRET=your-secret-key-change-in-production
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
next.js_capstone_convertion/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── auth/         # Authentication endpoints
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── nutritionist-overview/  # Nutritionist dashboard
│   └── admin-dashboard/   # Admin dashboard
├── components/            # React components
│   ├── NutritionistSidebar.tsx
│   └── AdminSidebar.tsx
├── lib/                   # Utilities and helpers
│   ├── db.ts            # Database connection
│   ├── auth.ts          # Authentication utilities
│   ├── helpers.ts       # Helper functions
│   └── constants.ts     # Constants
└── public/               # Static files
```

## Key Differences from PHP Version

1. **Authentication**: Uses JWT tokens stored in HTTP-only cookies instead of PHP sessions
2. **API Routes**: Converted to Next.js API routes in `app/api/`
3. **Pages**: Converted PHP pages to Next.js pages/components
4. **Database**: Uses mysql2 promise-based client instead of mysqli
5. **Type Safety**: Full TypeScript support

## Database

The database schema remains the same as the PHP version. Make sure to:
1. Import your existing database schema
2. Update connection credentials in `.env.local`

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Notes

- This conversion maintains all functionality from the original PHP application
- All API endpoints have been converted to Next.js API routes
- Authentication uses JWT instead of PHP sessions for better scalability
- The UI and styling remain identical to the original

## Development

To continue development:

1. API routes are in `app/api/`
2. Pages are in `app/` directory
3. Components are in `components/` directory
4. Shared utilities are in `lib/` directory

## License

Same as the original project.

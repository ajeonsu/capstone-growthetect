import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GROWTHetect - Your Smart Partner in Student Growth Monitoring',
  description: 'Student growth monitoring and BMI tracking system',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload logo for splash screen */}
        <link rel="preload" href="/logo.png" as="image" />
        {/* Apply dark mode class before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('darkMode')==='true')document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

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
      <body>{children}</body>
    </html>
  );
}

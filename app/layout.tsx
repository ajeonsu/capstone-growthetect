import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GROWTHetect - Your Smart Partner in Student Growth Monitoring',
  description: 'Student growth monitoring and BMI tracking system',
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

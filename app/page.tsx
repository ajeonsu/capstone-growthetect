import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === 'nutritionist') {
      redirect('/nutritionist-overview');
    } else if (user.role === 'administrator') {
      redirect('/admin-dashboard');
    }
  }

  redirect('/login');
}

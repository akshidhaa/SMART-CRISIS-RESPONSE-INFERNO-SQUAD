import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  // Automatically toss the user directly to the overview dashboard
  redirect('/admin/overview');
}

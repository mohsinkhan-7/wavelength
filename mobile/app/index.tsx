import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';

export default function Index() {
  const token = useAuth((s) => s.token);
  const loading = useAuth((s) => s.loading);
  if (loading) return null;
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}

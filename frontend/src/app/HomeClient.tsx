'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from '@/features/dashboard/Dashboard';
import LandingPage from './LandingPage';

export default function HomeClient() {
  const { token, ready, logout } = useAuth();

  if (!ready) return null;

  if (!token) {
    return <LandingPage />;
  }

  return <Dashboard token={token} onLogout={logout} />;
}

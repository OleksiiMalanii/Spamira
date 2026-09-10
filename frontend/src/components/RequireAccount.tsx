import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ErrorNotice, Loading } from './Common';

export function RequireAccount({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} retry={() => void refresh()} />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <div key={user.id}>{children}</div>;
}

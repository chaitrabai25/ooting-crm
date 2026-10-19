import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Role } from '../../types/index.js';
import { BrandLoader } from '../ui/BrandLoader.js';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  requirePlatformMasterAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requirePlatformMasterAdmin }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <BrandLoader size="lg" text="Authenticating..." subtext="Verifying workspace session credentials" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const isMasterAdmin = Boolean(
    user.isPlatformMasterAdmin ||
    (user.role === 'SUPER_ADMIN' && (!user.companyId || user.companyId === 'c0000000-0000-0000-0000-000000000001' || user.company?.isOoting))
  );

  // Check company suspension (fail-closed)
  if (user.company?.status === 'SUSPENDED' && !isMasterAdmin) {
    return <Navigate to="/suspended" replace />;
  }

  if (requirePlatformMasterAdmin && !isMasterAdmin) {
    return (
      <div className="p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Platform Master Admin Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Access to this SaaS Platform infrastructure module is strictly restricted to Root Platform Administrators.
        </p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You do not have permission to view this module.</p>
      </div>
    );
  }

  return <Outlet />;
};

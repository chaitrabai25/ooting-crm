import React from 'react';

/**
 * Reusable Modern Shimmer Pulse Element
 */
export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-200/70 dark:bg-slate-800/60 rounded-lg animate-pulse ${className}`} />
);

/**
 * Professional Package Detail View Skeleton
 * Exactly mirrors the executive layout of PackageDetail.tsx
 */
export const PackageDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1">
          <Shimmer className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1 max-w-md">
            <Shimmer className="h-6 w-3/4 rounded-md" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-4 w-24 rounded-full" />
              <Shimmer className="h-4 w-20 rounded-full" />
              <Shimmer className="h-4 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-36 rounded-lg" />
          <Shimmer className="h-9 w-32 rounded-lg" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* B2B Agency Branding Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 max-w-lg">
          <div className="flex items-center gap-2">
            <Shimmer className="h-4 w-36 rounded-md" />
            <Shimmer className="h-4 w-28 rounded-full" />
          </div>
          <Shimmer className="h-3 w-full rounded" />
          <Shimmer className="h-3 w-4/5 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-8.5 w-36 rounded-lg" />
          <Shimmer className="h-8.5 w-32 rounded-lg" />
        </div>
      </div>

      {/* Overview & Parameters Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <Shimmer className="h-4 w-36 rounded-md" />
          <Shimmer className="h-3 w-full rounded" />
          <Shimmer className="h-3 w-5/6 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <Shimmer className="h-20 rounded-xl" />
            <Shimmer className="h-20 rounded-xl" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <Shimmer className="h-4 w-32 rounded-md" />
          <div className="space-y-2.5 pt-1">
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-4 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Day-by-Day Itinerary Schedule Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Shimmer className="h-5 w-48 rounded-md" />
            <Shimmer className="h-3 w-64 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-8.5 w-24 rounded-lg" />
            <Shimmer className="h-8.5 w-28 rounded-lg" />
          </div>
        </div>

        {/* 3 Structured Day Cards Skeleton */}
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/70 dark:bg-slate-850/60 border-b border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2.5 flex-1">
                <Shimmer className="w-16 h-6 rounded-lg" />
                <Shimmer className="w-48 h-5 rounded-md" />
                <Shimmer className="w-24 h-4 rounded-md" />
              </div>
              <div className="flex items-center gap-1.5">
                <Shimmer className="w-8 h-8 rounded-lg" />
                <Shimmer className="w-8 h-8 rounded-lg" />
                <Shimmer className="w-8 h-8 rounded-lg" />
              </div>
            </div>
            <div className="p-5 space-y-3">
              <Shimmer className="h-14 w-full rounded-xl" />
              <div className="flex items-center gap-2">
                <Shimmer className="h-6 w-36 rounded-lg" />
                <Shimmer className="h-6 w-32 rounded-lg" />
              </div>
              <Shimmer className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Modern Package Grid Skeleton for Catalog & List Directory
 */
export const PackageGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs flex flex-col"
        >
          {/* Hero Banner Skeleton */}
          <Shimmer className="h-52 w-full rounded-none" />
          <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Shimmer className="h-4 w-20 rounded-full" />
                <Shimmer className="h-4 w-24 rounded-full" />
              </div>
              <Shimmer className="h-5 w-4/5 rounded-md" />
              <Shimmer className="h-3.5 w-full rounded" />
              <Shimmer className="h-3.5 w-2/3 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Shimmer className="h-6 w-28 rounded-lg" />
              <Shimmer className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Modern Master Library Skeleton (for Places & Hotels)
 */
export const MasterDirectorySkeleton: React.FC<{ type?: 'place' | 'hotel'; count?: number }> = ({ type = 'place', count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs flex items-start gap-3.5"
        >
          <Shimmer className="w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-28 rounded-md" />
              <Shimmer className="h-3.5 w-14 rounded-full" />
            </div>
            <Shimmer className="h-3 w-36 rounded" />
            <Shimmer className="h-3 w-full rounded" />
            <div className="flex items-center gap-1.5 pt-1">
              <Shimmer className="h-5 w-16 rounded-md" />
              <Shimmer className="h-5 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

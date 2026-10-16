import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  Star,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const SubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/saas/plans');
      setPlans(res.data.plans || []);
    } catch (err: any) {
      notifyError('Failed to Load Plans', err.response?.data?.message || 'Unable to retrieve subscription tiers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Subscription Tiers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase tracking-wider">
              Layer A Tiering
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Subscription Plans & Quota Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure plan tiers, pricing structure, and default staff seat allocations for customer organizations.
          </p>
        </div>

        <button
          onClick={fetchPlans}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition cursor-pointer self-start sm:self-auto"
          title="Refresh Plans"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          let featuresList: string[] = [];
          try {
            featuresList = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
          } catch {
            featuresList = [plan.features];
          }

          const isStandard = plan.tier === 'STANDARD';
          const isEnterprise = plan.tier === 'ENTERPRISE';

          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 bg-white dark:bg-slate-900 border transition shadow-sm relative flex flex-col justify-between ${
                isStandard
                  ? 'border-brand-500 ring-2 ring-brand-500/20 dark:ring-brand-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {isStandard && (
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                  Default Customer Tier (1 Staff)
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <Badge variant={plan.isActive ? 'success' : 'default'} size="sm">
                    {plan.tier}
                  </Badge>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    ₹{plan.priceMonthly.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  or ₹{plan.priceYearly.toLocaleString()} / year (save 20%)
                </div>

                {/* Staff Seat Limits */}
                <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Default Staff Seats:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {plan.defaultStaffLimit} Staff
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-500 font-medium">Max Limit Cap:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {plan.maxStaffLimit >= 9999 ? 'Unlimited' : `${plan.maxStaffLimit} Staff`}
                    </span>
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div className="mt-6 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Included Capabilities
                  </div>
                  {featuresList.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  ID: {plan.id.substring(0, 8)}...
                </span>
                <span className="text-brand-600 dark:text-brand-400 font-semibold text-[11px]">
                  Active in Catalog
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionsPage;

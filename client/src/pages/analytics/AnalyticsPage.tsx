import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Users, MapPin, Percent, DollarSign, Award } from 'lucide-react';
import { api } from '../../api/client.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [dashboardCards, setDashboardCards] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [chartsRes, dashRes] = await Promise.all([
          api.get('/analytics/charts'),
          api.get('/analytics/dashboard'),
        ]);
        setData(chartsRes.data);
        setDashboardCards(dashRes.data.cards || {});
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-white rounded-xl border border-slate-200" />
          <div className="h-72 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  const salesTrend = data?.salesTrend || [];
  const leadFunnel = data?.leadFunnel || [];
  const bookingAnalytics = data?.bookingAnalytics || [];
  const destinationAnalytics = data?.destinationAnalytics || [];
  const staffPerformance = data?.staffPerformance || [];
  const expenseBreakdown = data?.expenseBreakdown || [];

  const PIE_COLORS = ['#C91F28', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-7 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Advanced Business Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Data-driven metrics computed strictly from database transactions, bookings, and receipts.
        </p>
      </div>

      {/* KPI Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Conversion"
          value={`${dashboardCards.conversionRate ?? 0}%`}
          subtitle="Won enquiries / qualified pipeline"
          icon={Percent}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />

        <StatCard
          title="Total Gross Booking Volume"
          value={formatCurrency(dashboardCards.totalRevenue ?? 0)}
          subtitle="Confirmed & completed bookings"
          icon={TrendingUp}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />

        <StatCard
          title="Total Collected Payments"
          value={formatCurrency(dashboardCards.totalCollected ?? 0)}
          subtitle="Actual bank & cash receipts"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(dashboardCards.pendingPayments ?? 0)}
          subtitle="Pending balance due"
          icon={DollarSign}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Monthly Financials (Booking Value vs Receipts vs Expenses) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Financial Trajectory</h3>
          <p className="text-xs text-slate-500 mb-4">Bookings value vs Collected cash vs Operating expenses</p>

          <div className="h-64 w-full">
            {salesTrend.every((s: any) => s.bookingValue === 0 && s.collected === 0 && s.expenses === 0) ? (
              <EmptyState
                title="No financial records"
                description="Monthly trends appear when bookings and payments are recorded."
                className="h-full border-none bg-slate-50/50"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="bookingValue" name="Trip Value" fill="#C91F28" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Destination Popularity & Revenue */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Top Destinations</h3>
          <p className="text-xs text-slate-500 mb-4">Ranked by actual confirmed bookings and generated revenue</p>

          <div className="h-64 w-full">
            {destinationAnalytics.length === 0 ? (
              <EmptyState
                title="No destination data yet"
                description="Top destination analytics calculate automatically from your bookings."
                className="h-full border-none bg-slate-50/50"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destinationAnalytics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="destination"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [
                      name === 'revenue' ? formatCurrency(val) : val,
                      name === 'revenue' ? 'Revenue' : 'Bookings',
                    ]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="bookings" name="Bookings" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Sales Staff Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900">Sales Staff Performance & Conversion</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Individual conversion rates, bookings generated, revenue contribution, and completed client follow-ups.
        </p>

        {staffPerformance.length === 0 ? (
          <EmptyState
            title="No staff users found"
            description="Active staff members will appear here with their sales rankings."
            className="py-6 border-none bg-slate-50/50"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Staff Member</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Leads Assigned</th>
                  <th className="py-2.5 px-3 font-semibold">Leads Won</th>
                  <th className="py-2.5 px-3 font-semibold">Conversion Rate</th>
                  <th className="py-2.5 px-3 font-semibold">Bookings</th>
                  <th className="py-2.5 px-3 font-semibold">Revenue Generated</th>
                  <th className="py-2.5 px-3 font-semibold">Follow-ups Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffPerformance.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-slate-800">{s.name}</td>
                    <td className="py-3 px-3 text-slate-500 uppercase text-[10px] font-semibold">
                      {s.role}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{s.leadsAssigned}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">{s.leadsConverted}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {s.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.bookingsCount}</td>
                    <td className="py-3 px-3 font-bold text-brand-600">
                      {formatCurrency(s.revenue)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {s.followUpsCompleted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

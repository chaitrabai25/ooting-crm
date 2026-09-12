import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Sparkles,
  CalendarCheck,
  BookmarkCheck,
  TrendingUp,
  CreditCard,
  Briefcase,
  Percent,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { StatCard } from '../components/ui/StatCard.js';
import { Badge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const [dashRes, chartsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/charts'),
      ]);
      setDashboardData(dashRes.data);
      setChartData(chartsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (num: number) => {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const cards = dashboardData?.cards || {};
  const recentEnquiries = dashboardData?.recentEnquiries || [];
  const recentBookings = dashboardData?.recentBookings || [];
  const upcomingFollowUps = dashboardData?.upcomingFollowUps || [];
  const salesTrend = chartData?.salesTrend || [];
  const leadFunnel = chartData?.leadFunnel || [];

  const FUNNEL_COLORS = ['#3B82F6', '#6366F1', '#F59E0B', '#A855F7', '#EA580C', '#10B981', '#EF4444', '#64748B'];

  return (
    <div className="space-y-7 pb-12">
      {/* Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getTimeGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time travel operations, sales performance, and pipeline analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/leads')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Leads</span>
          </button>
          <button
            onClick={() => navigate('/bookings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>View Bookings</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid - All Connected to AnimatedCounter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          numericValue={Number(cards.totalLeads) || 0}
          subtitle={`${cards.newLeads ?? 0} uncontacted / new`}
          icon={Sparkles}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600 dark:text-blue-400"
        />

        <StatCard
          title="Follow-ups Today"
          numericValue={Number(cards.followUpsToday) || 0}
          subtitle="Scheduled client calls/meetings"
          icon={CalendarCheck}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="text-amber-600 dark:text-amber-400"
        />

        <StatCard
          title="Confirmed Bookings"
          numericValue={Number(cards.confirmedBookings) || 0}
          subtitle={`${cards.b2bBookings ?? 0} B2B agent bookings`}
          icon={BookmarkCheck}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Conversion Rate"
          numericValue={Number(cards.conversionRate) || 0}
          suffix="%"
          subtitle="Won vs qualified pipeline"
          icon={Percent}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
        />

        <StatCard
          title="Total Booking Value"
          numericValue={Number(cards.totalRevenue) || 0}
          prefix="₹"
          subtitle="From confirmed & completed trips"
          icon={TrendingUp}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="text-[#C91F28] dark:text-rose-400"
        />

        <StatCard
          title="Total Collected"
          numericValue={Number(cards.totalCollected) || 0}
          prefix="₹"
          subtitle="Actual successful receipts"
          icon={CreditCard}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Pending Payments"
          numericValue={Number(cards.pendingPayments) || 0}
          prefix="₹"
          subtitle="Booking value minus collected"
          icon={CreditCard}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="text-rose-600 dark:text-rose-400"
        />

        <StatCard
          title="B2B Bookings"
          numericValue={Number(cards.b2bBookings) || 0}
          subtitle="Agent partner bookings"
          icon={Briefcase}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-700 dark:text-slate-300"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Collection Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue & Payments Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Monthly booking values vs. payments collected</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs font-semibold text-[#C91F28] dark:text-rose-400 hover:text-[#a81920] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {salesTrend.every((s: any) => s.bookingValue === 0 && s.collected === 0) ? (
              <EmptyState
                title="No booking or revenue data yet"
                description="Once confirmed bookings and payments are added to the database, monthly trends will render here automatically."
                className="h-full border-none bg-slate-50/50 dark:bg-slate-800/30"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="bookingValue" name="Booking Value" fill="#C91F28" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Payments Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Funnel Pipeline */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Pipeline Funnel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribution by stage</p>
            </div>
          </div>

          <div className="h-64 w-full flex flex-col justify-center">
            {leadFunnel.every((l: any) => l.count === 0) ? (
              <EmptyState
                title="No enquiries in database"
                description="Add your first customer enquiry to see the pipeline breakdown."
                className="h-full border-none bg-slate-50/50 dark:bg-slate-800/30"
              />
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
                {leadFunnel
                  .filter((l: any) => l.count > 0)
                  .map((item: any, idx: number) => {
                    const total = cards.totalLeads || 1;
                    const pct = Math.round((item.count / total) * 100);
                    return (
                      <div key={item.status} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.status.replace('_', ' ')}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Upcoming Follow-ups & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's & Upcoming Follow-ups */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Follow-ups</h3>
            <button
              onClick={() => navigate('/followups')}
              className="text-xs font-semibold text-[#C91F28] dark:text-rose-400 hover:text-[#a81920] cursor-pointer"
            >
              View All
            </button>
          </div>

          {upcomingFollowUps.length === 0 ? (
            <EmptyState
              title="No upcoming follow-ups"
              description="No client follow-ups currently pending. Great job staying up to date!"
              className="py-8 border-none bg-slate-50/50 dark:bg-slate-800/30"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingFollowUps.map((f: any) => (
                <div key={f.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {f.lead?.customer?.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>{new Date(f.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold text-[#C91F28] dark:text-rose-400 ml-1">({f.type})</span>
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/leads/${f.leadId}`)}
                    className="p-1 rounded-md text-slate-400 hover:text-[#C91F28] dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Enquiries</h3>
            <button
              onClick={() => navigate('/leads')}
              className="text-xs font-semibold text-[#C91F28] dark:text-rose-400 hover:text-[#a81920] cursor-pointer"
            >
              View All
            </button>
          </div>

          {recentEnquiries.length === 0 ? (
            <EmptyState
              title="No leads recorded"
              description="Customer enquiries will appear here as soon as they are entered."
              className="py-8 border-none bg-slate-50/50 dark:bg-slate-800/30"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentEnquiries.map((l: any) => (
                <div
                  key={l.id}
                  onClick={() => navigate(`/leads/${l.id}`)}
                  className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/80 px-1 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {l.customer?.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>{l.destination}</span>
                    </p>
                  </div>
                  <Badge status={l.enquiryStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Bookings</h3>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs font-semibold text-[#C91F28] dark:text-rose-400 hover:text-[#a81920] cursor-pointer"
            >
              View All
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <EmptyState
              title="No bookings recorded"
              description="Converted bookings will show here with their live payment status."
              className="py-8 border-none bg-slate-50/50 dark:bg-slate-800/30"
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentBookings.map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/80 px-1 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {b.bookingNumber} — {b.customer?.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {formatCurrency(b.finalAmount)}
                    </p>
                  </div>
                  <Badge status={b.bookingStatus} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;

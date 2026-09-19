import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Sparkles,
  CalendarCheck,
  BookmarkCheck,
  FileText,
  Car,
  Plane,
  CreditCard,
  Briefcase,
  TrendingUp,
  Percent,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  Search,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { AnimatedCounter } from '../components/ui/AnimatedCounter.js';
import { Badge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedView, setSelectedView] = useState<'today' | 'month' | 'year' | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Today's Tasks Active Tab
  const [activeTaskTab, setActiveTaskTab] = useState<'followUps' | 'overdue' | 'departures' | 'cabs' | 'quotations'>('followUps');

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('range', selectedView);
      if (selectedView === 'month') {
        params.append('month', String(selectedMonth));
        params.append('year', String(selectedYear));
      } else if (selectedView === 'year') {
        params.append('year', String(selectedYear));
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const [dashRes, chartsRes] = await Promise.all([
        api.get(`/analytics/dashboard${queryString}`),
        api.get(`/analytics/charts${queryString}`),
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
    const handler = setTimeout(() => {
      fetchDashboard();
    }, 250);
    return () => clearTimeout(handler);
  }, [selectedView, selectedMonth, selectedYear, searchTerm]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((i) => (
            <div
              key={i}
              className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const cards = dashboardData?.cards || {};
  const todaysTasks = dashboardData?.todaysTasks || {
    todayFollowUps: [],
    overdueFollowUps: [],
    todayDepartures: [],
    todayCabs: [],
    expiringQuotations: [],
  };

  const salesTrend = chartData?.salesTrend || [];
  const leadFunnel = chartData?.leadFunnel || [];
  const bookingAnalytics = chartData?.bookingAnalytics || [];
  const quotationAnalytics = chartData?.quotationAnalytics || [];
  const cabAnalytics = chartData?.cabAnalytics || [];

  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {getTimeGreeting()}, {user?.name || 'Partner'} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time operations, confirmed bookings, tourist cabs, and task schedule for Ooting Holidays.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/quotations/new')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-purple-600" />
            <span>New Quotation</span>
          </button>

          <button
            onClick={() => navigate('/cabs?action=create')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#C91F28]" />
            <span>New Cab Booking</span>
          </button>
        </div>
      </div>

      {/* 4 View Tabs & Real-Time Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* 4 View Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedView('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedView === 'today'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Today's Update
            </button>
            <button
              onClick={() => setSelectedView('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedView === 'month'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Month-wise Update
            </button>
            <button
              onClick={() => setSelectedView('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedView === 'year'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Year-wise Update
            </button>
            <button
              onClick={() => setSelectedView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedView === 'all'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All-Time Record
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads, bookings, cabs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Month / Year Sub-pickers when applicable */}
        {(selectedView === 'month' || selectedView === 'year') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            {selectedView === 'month' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <option key={idx} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold ml-2">
              Showing strictly {selectedView === 'month' ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} ${selectedYear}` : `Calendar Year ${selectedYear}`} (IST Timezone)
            </span>
          </div>
        )}
      </div>

      {/* 16 KPI COUNTING CARDS */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Executive KPIs & Metrics (16 Core Counting Cards)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Leads */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leads</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.totalLeads || 0} />
            </div>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
              {cards.newLeads || 0} New Enquiries
            </span>
          </div>

          {/* 2. Active / In-Progress Leads */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Leads</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.inProgressLeads || 0} />
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
              In Follow-up Pipeline
            </span>
          </div>

          {/* 3. Won Leads */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Won Leads</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              <AnimatedCounter value={cards.wonLeads || 0} />
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {cards.conversionRate || 0}% Conversion Rate
            </span>
          </div>

          {/* 4. Total Quotations */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quotations</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.totalQuotations || 0} />
            </div>
            <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">
              {cards.acceptedQuotations || 0} Accepted / Booked
            </span>
          </div>

          {/* 5. Confirmed Tour Bookings */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confirmed Bookings</span>
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600">
                <BookmarkCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.confirmedBookings || 0} />
            </div>
            <span className="text-[10px] text-brand-600 font-semibold block mt-0.5">
              Total {cards.totalBookings || 0} Created
            </span>
          </div>

          {/* 6. Total Customers */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Customers</span>
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.totalCustomers || 0} />
            </div>
            <span className="text-[10px] text-teal-600 font-semibold block mt-0.5">
              Verified Profiles
            </span>
          </div>

          {/* 7. Total Cab Bookings */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Cabs</span>
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.totalCabs || 0} />
            </div>
            <span className="text-[10px] text-cyan-600 font-semibold block mt-0.5">
              {cards.activeCabs || 0} Active / Confirmed
            </span>
          </div>

          {/* 8. Today's Tour Departures */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Departures Today</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">
              <AnimatedCounter value={cards.departuresToday || 0} />
            </div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              Tour Groups On Road
            </span>
          </div>

          {/* 9. Today's Cab Pickups */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cabs Today</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#C91F28]">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#C91F28] mt-2">
              <AnimatedCounter value={todaysTasks.todayCabs.length || 0} />
            </div>
            <span className="text-[10px] text-[#C91F28] font-semibold block mt-0.5">
              Pickups Scheduled
            </span>
          </div>

          {/* 10. Today's Follow-ups */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calls Today</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2">
              <AnimatedCounter value={cards.followUpsToday || 0} />
            </div>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
              Scheduled for Today
            </span>
          </div>

          {/* 11. Overdue Calls */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Follow-ups</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2">
              <AnimatedCounter value={todaysTasks.overdueFollowUps.length || 0} />
            </div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
              Requires Urgent Attention
            </span>
          </div>

          {/* 12. Expiring Quotations */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Open Quotes</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">
              <AnimatedCounter value={todaysTasks.expiringQuotations.length || 0} />
            </div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              Older Than 5 Days
            </span>
          </div>

          {/* 13. Total Revenue (₹) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
              ₹<AnimatedCounter value={cards.totalRevenue || 0} />
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Tours + Cab Operations
            </span>
          </div>

          {/* 14. Advance Collected (₹) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Advance Collected</span>
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-teal-700 dark:text-teal-400 mt-2">
              ₹<AnimatedCounter value={cards.totalCollected || 0} />
            </div>
            <span className="text-[10px] text-teal-600 font-semibold block mt-0.5">
              Verified in Bank/UPI
            </span>
          </div>

          {/* 15. Balance Due (₹) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance Pending</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#C91F28]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-[#C91F28] mt-2">
              ₹<AnimatedCounter value={cards.pendingPayments || 0} />
            </div>
            <span className="text-[10px] text-[#C91F28] font-semibold block mt-0.5">
              Receivable from Guests
            </span>
          </div>

          {/* 16. Active B2B Agents */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">B2B Agent Network</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              <AnimatedCounter value={cards.b2bBookings || 0} />
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
              Partner Agency Bookings
            </span>
          </div>
        </div>
      </div>

      {/* TODAY'S TASKS INTERACTIVE PANEL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C91F28]" />
              Today's Priority Operational Tasks
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live operational tasks requiring action today. Click tabs to switch categories.
            </p>
          </div>

          {/* Task Category Tabs with Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTaskTab('followUps')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTaskTab === 'followUps'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Today's Calls</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {todaysTasks.todayFollowUps.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTaskTab('overdue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTaskTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Overdue Calls</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {todaysTasks.overdueFollowUps.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTaskTab('departures')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTaskTab === 'departures'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Tour Departures</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {todaysTasks.todayDepartures.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTaskTab('cabs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTaskTab === 'cabs'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Cab Pickups</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {todaysTasks.todayCabs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTaskTab('quotations')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTaskTab === 'quotations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>Expiring Quotes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {todaysTasks.expiringQuotations.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content List */}
        <div className="p-4">
          {activeTaskTab === 'followUps' && (
            <div className="space-y-2">
              {todaysTasks.todayFollowUps.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No pending follow-up calls scheduled for today! 🎉
                </div>
              ) : (
                todaysTasks.todayFollowUps.map((fu: any) => (
                  <div
                    key={fu.id}
                    onClick={() => navigate(`/leads/${fu.leadId}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {fu.lead?.customer?.fullName || 'Client'} ({fu.lead?.customer?.phone})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {fu.type} • Scheduled for {new Date(fu.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {fu.assignedUser?.name && ` • In-charge: ${fu.assignedUser.name}`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTaskTab === 'overdue' && (
            <div className="space-y-2">
              {todaysTasks.overdueFollowUps.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No overdue follow-up calls. Good job team! 👏
                </div>
              ) : (
                todaysTasks.overdueFollowUps.map((fu: any) => (
                  <div
                    key={fu.id}
                    onClick={() => navigate(`/leads/${fu.leadId}`)}
                    className="p-3 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/20 hover:bg-rose-50/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {fu.lead?.customer?.fullName || 'Client'} ({fu.lead?.customer?.phone})
                        </span>
                        <span className="text-[11px] text-rose-600 font-semibold">
                          Overdue since {new Date(fu.scheduledAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTaskTab === 'departures' && (
            <div className="space-y-2">
              {todaysTasks.todayDepartures.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No tour package departures scheduled for today.
                </div>
              ) : (
                todaysTasks.todayDepartures.map((b: any) => (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Plane className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {b.customer?.fullName} • {b.package?.packageName || 'Tour Package'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Booking #{b.bookingNumber} • Travellers: {b.travellers}
                        </span>
                      </div>
                    </div>
                    <Badge status={b.bookingStatus} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTaskTab === 'cabs' && (
            <div className="space-y-2">
              {todaysTasks.todayCabs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No tourist cab pickups scheduled for today.
                </div>
              ) : (
                todaysTasks.todayCabs.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/cabs/${c.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                        <Car className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {c.customerName} ({c.pickupPlace} ➔ {c.dropPlace})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Pickup: {c.pickupTime} • Car: {c.carNumber || 'To assign'} • Ref: {c.bookingReference}
                        </span>
                      </div>
                    </div>
                    <Badge status={c.bookingStatus} />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTaskTab === 'quotations' && (
            <div className="space-y-2">
              {todaysTasks.expiringQuotations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No expiring quotations pending follow-up.
                </div>
              ) : (
                todaysTasks.expiringQuotations.map((q: any) => (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {q.quotationNumber} • {q.customer?.fullName} ({q.destination})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Amount: ₹{Number(q.finalAmount).toLocaleString('en-IN')} • Sent on {new Date(q.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <Badge status={q.status} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ANALYTICS CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue & Booking Trend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              Monthly Revenue & Booking Performance
            </h3>
            <span className="text-[11px] text-slate-400">Last 6 Months</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'revenue' ? `₹${Number(val).toLocaleString('en-IN')}` : val,
                    name === 'revenue' ? 'Revenue (₹)' : 'Confirmed Bookings',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                <Bar dataKey="bookings" fill="#10B981" radius={[4, 4, 0, 0]} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Pipeline & Funnel Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Enquiry Pipeline Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Conversion Funnel</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadFunnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} name="Total Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

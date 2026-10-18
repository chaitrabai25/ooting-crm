import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Users,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Car,
  FileText,
  Plus,
  RefreshCw,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { TourAssignment } from '../../types/index.js';

export const GuideDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<{
    todayAssignments: TourAssignment[];
    inProgressAssignments: TourAssignment[];
    upcomingAssignments: TourAssignment[];
    stats: {
      totalGuides: number;
      activeGuides: number;
      todayTours: number;
      inProgressTours: number;
    };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignmentForProgress, setSelectedAssignmentForProgress] = useState<TourAssignment | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('IN_PROGRESS');
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [checkInStatus, setCheckInStatus] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/guides/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load guide dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForProgress) return;
    setIsUpdatingProgress(true);

    try {
      await api.patch(`/guides/assignments/${selectedAssignmentForProgress.id}/progress`, {
        status: progressStatus,
        progressNotes,
        checkInStatus,
      });
      setSelectedAssignmentForProgress(null);
      fetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update progress.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-60" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalGuides: 0,
    activeGuides: 0,
    todayTours: 0,
    inProgressTours: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Tour Operations & Guide Command
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time field operations, guide rosters, today's tour manifests, and reporting times
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchDashboard}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            title="Refresh Operations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/guides/availability')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Availability Roster</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/guides/assignments?action=assign')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Guide</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Field Guides"
          value={`${stats.activeGuides} / ${stats.totalGuides}`}
          subtitle="Ready for duty"
          icon={Users}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Today's Tours"
          value={stats.todayTours}
          subtitle="Departures scheduled today"
          icon={Clock}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          title="Tours In Progress"
          value={stats.inProgressTours}
          subtitle="On the road right now"
          icon={Compass}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Upcoming (Next 7 Days)"
          value={dashboardData?.upcomingAssignments?.length || 0}
          subtitle="Planned excursions"
          icon={Calendar}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Today's Tours & Real-Time Reporting Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Today's Tours & Active Reporting
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {(!dashboardData?.todayAssignments || dashboardData.todayAssignments.length === 0) ? (
          <EmptyState
            title="No tour departures scheduled for today"
            description="All active guides are standby or on upcoming schedules."
            className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData.todayAssignments.map((asg) => (
              <div
                key={asg.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-850/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {asg.assignmentCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        asg.status === 'IN_PROGRESS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : asg.status === 'CONFIRMED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      }`}
                    >
                      {asg.status}
                    </span>
                  </div>
                  {asg.reportingTime && (
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reporting: {asg.reportingTime}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{asg.tourName}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {asg.destination}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {asg.passengerCount} Pax
                    </span>
                    {asg.customer && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {asg.customer.organizationName || asg.customer.fullName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Primary Guide Card with Emergency Call / WhatsApp Shortcut */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-600 font-bold flex items-center justify-center text-xs">
                      {asg.primaryGuide?.fullName?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {asg.primaryGuide?.fullName}
                        <span className="font-mono font-normal text-slate-400 text-[10px] ml-1">
                          ({asg.primaryGuide?.guideCode})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">{asg.primaryGuide?.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${asg.primaryGuide?.phone}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Call Guide"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                    <a
                      href={`https://wa.me/${asg.primaryGuide?.phone?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="WhatsApp Guide"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </a>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssignmentForProgress(asg);
                      setProgressStatus(asg.status);
                      setProgressNotes(asg.progressNotes || '');
                      setCheckInStatus(asg.checkInStatus || '');
                    }}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Update Field Progress</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/guides/assignments/${asg.id}/manifest`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
                      title="Manage Tour & Passenger Expenses"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Expenses</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/guides/assignments/${asg.id}/manifest`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Manifest</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Tours (Next 7 Days) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" />
          <span>Upcoming Departures (Next 7 Days)</span>
        </h3>

        {(!dashboardData?.upcomingAssignments || dashboardData.upcomingAssignments.length === 0) ? (
          <p className="text-xs text-slate-500 py-3">No upcoming departures scheduled in the next 7 days.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dashboardData.upcomingAssignments.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate(`/guides/assignments/${u.id}/manifest`)}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 px-2 rounded-lg cursor-pointer transition-colors text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{u.assignmentCode}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{u.tourName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dates: {new Date(u.startDate).toLocaleDateString()} to {new Date(u.endDate).toLocaleDateString()} • Guide: {u.primaryGuide?.fullName} • {u.passengerCount} Pax
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {u.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Progress Modal */}
      {selectedAssignmentForProgress && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Update Tour Progress: {selectedAssignmentForProgress.assignmentCode}
                </h3>
                <p className="text-xs text-slate-500">{selectedAssignmentForProgress.tourName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignmentForProgress(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateProgressSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tour Status</label>
                <select
                  value={progressStatus}
                  onChange={(e) => setProgressStatus(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                >
                  <option value="ASSIGNED">Assigned</option>
                  <option value="CONFIRMED">Confirmed by Guide</option>
                  <option value="IN_PROGRESS">In Progress (Tour Running)</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Check-in Milestone</label>
                <select
                  value={checkInStatus}
                  onChange={(e) => setCheckInStatus(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                >
                  <option value="">Select Milestone...</option>
                  <option value="REPORTED_AT_BASE">Reported at Base</option>
                  <option value="GUESTS_PICKED_UP">Guests Picked Up</option>
                  <option value="EN_ROUTE_DESTINATION">En Route to Destination</option>
                  <option value="HOTEL_CHECKED_IN">Hotel Checked In</option>
                  <option value="SIGHTSEEING_ACTIVE">Sightseeing Active</option>
                  <option value="TOUR_CONCLUDED">Tour Safely Concluded</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Progress Notes / Field Update</label>
                <textarea
                  rows={3}
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="e.g. Guests arrived on time, vehicle departed for Coorg at 08:30 AM..."
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAssignmentForProgress(null)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProgress}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isUpdatingProgress ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

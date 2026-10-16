import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Compass,
  AlertCircle,
  X,
  Trash2,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { TourGuide, GuideAvailability, GuideType } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';

interface RosterAssignment {
  id: string;
  assignmentCode: string;
  destination?: string;
  groupName?: string;
  startDate: string;
  endDate: string;
  status: string;
  passengerCount?: number;
}

interface RosterGuide extends Omit<TourGuide, 'primaryAssignments' | 'secondaryAssignments'> {
  availabilities: GuideAvailability[];
  primaryAssignments: RosterAssignment[];
  secondaryAssignments: RosterAssignment[];
}

export const GuideAvailabilityPage: React.FC = () => {
  const navigate = useNavigate();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-12

  const [guides, setGuides] = useState<RosterGuide[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<number>(31);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');

  // Block Dates Modal
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string>('');
  const [blockStartDate, setBlockStartDate] = useState<string>('');
  const [blockEndDate, setBlockEndDate] = useState<string>('');
  const [blockStatus, setBlockStatus] = useState<string>('LEAVE');
  const [blockReason, setBlockReason] = useState<string>('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  const fetchRoster = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/guides/roster', {
        params: {
          year: currentYear,
          month: currentMonth,
        },
      });
      setGuides(res.data.guides || []);
      setDaysInMonth(res.data.daysInMonth || 30);
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to load guide availability roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  const handleOpenBlockModal = (guideId?: string, dayNumber?: number) => {
    setSelectedGuideId(guideId || (guides.length > 0 ? guides[0].id : ''));
    if (dayNumber) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const dStr = `${currentYear}-${pad(currentMonth)}-${pad(dayNumber)}`;
      setBlockStartDate(dStr);
      setBlockEndDate(dStr);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setBlockStartDate(todayStr);
      setBlockEndDate(todayStr);
    }
    setBlockStatus('LEAVE');
    setBlockReason('');
    setIsBlockModalOpen(true);
  };

  const handleSubmitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuideId || !blockStartDate || !blockEndDate) {
      alert('Please select guide and dates.');
      return;
    }

    try {
      setIsSubmittingBlock(true);
      await api.post(`/guides/${selectedGuideId}/availability`, {
        startDate: blockStartDate,
        endDate: blockEndDate,
        status: blockStatus,
        reason: blockReason,
      });
      setIsBlockModalOpen(false);
      fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to block guide dates.');
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleDeleteBlock = async (guideId: string, availId: string) => {
    if (!window.confirm('Are you sure you want to remove this leave/block period?')) return;
    try {
      await api.delete(`/guides/${guideId}/availability/${availId}`);
      fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove block.');
    }
  };

  // Helper: check if a specific day is within a date range
  const isDateInDay = (day: number, startStr: string, endStr: string): boolean => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const current = new Date(currentYear, currentMonth - 1, day, 12, 0, 0);
    const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
    const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
    return current >= sDate && current <= eDate;
  };

  const parseLanguages = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim());
    }
    return [];
  };

  // Unique languages for filter
  const allLanguages = Array.from(
    new Set(
      guides.flatMap((g) => parseLanguages(g.languages)).filter(Boolean)
    )
  ).sort();

  // Filtered guides
  const filteredGuides = guides.filter((g) => {
    if (selectedType !== 'ALL' && g.guideType !== selectedType) return false;
    if (selectedLanguage !== 'ALL') {
      const langs = parseLanguages(g.languages);
      if (!langs.includes(selectedLanguage)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = g.fullName?.toLowerCase().includes(q);
      const matchCode = g.guideCode?.toLowerCase().includes(q);
      const matchPhone = g.phone?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone) return false;
    }
    return true;
  });

  // Calculate Today's Stats
  const todayDay = now.getDate();
  const isViewingCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  let guidesOnTourToday = 0;
  let guidesOnLeaveToday = 0;

  if (isViewingCurrentMonth) {
    guides.forEach((g) => {
      const hasTour = [...g.primaryAssignments, ...g.secondaryAssignments].some((a) =>
        isDateInDay(todayDay, a.startDate, a.endDate)
      );
      if (hasTour) {
        guidesOnTourToday++;
      } else {
        const hasLeave = g.availabilities.some((av) =>
          isDateInDay(todayDay, av.startDate, av.endDate)
        );
        if (hasLeave) guidesOnLeaveToday++;
      }
    });
  }

  const guidesAvailableToday = Math.max(0, guides.length - guidesOnTourToday - guidesOnLeaveToday);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Guide Availability & Roster
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational guide schedules, tour allocations, and leave blocks across all field personnel
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-32 text-center">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => handleOpenBlockModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Guide Dates</span>
          </button>
        </div>
      </div>

      {/* Roster Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Tour Guides"
          value={guides.length}
          icon={Users}
          subtitle="Registered field personnel"
        />
        <StatCard
          title="Guides On Tour Today"
          value={guidesOnTourToday}
          icon={Compass}
          subtitle="Assigned & leading trips"
        />
        <StatCard
          title="Guides On Leave Today"
          value={guidesOnLeaveToday}
          icon={Clock}
          subtitle="Roster unavailable / leave"
        />
        <StatCard
          title="Available Today"
          value={guidesAvailableToday}
          icon={CheckCircle2}
          subtitle="Ready for tour dispatch"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search guide name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Guide Types</option>
            <option value="INTERNAL">Internal / Full-Time</option>
            <option value="FREELANCE">Freelance</option>
            <option value="CONTRACT">Contract / Agency</option>
          </select>

          {/* Language Filter */}
          {allLanguages.length > 0 && (
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Languages</option>
              {allLanguages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-brand-600 shrink-0" />
            <span>On Tour</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
            <span>Leave / Blocked</span>
          </div>
        </div>
      </div>

      {/* Roster Calendar Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Loading monthly roster matrix...
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No guides found matching your active filters.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              {/* Header row: Guide Info + Days 1..N */}
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 w-60 border-r border-slate-200 dark:border-slate-700">
                    Guide Name & Details
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isToday =
                      isViewingCurrentMonth && day === todayDay;
                    const dateObj = new Date(currentYear, currentMonth - 1, day);
                    const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    return (
                      <th
                        key={day}
                        className={`text-center py-1.5 px-0.5 border-r border-slate-100 dark:border-slate-800/80 min-w-8 ${
                          isToday
                            ? 'bg-brand-500 text-white font-black'
                            : isWeekend
                            ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-600'
                            : ''
                        }`}
                      >
                        <span className="block text-[8px] opacity-80">{dayLetter}</span>
                        <span className="text-[11px] font-bold">{day}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredGuides.map((guide) => {
                  const assignments = [...guide.primaryAssignments, ...guide.secondaryAssignments];
                  const availabilities = guide.availabilities || [];

                  return (
                    <tr key={guide.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                      {/* Sticky Guide Profile Cell */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="truncate pr-1">
                            <span
                              onClick={() => navigate(`/guides/${guide.id}`)}
                              className="font-bold text-slate-900 dark:text-white hover:text-brand-600 cursor-pointer block truncate"
                              title={guide.fullName}
                            >
                              {guide.fullName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[9px] font-bold text-slate-400">
                                {guide.guideCode}
                              </span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-medium">
                                {guide.guideType}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenBlockModal(guide.id)}
                            className="p-1 text-slate-400 hover:text-brand-600 rounded"
                            title="Block dates for this guide"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Day Cells 1..N */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const isToday = isViewingCurrentMonth && day === todayDay;

                        // Check Tour Assignment
                        const activeTour = assignments.find((a) =>
                          isDateInDay(day, a.startDate, a.endDate)
                        );

                        // Check Leave / Block
                        const activeBlock = availabilities.find((av) =>
                          isDateInDay(day, av.startDate, av.endDate)
                        );

                        return (
                          <td
                            key={day}
                            className={`p-0.5 text-center border-r border-slate-100 dark:border-slate-800/80 h-10 ${
                              isToday ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                            }`}
                          >
                            {activeTour ? (
                              <div
                                onClick={() => navigate(`/guides/assignments/${activeTour.id}/manifest`)}
                                className="w-full h-full min-h-8 rounded bg-brand-600 hover:bg-brand-700 text-white flex flex-col items-center justify-center cursor-pointer p-0.5 transition-all shadow-2xs"
                                title={`Tour: ${activeTour.assignmentCode} (${activeTour.destination || 'On Tour'})\nClick to view Tour Manifest`}
                              >
                                <Compass className="w-3 h-3 shrink-0" />
                                <span className="text-[8px] font-bold truncate max-w-7 block">
                                  Tour
                                </span>
                              </div>
                            ) : activeBlock ? (
                              <div
                                onClick={() => handleDeleteBlock(guide.id, activeBlock.id)}
                                className={`w-full h-full min-h-8 rounded flex flex-col items-center justify-center p-0.5 transition-all cursor-pointer ${
                                  activeBlock.status === 'BLOCKED'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                                }`}
                                title={`${activeBlock.status}: ${activeBlock.reason || 'Leave'}\nClick to remove block`}
                              >
                                <span className="text-[8px] font-bold block truncate max-w-7">
                                  {activeBlock.status === 'BLOCKED' ? 'Block' : 'Leave'}
                                </span>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleOpenBlockModal(guide.id, day)}
                                className="w-full h-full min-h-8 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-center cursor-pointer group"
                                title="Available. Click to block date or mark leave"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Block Guide Dates */}
      {isBlockModalOpen && (
        <Modal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          title="Block Guide Dates / Mark Leave"
        >
          <form onSubmit={handleSubmitBlock} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Tour Guide *
              </label>
              <select
                required
                value={selectedGuideId}
                onChange={(e) => setSelectedGuideId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Guide --</option>
                {guides.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName} ({g.guideCode}) - {g.guideType}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={blockStartDate}
                  onChange={(e) => setBlockStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={blockEndDate}
                  onChange={(e) => setBlockEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Status Type
              </label>
              <select
                value={blockStatus}
                onChange={(e) => setBlockStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="LEAVE">On Leave / Vacation</option>
                <option value="BLOCKED">Admin Blocked / Reserved</option>
                <option value="UNAVAILABLE">Unavailable (Medical/Personal)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Internal Note
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Annual leave, family function, health emergency"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingBlock}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSubmittingBlock ? 'Saving...' : 'Apply Dates'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

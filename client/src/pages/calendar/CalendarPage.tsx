import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Users,
  Car,
  Plane,
  Phone,
  CheckCircle2,
  AlertCircle,
  Filter,
  Eye,
  Trash2,
  CheckSquare,
  Activity,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Badge } from '../../components/ui/Badge.js';
import { CalendarEvent, StaffWorkload } from '../../types/index.js';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [staffWorkload, setStaffWorkload] = useState<StaffWorkload[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // New event modal
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState('TASK');
  const [newEventStartDate, setNewEventStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newEventStartTime, setNewEventStartTime] = useState('10:00');
  const [newEventPriority, setNewEventPriority] = useState('MEDIUM');
  const [newEventUserId, setNewEventUserId] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate range dates for current view
  const getDateRange = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      // Pad to full weeks
      const start = new Date(firstDay);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(lastDay);
      end.setDate(end.getDate() + (6 - end.getDay()));
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      // Agenda: 30 days ahead
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      params.append('startDate', start.toISOString());
      params.append('endDate', end.toISOString());
      if (selectedEventType) params.append('eventType', selectedEventType);
      if (selectedStaffId) params.append('userId', selectedStaffId);

      const res = await api.get(`/calendar/events?${params.toString()}`);
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffAvailability = async () => {
    try {
      const res = await api.get('/calendar/staff-availability');
      setStaffWorkload(res.data || []);
    } catch (err) {
      console.error('Failed to fetch staff availability:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, selectedEventType, selectedStaffId]);

  useEffect(() => {
    fetchStaffAvailability();
  }, []);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 30);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 30);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const startDateTime = new Date(`${newEventStartDate}T${newEventStartTime || '09:00'}:00`);

      await api.post('/calendar/events', {
        title: newEventTitle.trim(),
        eventType: newEventType,
        startDate: startDateTime.toISOString(),
        priority: newEventPriority,
        userId: newEventUserId || null,
        description: newEventDescription.trim() || null,
      });

      setIsNewEventModalOpen(false);
      setNewEventTitle('');
      setNewEventDescription('');
      fetchEvents();
      fetchStaffAvailability();
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!id.startsWith('cal-')) return;
    const realId = id.replace('cal-', '');
    try {
      await api.delete(`/calendar/events/${realId}`);
      setSelectedEvent(null);
      fetchEvents();
      fetchStaffAvailability();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'FOLLOW_UP':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'DEPARTURE':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'CAB_TRIP':
        return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 'MEETING':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'TASK':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'FOLLOW_UP':
        return <Phone className="w-3 h-3 shrink-0 text-amber-600" />;
      case 'DEPARTURE':
        return <Plane className="w-3 h-3 shrink-0 text-purple-600" />;
      case 'CAB_TRIP':
        return <Car className="w-3 h-3 shrink-0 text-cyan-600" />;
      case 'MEETING':
        return <Users className="w-3 h-3 shrink-0 text-blue-600" />;
      default:
        return <CheckSquare className="w-3 h-3 shrink-0 text-emerald-600" />;
    }
  };

  // Render month grid days
  const renderMonthGrid = () => {
    const { start, end } = getDateRange();
    const days: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const todayStr = new Date().toDateString();
    const currentMonth = currentDate.getMonth();

    return (
      <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border-r border-b border-slate-200 dark:border-slate-800"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day, idx) => {
          const isToday = day.toDateString() === todayStr;
          const isCurrentMonth = day.getMonth() === currentMonth;

          // Events on this day
          const dayEvents = events.filter((e) => {
            const eDate = new Date(e.startDate);
            return (
              eDate.getFullYear() === day.getFullYear() &&
              eDate.getMonth() === day.getMonth() &&
              eDate.getDate() === day.getDate()
            );
          });

          return (
            <div
              key={idx}
              className={`min-h-[105px] sm:min-h-[120px] p-1.5 border-r border-b border-slate-200 dark:border-slate-800 transition-colors flex flex-col justify-between ${
                !isCurrentMonth
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-400'
                  : 'bg-white dark:bg-slate-900'
              } ${isToday ? 'ring-2 ring-brand-500 ring-inset z-10' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    isToday
                      ? 'bg-brand-600 text-white font-bold'
                      : isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {dayEvents.length} {dayEvents.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>

              {/* Event pills (up to 3, then +more) */}
              <div className="space-y-1 overflow-y-auto max-h-[85px]">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate cursor-pointer flex items-center gap-1 hover:opacity-85 ${getEventBadgeColor(
                      e.eventType
                    )}`}
                    title={e.title}
                  >
                    {getEventIcon(e.eventType)}
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode('day');
                    }}
                    className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold cursor-pointer pl-1 hover:underline"
                  >
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Agenda / List view
  const renderAgendaView = () => {
    if (events.length === 0) {
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No events or reminders scheduled for this period.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {events.map((e) => (
          <div
            key={e.id}
            onClick={() => setSelectedEvent(e)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                {getEventIcon(e.eventType)}
              </div>
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                  {e.title}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>
                    {new Date(e.startDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>{new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {e.meta?.assignedTo && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">Assigned: {e.meta.assignedTo}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge status={e.eventType} />
              <Badge status={e.status} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-600" />
            CRM Calendar & Operations Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unified view of lead follow-ups, tour package departures, cab pickups, and staff availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewEventModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task / Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Staff Availability on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Calendar (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Calendar Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Month / Year & Prev/Next */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Today
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 ml-1">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            {/* View Mode Switchers & Event Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Event Types</option>
                <option value="FOLLOW_UP">Follow-ups</option>
                <option value="DEPARTURE">Tour Departures</option>
                <option value="CAB_TRIP">Cab Pickups</option>
                <option value="TASK">Tasks & Reminders</option>
                <option value="MEETING">Meetings</option>
              </select>

              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(['month', 'agenda'] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                      viewMode === mode
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar View Area */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              Loading calendar events...
            </div>
          ) : viewMode === 'month' ? (
            renderMonthGrid()
          ) : (
            renderAgendaView()
          )}
        </div>

        {/* Right Column: Staff Workload & Availability (1 col) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-600" />
                Staff Availability
              </h3>
              <span className="text-[10px] text-slate-400">Live Active</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Real-time workload metrics across leads, follow-ups, tour departures, and cab duties.
            </p>

            <div className="space-y-3 pt-1">
              {staffWorkload.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No active staff found</div>
              ) : (
                staffWorkload.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStaffId(selectedStaffId === s.id ? '' : s.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedStaffId === s.id
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{s.role}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          s.availability === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : s.availability === 'BUSY'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {s.availability}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-center">
                      <div>
                        <span className="text-slate-400 block">Leads</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {s.metrics.activeLeads}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Calls</span>
                        <span className="font-bold text-amber-600">
                          {s.metrics.todayFollowUps}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cabs</span>
                        <span className="font-bold text-cyan-600">
                          {s.metrics.upcomingCabs}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Event Details"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {getEventIcon(selectedEvent.eventType)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedEvent.title}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Type: {selectedEvent.eventType.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <Badge status={selectedEvent.status} />
            </div>

            {selectedEvent.description && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedEvent.description}
              </div>
            )}

            <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedEvent.startDate).toLocaleString('en-IN')}
                </span>
              </div>

              {selectedEvent.meta?.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedEvent.meta.customerName} ({selectedEvent.meta.customerPhone})
                  </span>
                </div>
              )}

              {selectedEvent.meta?.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Staff In-Charge:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedEvent.meta.assignedTo}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              {selectedEvent.source === 'CALENDAR_EVENT' ? (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEvent.source === 'FOLLOW_UP') {
                      navigate(`/leads/${selectedEvent.meta?.leadId}`);
                    } else if (selectedEvent.source === 'BOOKING') {
                      navigate(`/bookings/${selectedEvent.refId}`);
                    } else if (selectedEvent.source === 'CAB_BOOKING') {
                      navigate(`/cabs/${selectedEvent.refId}`);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg font-semibold hover:bg-brand-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Source Record</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Event Modal */}
      {isNewEventModalOpen && (
        <Modal
          isOpen={isNewEventModalOpen}
          onClose={() => setIsNewEventModalOpen(false)}
          title="Create Calendar Task or Reminder"
          maxWidth="md"
        >
          <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="e.g. Call Client about Coonoor Hotel or Staff Review"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Event Type
                </label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="TASK">Task</option>
                  <option value="REMINDER">Reminder</option>
                  <option value="MEETING">Meeting</option>
                  <option value="LEAVE">Leave / Absence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newEventPriority}
                  onChange={(e) => setNewEventPriority(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newEventStartDate}
                  onChange={(e) => setNewEventStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newEventStartTime}
                  onChange={(e) => setNewEventStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign Staff Member
              </label>
              <select
                value={newEventUserId}
                onChange={(e) => setNewEventUserId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">-- Current User / Unassigned --</option>
                {staffWorkload.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                placeholder="Add details, contact points, or checklist..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsNewEventModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add Event'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

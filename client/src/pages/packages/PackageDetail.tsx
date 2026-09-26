import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Save,
  Printer,
  Camera,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { ItineraryDay } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';

export const PackageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, isSuperAdmin } = useAuth();

  const [pkg, setPkg] = useState<any>(null);
  const [itineraries, setItineraries] = useState<ItineraryDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add/Edit Day Modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isSavingDay, setIsSavingDay] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [dayTitle, setDayTitle] = useState('');
  const [dayDescription, setDayDescription] = useState('');
  const [dayPlaces, setDayPlaces] = useState('');
  const [dayActivities, setDayActivities] = useState('');
  const [dayStartTime, setDayStartTime] = useState('');
  const [dayEndTime, setDayEndTime] = useState('');
  const [dayImageUrl, setDayImageUrl] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPackage = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/packages/' + id);
      setPkg(res.data);
      setItineraries(res.data.itineraries || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load package:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = async () => {
    try {
      setIsDeleting(true);
      await api.delete('/packages/' + id);
      navigate('/packages');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete package.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  useEffect(() => {
    if (id) fetchPackage();
  }, [id]);

  const openAddDay = () => {
    setDayIndex(null);
    setDayNumber(itineraries.length + 1);
    setDayTitle(`Day ${itineraries.length + 1}: `);
    setDayDescription('');
    setDayPlaces('');
    setDayActivities('');
    setDayStartTime('09:00 AM');
    setDayEndTime('06:00 PM');
    setDayImageUrl('');
    setIsDayModalOpen(true);
  };

  const openEditDay = (index: number) => {
    const item = itineraries[index];
    setDayIndex(index);
    setDayNumber(item.dayNumber);
    setDayTitle(item.title);
    setDayDescription(item.description);
    setDayPlaces(item.places || '');
    setDayActivities(item.activities || '');
    setDayStartTime(item.startTime || '');
    setDayEndTime(item.endTime || '');
    setDayImageUrl(item.imageUrl || '');
    setIsDayModalOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Selected photo exceeds 15 MB. Please select a smaller photo.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setDayImageUrl(res.data.url);
        setIsUploadingImage(false);
        return;
      }
    } catch (uploadErr) {
      console.warn('Server upload not reachable, using optimized client compression...', uploadErr);
    }

    // Client-side canvas compression fallback (scales to max 800px JPEG quality 0.75, always < 40KB)
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setDayImageUrl(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          setDayImageUrl(reader.result as string);
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        setDayImageUrl(reader.result as string);
        setIsUploadingImage(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDayModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDay(true);

    try {
      const newDay: ItineraryDay = {
        dayNumber: Number(dayNumber) || 1,
        title: dayTitle.trim() || `Day ${dayNumber}`,
        description: dayDescription.trim(),
        places: dayPlaces.trim() || null,
        activities: dayActivities.trim() || null,
        startTime: dayStartTime.trim() || null,
        endTime: dayEndTime.trim() || null,
        imageUrl: dayImageUrl.trim() || null,
      };

      let updated = [...itineraries];
      if (dayIndex !== null) {
        updated[dayIndex] = newDay;
      } else {
        updated.push(newDay);
      }
      // Re-sort by dayNumber
      updated.sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));

      // Sanitize days payload for database
      const sanitizedDays = updated.map((d, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        startTime: d.startTime?.trim() || null,
        endTime: d.endTime?.trim() || null,
        imageUrl: d.imageUrl?.trim() || null,
        images: d.images ? (typeof d.images === 'string' ? d.images : JSON.stringify(d.images)) : null,
      }));

      // Directly persist to database so changes are never lost!
      const res = await api.post('/packages/' + id + '/itineraries', { days: sanitizedDays });
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      } else {
        setItineraries(updated);
      }

      setHasUnsavedChanges(false);
      setIsDayModalOpen(false);
      showToast(dayIndex !== null ? 'Day itinerary updated successfully!' : 'Day itinerary added successfully!');
    } catch (err: any) {
      console.error('Failed to save day itinerary:', err);
      alert(err.response?.data?.message || 'Failed to save itinerary changes to database.');
    } finally {
      setIsSavingDay(false);
    }
  };

  const handleDeleteDay = async (index: number) => {
    const targetDay = itineraries[index];
    const confirmMsg = `Are you sure you want to delete ${targetDay?.title || `Day ${targetDay?.dayNumber || index + 1}`} from the itinerary?`;
    if (!window.confirm(confirmMsg)) return;

    const updated = itineraries.filter((_, i) => i !== index);
    setItineraries(updated);
    setIsSaving(true);

    try {
      const sanitizedDays = updated.map((d, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        startTime: d.startTime?.trim() || null,
        endTime: d.endTime?.trim() || null,
        imageUrl: d.imageUrl?.trim() || null,
        images: d.images ? (typeof d.images === 'string' ? d.images : JSON.stringify(d.images)) : null,
      }));

      const res = await api.post('/packages/' + id + '/itineraries', { days: sanitizedDays });
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      }
      setHasUnsavedChanges(false);
      showToast('Itinerary day removed and updated in database!');
    } catch (err: any) {
      console.error('Failed to delete itinerary day:', err);
      alert(err.response?.data?.message || 'Failed to save itinerary changes.');
      fetchPackage();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePersistItineraries = async () => {
    setIsSaving(true);
    try {
      const sanitizedDays = itineraries.map((d, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        startTime: d.startTime?.trim() || null,
        endTime: d.endTime?.trim() || null,
        imageUrl: d.imageUrl?.trim() || null,
        images: d.images ? (typeof d.images === 'string' ? d.images : JSON.stringify(d.images)) : null,
      }));

      const res = await api.post('/packages/' + id + '/itineraries', { days: sanitizedDays });
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      }
      setHasUnsavedChanges(false);
      showToast('Itinerary changes saved successfully to database!');
    } catch (err: any) {
      console.error('Failed to persist itineraries:', err);
      alert(err.response?.data?.message || 'Failed to save itinerary changes to database.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-48 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Package record not found.</p>
        <button
          onClick={() => navigate('/packages')}
          className="mt-3 text-xs font-semibold text-[#C91F28] hover:underline"
        >
          Return to Packages
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/packages')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{pkg.packageName}</h1>
              <Badge status={pkg.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{pkg.destination}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{pkg.duration}</span>
              <span>•</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{Number(pkg.price).toLocaleString('en-IN')} / person
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/packages/' + id + '/itinerary-pdf')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#C91F28]" />
            <span>Download Itinerary PDF</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handlePersistItineraries}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-400/50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving...' : 'Save Itinerary'}</span>
          </button>

          {(isSuperAdmin || can('packages', 'delete')) && (
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 rounded-xl border border-red-200 dark:border-red-800 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Package Description & Inclusions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
            Overview & Experience
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {pkg.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Inclusions</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                {pkg.inclusions || 'No standard inclusions specified.'}
              </p>
            </div>

            <div>
              <span className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1 mb-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Exclusions</span>
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
                {pkg.exclusions || 'No exclusions specified.'}
              </p>
            </div>
          </div>
        </div>

        {/* Highlights & Metadata */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Package Parameters
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Tour Type:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.packageType}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Duration:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.duration}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Standard Price:</span>
              <span className="font-bold text-[#C91F28]">
                ₹{Number(pkg.price).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Itinerary Days:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{itineraries.length} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day-by-Day Itinerary Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Day-by-Day Itinerary Schedule</h3>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700 animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organized chronological travel schedule and daily route stops
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePersistItineraries}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold ring-2 ring-amber-400/50'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } disabled:opacity-50`}
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Itinerary'}</span>
            </button>
            <button
              type="button"
              onClick={openAddDay}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day</span>
            </button>
          </div>
        </div>

        {itineraries.length === 0 ? (
          <div className="py-12 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No itinerary days added yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click "+ Add Day" to start structuring the day-by-day travel schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {itineraries.map((day, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-850/40 transition-colors flex flex-col md:flex-row items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-[#C91F28] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                    D{day.dayNumber}
                  </div>

                  <div className="space-y-1.5 text-xs flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{day.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {day.description}
                    </p>

                    {(day.places || day.activities) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {day.places && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#C91F28]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{day.places}</span>
                          </div>
                        )}
                        {day.activities && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{day.activities}</span>
                          </div>
                        )}
                        {(day.startTime || day.endTime) && (
                          <span className="text-[#C91F28] font-medium">
                            {day.startTime} - {day.endTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Day Image Preview if attached */}
                {day.imageUrl && (
                  <div className="w-36 h-24 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 shadow-2xs">
                    <img
                      src={day.imageUrl}
                      alt={day.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 flex-shrink-0 self-end md:self-start">
                  <button
                    type="button"
                    onClick={() => openEditDay(idx)}
                    title="Edit Day"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(idx)}
                    title="Remove Day"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Day Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={dayIndex !== null ? `Edit Day ${dayNumber}` : `Add Day ${dayNumber}`}
        subtitle="Configure daily activities, sightseeing, timing, and photo"
        maxWidth="md"
      >
        <form onSubmit={handleSaveDayModal} className="space-y-4 text-xs max-h-[78vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Day # *</label>
              <input
                type="number"
                min="1"
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="font-semibold text-slate-700">Day Title *</label>
              <input
                type="text"
                required
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder="e.g. Arrival in Ooty & Botanical Gardens"
                className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Description of the Day *</label>
            <textarea
              rows={3}
              required
              value={dayDescription}
              onChange={(e) => setDayDescription(e.target.value)}
              placeholder="Detail morning pickup, sightseeing route, lunch stops, and evening relaxation..."
              className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          {/* Photo upload / URL */}
          <div>
            <label className="font-semibold text-slate-700">Day Photo (URL or File Upload)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={dayImageUrl}
                onChange={(e) => setDayImageUrl(e.target.value)}
                placeholder="https://... or choose photo"
                className="flex-1 p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
              <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer border border-slate-300 flex items-center gap-1.5 transition-colors">
                {isUploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C91F28]" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {dayImageUrl && (
              <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={dayImageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDayImageUrl('')}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700">Places to Visit</label>
            <input
              type="text"
              value={dayPlaces}
              onChange={(e) => setDayPlaces(e.target.value)}
              placeholder="e.g. Mysore Palace, Chamundi Hills, Brindavan Gardens"
              className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Activities & Highlights</label>
            <input
              type="text"
              value={dayActivities}
              onChange={(e) => setDayActivities(e.target.value)}
              placeholder="e.g. Boating, heritage walk, sunset tea tasting"
              className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Start Time</label>
              <input
                type="text"
                value={dayStartTime}
                onChange={(e) => setDayStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">End Time</label>
              <input
                type="text"
                value={dayEndTime}
                onChange={(e) => setDayEndTime(e.target.value)}
                placeholder="06:00 PM"
                className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={isSavingDay}
              onClick={() => setIsDayModalOpen(false)}
              className="px-3.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingDay || isUploadingImage}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSavingDay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isSavingDay
                  ? 'Saving to Database...'
                  : dayIndex !== null
                  ? 'Update & Save Day'
                  : 'Add & Save Day'}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeletePackage}
        title="Delete Travel Package"
        message={`Are you sure you want to delete the package "${pkg?.packageName}"? This will remove the package and all its day itineraries. This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Package'}
        isDanger={true}
      />
    </div>
  );
};

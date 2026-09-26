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
  ArrowUp,
  ArrowDown,
  Star,
  Info,
  Upload,
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

  interface DayImageItem {
    url: string;
    label?: string;
  }

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
  const [dayDate, setDayDate] = useState('');
  const [dayHighlights, setDayHighlights] = useState('');
  const [dayTravelDetails, setDayTravelDetails] = useState('');
  const [dayStartTime, setDayStartTime] = useState('');
  const [dayEndTime, setDayEndTime] = useState('');
  const [dayImageUrl, setDayImageUrl] = useState('');
  const [dayImages, setDayImages] = useState<DayImageItem[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');

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
    setDayDate('');
    setDayHighlights('');
    setDayTravelDetails('');
    setDayStartTime('09:00 AM');
    setDayEndTime('06:00 PM');
    setDayImageUrl('');
    setDayImages([]);
    setNewImageUrlInput('');
    setIsDayModalOpen(true);
  };

  const openEditDay = (index: number) => {
    const item: any = itineraries[index];
    setDayIndex(index);
    setDayNumber(item.dayNumber);
    setDayTitle(item.title);
    setDayDescription(item.description);
    setDayPlaces(item.places || '');
    setDayActivities(item.activities || '');
    setDayDate(item.date || '');
    setDayHighlights(item.highlights || '');
    setDayTravelDetails(item.travelDetails || '');
    setDayStartTime(item.startTime || '');
    setDayEndTime(item.endTime || '');
    setDayImageUrl(item.imageUrl || '');
    setNewImageUrlInput('');

    let parsedImages: DayImageItem[] = [];
    if (item.images) {
      try {
        const parsed = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
        if (Array.isArray(parsed)) {
          parsedImages = parsed
            .map((p: any) => {
              if (typeof p === 'string') return { url: p, label: '' };
              return { url: p.url || p.imageUrl || '', label: p.label || p.name || p.placeName || '' };
            })
            .filter((p) => Boolean(p.url));
        }
      } catch {
        if (typeof item.images === 'string' && item.images.includes(',')) {
          parsedImages = item.images
            .split(',')
            .map((s: string) => ({ url: s.trim(), label: '' }))
            .filter((p: any) => Boolean(p.url));
        }
      }
    }
    if (parsedImages.length === 0 && item.imageUrl) {
      parsedImages = [{ url: item.imageUrl, label: item.places || '' }];
    }
    setDayImages(parsedImages);
    setIsDayModalOpen(true);
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const added: DayImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 15 MB and was skipped.`);
        continue;
      }

      let uploadedUrl = '';
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          uploadedUrl = res.data.url;
        }
      } catch (err) {
        console.warn('Server upload not reachable, using client compression...', err);
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxDim = 1200;
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
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              } else {
                resolve(reader.result as string);
              }
            };
            img.onerror = () => resolve(reader.result as string);
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
      }

      if (uploadedUrl) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        added.push({
          url: uploadedUrl,
          label: cleanName.length < 35 ? cleanName : '',
        });
      }
    }

    if (added.length > 0) {
      setDayImages((prev) => [...prev, ...added]);
    }
    setIsUploadingImage(false);
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!newImageUrlInput.trim()) return;
    setDayImages((prev) => [...prev, { url: newImageUrlInput.trim(), label: '' }]);
    setNewImageUrlInput('');
  };

  const handleMoveImage = (fromIdx: number, direction: 'up' | 'down') => {
    setDayImages((prev) => {
      const targetIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[fromIdx];
      copy[fromIdx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setDayImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const handleRemoveImage = (index: number) => {
    setDayImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageLabelChange = (index: number, label: string) => {
    setDayImages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], label };
      return copy;
    });
  };

  const handleSaveDayModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDay(true);

    try {
      const primaryUrl = dayImages[0]?.url || dayImageUrl.trim() || null;
      const imagesJson = dayImages.length > 0 ? JSON.stringify(dayImages) : null;

      const newDay: ItineraryDay | any = {
        dayNumber: Number(dayNumber) || 1,
        title: dayTitle.trim() || `Day ${dayNumber}`,
        description: dayDescription.trim(),
        places: dayPlaces.trim() || null,
        activities: dayActivities.trim() || null,
        date: dayDate.trim() || null,
        highlights: dayHighlights.trim() || null,
        travelDetails: dayTravelDetails.trim() || null,
        startTime: dayStartTime.trim() || null,
        endTime: dayEndTime.trim() || null,
        imageUrl: primaryUrl,
        images: imagesJson,
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
      const sanitizedDays = updated.map((d: any, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        date: d.date?.trim() || null,
        highlights: d.highlights?.trim() || null,
        travelDetails: d.travelDetails?.trim() || null,
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
      const sanitizedDays = updated.map((d: any, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        date: d.date?.trim() || null,
        highlights: d.highlights?.trim() || null,
        travelDetails: d.travelDetails?.trim() || null,
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
      const sanitizedDays = itineraries.map((d: any, idx) => ({
        dayNumber: Number(d.dayNumber) || (idx + 1),
        title: (d.title || `Day ${idx + 1}`).trim(),
        description: (d.description || '').trim(),
        places: d.places?.trim() || null,
        activities: d.activities?.trim() || null,
        date: d.date?.trim() || null,
        highlights: d.highlights?.trim() || null,
        travelDetails: d.travelDetails?.trim() || null,
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

                    {(day.places || day.activities || (day as any).date || (day as any).highlights || (day as any).travelDetails) && (
                      <div className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-3">
                          {(day as any).date && (
                            <div className="flex items-center gap-1 text-[#C91F28] font-bold">
                              <Calendar className="w-3 h-3 text-[#C91F28]" />
                              <span>{(day as any).date}</span>
                            </div>
                          )}
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
                        {(day as any).highlights && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Highlights: </span>
                            <span>{(day as any).highlights}</span>
                          </div>
                        )}
                        {(day as any).travelDetails && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Travel & Logistics: </span>
                            <span>{(day as any).travelDetails}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Day Photo Gallery Preview */}
                {(() => {
                  let photos: { url: string; label?: string }[] = [];
                  if ((day as any).images) {
                    try {
                      const parsed = JSON.parse((day as any).images);
                      if (Array.isArray(parsed)) {
                        photos = parsed
                          .map((p: any) => ({
                            url: typeof p === 'string' ? p : p.url || p.imageUrl || '',
                            label: typeof p === 'string' ? '' : p.label || p.name || p.placeName || '',
                          }))
                          .filter((p) => Boolean(p.url));
                      }
                    } catch {}
                  }
                  if (photos.length === 0 && day.imageUrl) {
                    photos = [{ url: day.imageUrl, label: day.places || '' }];
                  }

                  if (photos.length === 0) return null;

                  return (
                    <div className="flex flex-wrap gap-2 max-w-xs shrink-0 self-start">
                      {photos.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="w-24 flex flex-col bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <div className="h-16 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                            <img
                              src={p.url}
                              alt={p.label || `Day ${day.dayNumber} photo ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {p.label && (
                            <span className="p-1 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium truncate block text-center bg-slate-50 dark:bg-slate-850">
                              {p.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex items-center gap-1 flex-shrink-0 self-end md:self-start">
                  <button
                    type="button"
                    onClick={() => openEditDay(idx)}
                    title="Edit Day"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(idx)}
                    title="Remove Day"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Day Modal with Multi-Image Support */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={dayIndex !== null ? `Edit Day ${dayNumber}` : `Add Day ${dayNumber}`}
        subtitle="Configure daily schedule, multiple sightseeing photos, place captions, and travel logistics"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveDayModal} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Day #, Day Title, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Day # *</label>
              <input
                type="number"
                min="1"
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Day Title *</label>
              <input
                type="text"
                required
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder="e.g. Arrival in Ooty & Botanical Gardens"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none font-semibold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Date (Optional)</label>
              <input
                type="text"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                placeholder="e.g. 15 Oct 2026"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Description of the Day *</label>
            <textarea
              rows={3}
              required
              value={dayDescription}
              onChange={(e) => setDayDescription(e.target.value)}
              placeholder="Detail morning pickup, sightseeing route, lunch stops, and evening relaxation..."
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          {/* Places & Activities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Places to Visit</label>
              <input
                type="text"
                value={dayPlaces}
                onChange={(e) => setDayPlaces(e.target.value)}
                placeholder="e.g. Mysore Palace, Chamundi Hills, Brindavan Gardens"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Activities & Highlights</label>
              <input
                type="text"
                value={dayActivities}
                onChange={(e) => setDayActivities(e.target.value)}
                placeholder="e.g. Boating, heritage walk, sunset tea tasting"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          {/* Highlights summary & Travel Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Key Highlights (Short)</label>
              <input
                type="text"
                value={dayHighlights}
                onChange={(e) => setDayHighlights(e.target.value)}
                placeholder="e.g. Royal Palace Light Show, Tea Factory Visit"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Travel & Logistics Details</label>
              <input
                type="text"
                value={dayTravelDetails}
                onChange={(e) => setDayTravelDetails(e.target.value)}
                placeholder="e.g. Private AC Sedan Transfer from Coimbatore (3.5 hrs)"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
              <input
                type="text"
                value={dayStartTime}
                onChange={(e) => setDayStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">End Time</label>
              <input
                type="text"
                value={dayEndTime}
                onChange={(e) => setDayEndTime(e.target.value)}
                placeholder="06:00 PM"
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          {/* MULTI-IMAGE SIGHTSEEING GALLERY SECTION */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#C91F28]" />
                  <span>Sightseeing Photos & Destination Gallery (Multiple Images)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Upload multiple photos for this day. Give each image a place name label underneath.
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md self-start sm:self-auto">
                {dayImages.length} {dayImages.length === 1 ? 'photo' : 'photos'} added
              </span>
            </div>

            {/* Recommended Image Size Banner */}
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Recommended Photo Resolution & Sizing:</span>
                <p className="text-blue-800 dark:text-blue-300">
                  Landscape: <strong>1600 × 1000 px</strong> (16:10 ratio) • Portrait: <strong>1500 × 2400 px</strong> (5:8 ratio) • Formats: <strong>JPG, PNG, WebP</strong> (Max 15MB each). Images automatically scale with proportional fitting without distortion.
                </p>
              </div>
            </div>

            {/* Multi-Image Action Bar: Upload File(s) + Add URL */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Multi-file upload button */}
              <label className="px-3.5 py-2 bg-[#C91F28] hover:bg-[#a81920] text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0">
                {isUploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploadingImage ? 'Uploading Photos...' : '+ Upload Multiple Photos'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isUploadingImage}
                  onChange={handleMultipleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Add by URL input */}
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={newImageUrlInput}
                  onChange={(e) => setNewImageUrlInput(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="flex-1 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!newImageUrlInput.trim()}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                >
                  + Add URL
                </button>
              </div>
            </div>

            {/* Gallery of Uploaded Photos */}
            {dayImages.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-500">
                <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">No photos added for this day</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  Click "+ Upload Multiple Photos" above to select one or multiple images from your computer or phone.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {dayImages.map((imgItem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2 relative"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Photo Thumbnail */}
                      <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img
                          src={imgItem.url}
                          alt={imgItem.label || `Day photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#C91F28] text-white text-[8.5px] font-black uppercase rounded shadow-xs">
                            Cover
                          </span>
                        )}
                      </div>

                      {/* Photo Actions & Controls */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Photo #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'up')}
                                title="Move up"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}
                            {idx < dayImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'down')}
                                title="Move down"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                title="Set as Cover Photo"
                                className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              title="Delete photo"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Place Name / Caption input for this specific photo */}
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Place Name / Caption Label:
                          </label>
                          <input
                            type="text"
                            value={imgItem.label || ''}
                            onChange={(e) => handleImageLabelChange(idx, e.target.value)}
                            placeholder="e.g. Botanical Garden, Doddabetta..."
                            className="w-full p-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              disabled={isSavingDay}
              onClick={() => setIsDayModalOpen(false)}
              className="px-3.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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

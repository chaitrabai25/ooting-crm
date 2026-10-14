import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Search,
  Star,
  ArrowUp,
  ArrowDown,
  Info,
  Camera,
  Layers,
  Utensils,
  Car,
  FileText,
  ChevronRight,
  ClipboardPaste,
  Compass,
} from 'lucide-react';
import { DatePicker } from '../ui/DatePicker.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { recommendNextDate, isSameDate, formatDateLong } from '../../utils/dateHelper.js';
import { Place, Hotel, ItineraryDay } from '../../types/index.js';

export interface DayImageItem {
  url: string;
  label?: string;
}

export interface DayEditorWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: any;
  itineraries: any[];
  dayIndex: number | null;
  dayNumber: number;
  initialData?: any;
  isSaving: boolean;
  onSave: (dayPayload: any, andContinue?: boolean) => Promise<boolean | void>;
  masterPlaces: Place[];
  masterHotels: Hotel[];
  isLoadingMasterData: boolean;
  onOpenQuickPlace: () => void;
  onOpenQuickHotel: () => void;
  onOpenHotelPicker: () => void;
  copiedDayInfo?: any;
  onPasteCopiedDay?: () => void;
  onLocationChange?: (state: string, district: string) => void;
  externalSelectedHotel?: Hotel | null;
  externalSelectedPlace?: Place | null;
}

export const DayEditorWorkspace: React.FC<DayEditorWorkspaceProps> = ({
  isOpen,
  onClose,
  pkg,
  itineraries,
  dayIndex,
  dayNumber: initialDayNumber,
  initialData,
  isSaving,
  onSave,
  masterPlaces,
  masterHotels,
  isLoadingMasterData,
  onOpenQuickPlace,
  onOpenQuickHotel,
  onOpenHotelPicker,
  copiedDayInfo,
  onPasteCopiedDay,
  onLocationChange,
  externalSelectedHotel,
  externalSelectedPlace,
}) => {
  // Form State
  const [currentDayNumber, setCurrentDayNumber] = useState<number>(initialDayNumber || 1);
  const [dayTitle, setDayTitle] = useState('');
  const [dayDate, setDayDate] = useState('');
  const [dayDescription, setDayDescription] = useState('');
  const [dayStartTime, setDayStartTime] = useState('09:00 AM');
  const [dayEndTime, setDayEndTime] = useState('06:00 PM');

  // Places State
  const [selectedPlaceChips, setSelectedPlaceChips] = useState<string[]>([]);
  const [dayPlaces, setDayPlaces] = useState('');
  const [dayPlaceSearch, setDayPlaceSearch] = useState('');
  const [daySelectedState, setDaySelectedState] = useState('Tamil Nadu');
  const [daySelectedDistrict, setDaySelectedDistrict] = useState('');

  // Hotel State
  const [dayHotelId, setDayHotelId] = useState('');
  const [dayHotelName, setDayHotelName] = useState('');
  const [dayHotelStarCategory, setDayHotelStarCategory] = useState('');
  const [dayHotelImageUrl, setDayHotelImageUrl] = useState('');
  const [dayHotelLocation, setDayHotelLocation] = useState('');
  const [dayHotelDetails, setDayHotelDetails] = useState('');
  const [dayMealPlan, setDayMealPlan] = useState('Breakfast & Dinner (MAP)');
  const [dayHotelCheckIn, setDayHotelCheckIn] = useState('12:00 PM');
  const [dayHotelCheckOut, setDayHotelCheckOut] = useState('11:00 AM');

  // Activities, Highlights & Logistics
  const [dayActivities, setDayActivities] = useState('');
  const [dayHighlights, setDayHighlights] = useState('');
  const [dayTravelDetails, setDayTravelDetails] = useState('');

  // Photos & Gallery
  const [dayImages, setDayImages] = useState<DayImageItem[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Section Accordion Visibility
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    places: true,
    hotel: true,
    activities: true,
    photos: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Compute recommended next date
  const recommendedDate = useMemo(() => {
    if (dayIndex !== null) return null; // Editing existing day, do not force suggestion

    // If previous days exist, recommend previous day's date + 1 day
    if (itineraries && itineraries.length > 0) {
      const sorted = [...itineraries].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i]?.date) {
          return recommendNextDate(sorted[i].date);
        }
      }
    }
    return null;
  }, [itineraries, dayIndex]);

  // Compute duplicate date warning
  const duplicateDateWarning = useMemo(() => {
    if (!dayDate || !dayDate.trim()) return null;
    const match = itineraries.find((it, idx) => {
      if (dayIndex !== null && idx === dayIndex) return false;
      return isSameDate(it.date, dayDate);
    });
    if (match) {
      return `Date "${dayDate}" is already assigned to Day ${match.dayNumber}.`;
    }
    return null;
  }, [dayDate, itineraries, dayIndex]);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    const stateObj = INDIA_STATES_AND_DISTRICTS.find((s) => s.state === daySelectedState);
    return stateObj ? stateObj.districts : [];
  }, [daySelectedState]);

  // Populate data when workspace opens
  useEffect(() => {
    if (!isOpen) return;

    if (dayIndex !== null && initialData) {
      // Editing existing day
      setCurrentDayNumber(initialData.dayNumber || dayIndex + 1);
      setDayTitle(initialData.title || `Day ${dayIndex + 1}`);
      setDayDate(initialData.date || '');
      setDayDescription(initialData.description || '');
      setDayPlaces(initialData.places || '');
      setDayActivities(initialData.activities || '');
      setDayHighlights(initialData.highlights || '');
      setDayTravelDetails(initialData.travelDetails || '');
      setDayStartTime(initialData.startTime || '09:00 AM');
      setDayEndTime(initialData.endTime || '06:00 PM');

      // Chips
      if (initialData.places) {
        setSelectedPlaceChips(
          initialData.places.split(',').map((p: string) => p.trim()).filter(Boolean)
        );
      } else {
        setSelectedPlaceChips([]);
      }

      // Hotel
      setDayHotelId(initialData.hotelId || '');
      setDayHotelName(initialData.hotelName || '');
      setDayHotelStarCategory(initialData.hotelStarCategory || '');
      setDayHotelImageUrl(initialData.hotelImageUrl || '');
      setDayHotelLocation(initialData.hotelLocation || '');
      setDayHotelDetails(initialData.hotelDetails || '');
      setDayMealPlan(initialData.mealPlan || 'Breakfast & Dinner (MAP)');
      setDayHotelCheckIn(initialData.hotelCheckIn || '12:00 PM');
      setDayHotelCheckOut(initialData.hotelCheckOut || '11:00 AM');

      // Photos
      let parsedImages: DayImageItem[] = [];
      if (initialData.images) {
        try {
          const parsed =
            typeof initialData.images === 'string'
              ? JSON.parse(initialData.images)
              : initialData.images;
          if (Array.isArray(parsed)) {
            parsedImages = parsed
              .map((p: any) => ({
                url: typeof p === 'string' ? p : p.url || p.imageUrl || '',
                label: typeof p === 'string' ? '' : p.label || p.name || p.placeName || '',
              }))
              .filter((p) => Boolean(p.url));
          }
        } catch {
          if (typeof initialData.images === 'string' && initialData.images.includes(',')) {
            parsedImages = initialData.images
              .split(',')
              .map((s: string) => ({ url: s.trim(), label: '' }))
              .filter((p: any) => Boolean(p.url));
          }
        }
      }
      if (parsedImages.length === 0 && initialData.imageUrl) {
        parsedImages = [{ url: initialData.imageUrl, label: initialData.places || '' }];
      }
      setDayImages(parsedImages);
    } else {
      // Adding new day
      const nextNum = initialDayNumber || itineraries.length + 1;
      setCurrentDayNumber(nextNum);
      setDayTitle(`Day ${nextNum}: `);
      setDayDescription('');
      setDayPlaces('');
      setSelectedPlaceChips([]);
      setDayActivities('');
      setDayHighlights('');
      setDayTravelDetails('');
      setDayStartTime('09:00 AM');
      setDayEndTime('06:00 PM');
      setDayImages([]);
      setNewImageUrlInput('');

      // Auto-suggest next date
      if (recommendedDate) {
        setDayDate(recommendedDate);
      } else {
        setDayDate('');
      }

      // Reset hotel
      setDayHotelId('');
      setDayHotelName('');
      setDayHotelStarCategory('');
      setDayHotelImageUrl('');
      setDayHotelLocation('');
      setDayHotelDetails('');
      setDayMealPlan('Breakfast & Dinner (MAP)');
      setDayHotelCheckIn('12:00 PM');
      setDayHotelCheckOut('11:00 AM');

      // Attempt match destination for places
      if (pkg?.destination) {
        const destLower = pkg.destination.toLowerCase();
        for (const s of INDIA_STATES_AND_DISTRICTS) {
          if (destLower.includes(s.state.toLowerCase())) {
            setDaySelectedState(s.state);
          }
          for (const d of s.districts) {
            if (destLower.includes(d.toLowerCase())) {
              setDaySelectedState(s.state);
              setDaySelectedDistrict(d);
              break;
            }
          }
        }
      }
    }
  }, [isOpen, dayIndex, initialData, initialDayNumber]);

  // Place Library Selection
  const handleSelectPlace = (place: Place) => {
    if (!selectedPlaceChips.includes(place.name)) {
      const updated = [...selectedPlaceChips, place.name];
      setSelectedPlaceChips(updated);
      setDayPlaces(updated.join(', '));
    }

    if (!dayDescription.trim() && (place.description || place.famousReason)) {
      setDayDescription(place.description || place.famousReason || '');
    }

    if (place.highlights) {
      const curH = dayHighlights ? dayHighlights.split(',').map((h) => h.trim()) : [];
      if (!curH.includes(place.highlights)) {
        setDayHighlights(dayHighlights ? `${dayHighlights}, ${place.highlights}` : place.highlights);
      }
    }

    if (place.activities) {
      const curA = dayActivities ? dayActivities.split(',').map((a) => a.trim()) : [];
      place.activities.split(',').forEach((act) => {
        const a = act.trim();
        if (a && !curA.includes(a)) curA.push(a);
      });
      setDayActivities(curA.join(', '));
    }

    // Place Photos
    const placeImages: string[] = [];
    if (place.imageUrl) placeImages.push(place.imageUrl);
    if ((place as any).gallery) {
      try {
        const gal =
          typeof (place as any).gallery === 'string'
            ? JSON.parse((place as any).gallery)
            : (place as any).gallery;
        if (Array.isArray(gal)) {
          gal.forEach((g: any) => {
            const u = typeof g === 'string' ? g : g?.url;
            if (u && !placeImages.includes(u)) placeImages.push(u);
          });
        }
      } catch {}
    }

    if (placeImages.length > 0) {
      setDayImages((prev) => {
        const toAdd = placeImages
          .filter((url) => !prev.some((img) => img.url === url))
          .map((url) => ({ url, label: place.name }));
        return [...prev, ...toAdd];
      });
    }
  };

  const handleRemovePlaceChip = (placeName: string) => {
    const updated = selectedPlaceChips.filter((p) => p !== placeName);
    setSelectedPlaceChips(updated);
    setDayPlaces(updated.join(', '));
  };

  const handleMovePlaceChip = (chipIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? chipIdx - 1 : chipIdx + 1;
    if (targetIdx < 0 || targetIdx >= selectedPlaceChips.length) return;
    const copy = [...selectedPlaceChips];
    const temp = copy[chipIdx];
    copy[chipIdx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setSelectedPlaceChips(copy);
    setDayPlaces(copy.join(', '));
  };

  // Hotel Library Selection
  const handleSelectHotel = (hotel: Hotel) => {
    setDayHotelId(hotel.id);
    setDayHotelName(hotel.name);
    setDayHotelStarCategory(hotel.starCategory || '3 Star Comfort');
    setDayHotelImageUrl(hotel.imageUrl || '');
    setDayHotelLocation(`${hotel.city ? `${hotel.city}, ` : ''}${hotel.district}`);
    setDayHotelDetails(hotel.description || hotel.address || '');
    if ((hotel as any).checkInTime) setDayHotelCheckIn((hotel as any).checkInTime);
    if ((hotel as any).checkOutTime) setDayHotelCheckOut((hotel as any).checkOutTime);
  };

  const handleClearHotel = () => {
    setDayHotelId('');
    setDayHotelName('');
    setDayHotelStarCategory('');
    setDayHotelImageUrl('');
    setDayHotelLocation('');
    setDayHotelDetails('');
    setDayHotelCheckIn('12:00 PM');
    setDayHotelCheckOut('11:00 AM');
  };

  // Listen for externally added or selected hotel (e.g. from HotelModal or HotelPicker)
  useEffect(() => {
    if (externalSelectedHotel) {
      handleSelectHotel(externalSelectedHotel);
    }
  }, [externalSelectedHotel]);

  // Listen for externally added place (e.g. from PlaceModal)
  useEffect(() => {
    if (externalSelectedPlace) {
      handleSelectPlace(externalSelectedPlace);
    }
  }, [externalSelectedPlace]);

  // Notify parent on state/district change so parent can load places/hotels
  useEffect(() => {
    if (isOpen && onLocationChange) {
      onLocationChange(daySelectedState, daySelectedDistrict);
    }
  }, [isOpen, daySelectedState, daySelectedDistrict]);

  const handlePasteIntoWorkspace = () => {
    if (!copiedDayInfo?.day) return;
    const d = copiedDayInfo.day;
    const cleanTitle = (d.title || '').replace(/^Day\s*\d+:\s*/i, '');
    setDayTitle(`Day ${currentDayNumber}: ${cleanTitle}`);
    setDayDescription(d.description || '');
    setDayPlaces(d.places || '');
    setDayActivities(d.activities || '');
    setDayHighlights(d.highlights || '');
    setDayTravelDetails(d.travelDetails || '');
    setDayStartTime(d.startTime || '09:00 AM');
    setDayEndTime(d.endTime || '06:00 PM');
    setDayHotelId(d.hotelId || '');
    setDayHotelName(d.hotelName || '');
    setDayHotelStarCategory(d.hotelStarCategory || '');
    setDayHotelImageUrl(d.hotelImageUrl || '');
    setDayHotelLocation(d.hotelLocation || '');
    setDayHotelDetails(d.hotelDetails || '');
    setDayMealPlan(d.mealPlan || 'Breakfast & Dinner (MAP)');
    setDayHotelCheckIn(d.hotelCheckIn || '12:00 PM');
    setDayHotelCheckOut(d.hotelCheckOut || '11:00 AM');

    if (d.places) {
      const chips = d.places.split(',').map((p: string) => p.trim()).filter(Boolean);
      setSelectedPlaceChips(chips);
    } else {
      setSelectedPlaceChips([]);
    }

    if (d.images) {
      try {
        const parsed = typeof d.images === 'string' ? JSON.parse(d.images) : d.images;
        if (Array.isArray(parsed)) {
          setDayImages(
            parsed
              .map((p: any) => ({
                url: typeof p === 'string' ? p : p.url || p.imageUrl || '',
                label: typeof p === 'string' ? '' : p.label || p.name || '',
              }))
              .filter((p: any) => Boolean(p.url))
          );
        }
      } catch {}
    } else if (d.imageUrl) {
      setDayImages([{ url: d.imageUrl, label: d.places || '' }]);
    }
    if (onPasteCopiedDay) onPasteCopiedDay();
  };

  if (!isOpen) return null;

  // Image Gallery Handling
  const compressImage = (file: File): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
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
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
              (blob) => {
                const dataUrl = canvas.toDataURL('image/webp', 0.85);
                resolve({ blob: blob || file, dataUrl });
              },
              'image/webp',
              0.85
            );
          } else {
            resolve({ blob: file, dataUrl: reader.result as string });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const added: DayImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { dataUrl } = await compressImage(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        added.push({
          url: dataUrl,
          label: cleanName.length < 35 ? cleanName : '',
        });
      } catch (err) {
        console.error('Image compression failed for:', file.name, err);
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

  // Build Payload
  const constructPayload = () => {
    const primaryUrl = dayImages[0]?.url || null;
    const imagesJson = dayImages.length > 0 ? JSON.stringify(dayImages) : null;

    return {
      ...(dayIndex !== null && itineraries[dayIndex]?.id ? { id: itineraries[dayIndex].id } : {}),
      dayNumber: Number(currentDayNumber) || 1,
      title: dayTitle.trim() || `Day ${currentDayNumber}`,
      description: dayDescription.trim(),
      places:
        selectedPlaceChips.length > 0 ? selectedPlaceChips.join(', ') : dayPlaces.trim() || null,
      activities: dayActivities.trim() || null,
      date: dayDate.trim() || null,
      highlights: dayHighlights.trim() || null,
      travelDetails: dayTravelDetails.trim() || null,
      startTime: dayStartTime.trim() || null,
      endTime: dayEndTime.trim() || null,
      imageUrl: primaryUrl,
      images: imagesJson,
      hotelId: dayHotelId || null,
      hotelName: dayHotelName || null,
      hotelStarCategory: dayHotelStarCategory || null,
      hotelImageUrl: dayHotelImageUrl || null,
      hotelLocation: dayHotelLocation || null,
      hotelDetails: dayHotelDetails || null,
      mealPlan: dayMealPlan || null,
      hotelCheckIn: dayHotelCheckIn || null,
      hotelCheckOut: dayHotelCheckOut || null,
    };
  };

  // Submit Handler: Save Day
  const handleSaveOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dayTitle.trim()) {
      alert('Please provide a title for this day.');
      return;
    }
    const payload = constructPayload();
    await onSave(payload, false);
  };

  // Submit Handler: Save & Continue
  const handleSaveAndContinue = async () => {
    if (!dayTitle.trim()) {
      alert('Please provide a title for this day.');
      return;
    }
    const payload = constructPayload();
    const success = await onSave(payload, true);
    if (success !== false) {
      // Advance to Next Day immediately
      const nextNum = currentDayNumber + 1;
      const nextDate = recommendNextDate(dayDate);

      setCurrentDayNumber(nextNum);
      setDayTitle(`Day ${nextNum}: `);
      setDayDescription('');
      setDayPlaces('');
      setSelectedPlaceChips([]);
      setDayActivities('');
      setDayHighlights('');
      setDayTravelDetails('');
      setDayImages([]);
      setDayDate(nextDate || '');
      setDayHotelId('');
      setDayHotelName('');
      setDayHotelImageUrl('');
      setDayHotelLocation('');

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 dark:bg-slate-950 overflow-y-auto flex flex-col min-h-screen">
      {/* 1. TOP HEADER (Sticky) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Navigation & Package Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0"
              title="Return to Package"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#C91F28] text-white">
                  {dayIndex !== null ? `Edit Day ${currentDayNumber}` : `Add Day ${currentDayNumber}`}
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {pkg?.packageName || 'Travel Package'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 truncate">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#C91F28]" />
                  <span>{pkg?.destination || 'Destination'}</span>
                </span>
                <span>•</span>
                <span>{pkg?.duration || 'Multi-Day'}</span>
                <span>•</span>
                <span>{itineraries.length} total days configured</span>
              </p>
            </div>
          </div>

          {/* Right: Primary Save Actions */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {copiedDayInfo && (
              <button
                type="button"
                onClick={handlePasteIntoWorkspace}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer shadow-2xs"
                title="Paste details from clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paste Copied Day</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={() => handleSaveOnly()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save Day'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={handleSaveAndContinue}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save & Continue →'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO DAY HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                DAY {String(currentDayNumber).padStart(2, '0')}
              </span>
              <span className="text-slate-500 font-bold text-xl">•</span>
              <span className="text-lg sm:text-xl font-bold text-amber-400">
                {dayDate ? formatDateLong(dayDate) : 'Date Not Assigned'}
              </span>
              {recommendedDate && dayDate === recommendedDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>Auto-Recommended</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1 truncate max-w-2xl">
              {dayTitle || 'Enter day title and daily sightseeing itinerary below'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-400 font-medium">Quick Jump:</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-white/10 rounded-lg text-white">
              {selectedPlaceChips.length} places
            </span>
            <span className="text-xs font-bold px-2.5 py-1 bg-white/10 rounded-lg text-white">
              {dayHotelName ? 'Hotel Added' : 'No Hotel'}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 bg-white/10 rounded-lg text-white">
              {dayImages.length} photos
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE BODY (Spacious 2-Column Desktop Grid) */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        <form onSubmit={handleSaveOnly} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Data Entry & Configuration (7 cols on lg, 8 on xl) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {copiedDayInfo && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardPaste className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium truncate">
                    Day in clipboard from {copiedDayInfo.sourcePackageName || 'another package'}: <strong>{copiedDayInfo.day?.title || `Day ${copiedDayInfo.day?.dayNumber}`}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePasteIntoWorkspace}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Paste Into This Day
                </button>
              </div>
            )}

            {/* SECTION 1: DAY INFORMATION & TIMING */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div
                onClick={() => toggleSection('details')}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#C91F28] font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Day Information & Schedule
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {dayTitle.trim() && dayDate && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Completed
                    </span>
                  )}
                  {expandedSections.details ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.details && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Row 1: Day #, Date Picker, and Timing */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Day Number <span className="text-[#C91F28]">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={currentDayNumber}
                        onChange={(e) => setCurrentDayNumber(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <DatePicker
                        label="Day Date (Optional)"
                        value={dayDate}
                        onChange={(newDate) => setDayDate(newDate)}
                        recommendedDate={recommendedDate}
                        duplicateWarning={duplicateDateWarning}
                        placeholder="Pick date from calendar..."
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Timing Hours
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={dayStartTime}
                          onChange={(e) => setDayStartTime(e.target.value)}
                          placeholder="09:00 AM"
                          className="w-1/2 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                        />
                        <span className="text-slate-400 text-xs">to</span>
                        <input
                          type="text"
                          value={dayEndTime}
                          onChange={(e) => setDayEndTime(e.target.value)}
                          placeholder="06:00 PM"
                          className="w-1/2 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Day Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Day Title / Headline <span className="text-[#C91F28]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={dayTitle}
                      onChange={(e) => setDayTitle(e.target.value)}
                      placeholder="e.g. Arrival in Ooty, Tea Garden Walks & Botanical Gardens"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl font-bold text-sm focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>

                  {/* Row 3: Day Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Day Description & Route Narrative <span className="text-[#C91F28]">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={dayDescription}
                      onChange={(e) => setDayDescription(e.target.value)}
                      placeholder="Detail the morning departure, scenic road stops, sightseeing sequence, lunch arrangements, and leisure evening..."
                      className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: PLACES & SIGHTSEEING */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div
                onClick={() => toggleSection('places')}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#C91F28] font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#C91F28]" />
                      <span>Places & Sightseeing Attractions</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedPlaceChips.length} {selectedPlaceChips.length === 1 ? 'place' : 'places'} selected
                  </span>
                  {expandedSections.places ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.places && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Library State/District Selector & Search */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Select from Verified Place Master:
                      </span>
                      <button
                        type="button"
                        onClick={onOpenQuickPlace}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C91F28]" />
                        <span>Add New Place to Library</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State</span>
                        <select
                          value={daySelectedState}
                          onChange={(e) => {
                            setDaySelectedState(e.target.value);
                            setDaySelectedDistrict('');
                          }}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        >
                          {INDIA_STATES_AND_DISTRICTS.map((s) => (
                            <option key={s.state} value={s.state}>
                              {s.state}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          District / City
                        </span>
                        <select
                          value={daySelectedDistrict}
                          onChange={(e) => setDaySelectedDistrict(e.target.value)}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        >
                          <option value="">All Districts ({daySelectedState})</option>
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Filter by Name
                        </span>
                        <div className="relative">
                          <input
                            type="text"
                            value={dayPlaceSearch}
                            onChange={(e) => setDayPlaceSearch(e.target.value)}
                            placeholder="Type spot name..."
                            className="w-full p-2 pl-7 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Pick Clickable Chips */}
                    <div>
                      {(() => {
                        const filtered = masterPlaces.filter((mp) => {
                          if (daySelectedDistrict && mp.district !== daySelectedDistrict) return false;
                          if (!dayPlaceSearch.trim()) return true;
                          const q = dayPlaceSearch.toLowerCase();
                          return (
                            mp.name.toLowerCase().includes(q) ||
                            mp.district.toLowerCase().includes(q) ||
                            mp.category?.toLowerCase().includes(q) ||
                            mp.activities?.toLowerCase().includes(q)
                          );
                        });

                        if (filtered.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              {filtered.map((mp) => {
                                const isSelected = selectedPlaceChips.includes(mp.name);
                                return (
                                  <button
                                    type="button"
                                    key={mp.id}
                                    onClick={() => handleSelectPlace(mp)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-red-50 text-[#C91F28] border border-red-300 dark:bg-red-950/40 dark:border-red-800'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <MapPin className="w-3 h-3 text-[#C91F28]" />
                                    <span>{mp.name}</span>
                                    {isSelected ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" />
                                    ) : (
                                      <Plus className="w-3 h-3 text-slate-400 ml-0.5" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div className="p-3 text-center text-[11px] text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1">
                            <span>No places matching filter in {daySelectedDistrict || daySelectedState}.</span>
                            <button
                              type="button"
                              onClick={onOpenQuickPlace}
                              className="text-[#C91F28] hover:underline font-semibold cursor-pointer"
                            >
                              + Click to add this spot to library
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Selected Places Ordered Cards */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Itinerary Stops for Day {currentDayNumber} (In Visiting Sequence):
                    </span>

                    {selectedPlaceChips.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPlaceChips.map((chip, chipIdx) => (
                          <div
                            key={chipIdx}
                            className="flex items-center justify-between p-2.5 bg-slate-50/80 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-[#C91F28] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {chipIdx + 1}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {chip}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 shrink-0">
                              <button
                                type="button"
                                disabled={chipIdx === 0}
                                onClick={() => handleMovePlaceChip(chipIdx, 'up')}
                                title="Visit earlier"
                                className="p-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={chipIdx === selectedPlaceChips.length - 1}
                                onClick={() => handleMovePlaceChip(chipIdx, 'down')}
                                title="Visit later"
                                className="p-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePlaceChip(chip)}
                                title="Remove stop"
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer ml-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                        No sightseeing spots selected yet. Click any place above to add to itinerary.
                      </div>
                    )}
                  </div>

                  {/* Manual Places text input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Places Summary Text (Appears on printed voucher & itinerary timeline)
                    </label>
                    <input
                      type="text"
                      value={dayPlaces}
                      onChange={(e) => {
                        setDayPlaces(e.target.value);
                        setSelectedPlaceChips(
                          e.target.value.split(',').map((p) => p.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Ooty Lake, Botanical Garden, Tea Factory & Doddabetta Peak"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: HOTEL & ACCOMMODATION */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div
                onClick={() => toggleSection('hotel')}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-amber-600" />
                      <span>Hotel & Night Stay Accommodation</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dayHotelName ? (
                    <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ {dayHotelName}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-slate-400">No hotel</span>
                  )}
                  {expandedSections.hotel ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.hotel && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Selected Hotel Card or Prompt */}
                  {dayHotelName ? (
                    <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {dayHotelImageUrl ? (
                          <img
                            src={dayHotelImageUrl}
                            alt={dayHotelName}
                            className="w-14 h-14 rounded-lg object-cover shrink-0 border border-amber-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-amber-700">
                            <Building className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {dayHotelName}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                              {dayHotelStarCategory || '3 Star'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                            {dayHotelLocation || 'Location specified'} • {dayMealPlan}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Check-in: {dayHotelCheckIn || '12:00 PM'} | Check-out: {dayHotelCheckOut || '11:00 AM'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={onOpenHotelPicker}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleClearHotel}
                          title="Remove hotel"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                      <Building className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No hotel accommodation selected for Night {currentDayNumber}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={onOpenHotelPicker}
                          className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
                        >
                          + Pick from Hotel Library
                        </button>
                        <button
                          type="button"
                          onClick={onOpenQuickHotel}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                        >
                          + Add New Hotel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Meal Plan & Location Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Meal Plan Included
                      </label>
                      <select
                        value={dayMealPlan}
                        onChange={(e) => setDayMealPlan(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                      >
                        <option value="Breakfast & Dinner (MAP)">Breakfast & Dinner Included (MAP Plan)</option>
                        <option value="Breakfast Included (CP)">Breakfast Included (CP Plan)</option>
                        <option value="All Meals Included (AP)">All Meals Included - Breakfast, Lunch & Dinner (AP Plan)</option>
                        <option value="Room Only (EP)">Room Only (EP Plan - No Meals)</option>
                        <option value="Welcome Drink & Dinner">Welcome Drink & Dinner</option>
                        <option value="Custom Meal Plan">Custom Meal Plan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hotel Area / Location
                      </label>
                      <input
                        type="text"
                        value={dayHotelLocation}
                        onChange={(e) => setDayHotelLocation(e.target.value)}
                        placeholder="e.g. Ooty Town, Madikeri Hills"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: ACTIVITIES, HIGHLIGHTS & LOGISTICS */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div
                onClick={() => toggleSection('activities')}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-black text-xs flex items-center justify-center">
                    4
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <span>Activities, Highlights & Travel Logistics</span>
                  </h3>
                </div>
                {expandedSections.activities ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {expandedSections.activities && (
                <div className="space-y-3.5 animate-in fade-in duration-150 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Activities & Sightseeing Highlights
                    </label>
                    <input
                      type="text"
                      value={dayActivities}
                      onChange={(e) => setDayActivities(e.target.value)}
                      placeholder="e.g. Boating on lake, Botanical flora walk, tea factory tasting"
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Key Short Highlights
                      </label>
                      <input
                        type="text"
                        value={dayHighlights}
                        onChange={(e) => setDayHighlights(e.target.value)}
                        placeholder="e.g. Sunset view from Doddabetta"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Travel Details & Transport
                      </label>
                      <input
                        type="text"
                        value={dayTravelDetails}
                        onChange={(e) => setDayTravelDetails(e.target.value)}
                        placeholder="e.g. AC Sedan Transfer (3 hrs)"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: SIGHTSEEING PHOTOS & LIVE PREVIEW (5 cols on lg, 4 on xl) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* SECTION 5: PHOTOS & GALLERY */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div
                onClick={() => toggleSection('photos')}
                className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-black text-xs flex items-center justify-center">
                    5
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Photos & Gallery</span>
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {dayImages.length} {dayImages.length === 1 ? 'photo' : 'photos'}
                  </span>
                  {expandedSections.photos ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedSections.photos && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Upload Controls */}
                  <div className="space-y-2">
                    <label className="w-full py-2.5 px-4 bg-[#C91F28] hover:bg-[#a81920] text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-colors">
                      {isUploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>{isUploadingImage ? 'Compressing & Uploading...' : '+ Upload Photos from Device'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleMultipleImageUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newImageUrlInput}
                        onChange={(e) => setNewImageUrlInput(e.target.value)}
                        placeholder="Or paste photo URL..."
                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={!newImageUrlInput.trim()}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Photo List Cards */}
                  {dayImages.length > 0 ? (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {dayImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5 relative"
                        >
                          <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0">
                            <img
                              src={img.url}
                              alt={img.label || `Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 px-1 py-0.2 bg-[#C91F28] text-white text-[8px] font-black uppercase rounded">
                                Cover
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
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
                                    className="p-0.5 text-slate-400 hover:text-slate-700"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                )}
                                {idx < dayImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 'down')}
                                    title="Move down"
                                    className="p-0.5 text-slate-400 hover:text-slate-700"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                )}
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(idx)}
                                    title="Set as Cover Photo"
                                    className="p-0.5 text-amber-500 hover:text-amber-700"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  title="Delete photo"
                                  className="p-0.5 text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={img.label || ''}
                              onChange={(e) => handleImageLabelChange(idx, e.target.value)}
                              placeholder="Caption / place label..."
                              className="w-full p-1 text-[11px] border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-md focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                      <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <span>No photos added yet. Upload from device or add image URL above.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LIVE DAY ITINERARY CARD PREVIEW */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Itinerary Timeline Preview
              </span>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 bg-[#C91F28] text-white text-[10px] font-black rounded-md">
                      DAY {currentDayNumber}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                      {dayTitle || 'Day Title Here'}
                    </h4>
                  </div>
                  {dayDate && (
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
                      {dayDate}
                    </span>
                  )}
                </div>

                {dayDescription && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {dayDescription}
                  </p>
                )}

                {selectedPlaceChips.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {selectedPlaceChips.map((c, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-red-50 text-[#C91F28] dark:bg-red-950/40 text-[10px] font-semibold rounded"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {dayHotelName && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                    <Building className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{dayHotelName} ({dayHotelStarCategory || 'Hotel'})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* 4. BOTTOM ACTION AREA (Sticky Bottom) */}
      <footer className="sticky bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel & Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={() => handleSaveOnly()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save Day'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={handleSaveAndContinue}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save & Continue →'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

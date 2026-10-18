import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
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

  // Section Accordion Visibility (Activities collapsed by default for speed, others open)
  const [expandedSections, setExpandedSections] = useState({
    places: true,
    hotel: true,
    photos: true,
    activities: false,
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

  const [activeEditingIndex, setActiveEditingIndex] = useState<number | null>(dayIndex);
  const [isRightPanelMinimized, setIsRightPanelMinimized] = useState(false);

  const loadDayIntoWorkspace = (targetData: any, targetIndex: number | null) => {
    setActiveEditingIndex(targetIndex);
    if (targetData) {
      setCurrentDayNumber(targetData.dayNumber || (targetIndex !== null ? targetIndex + 1 : 1));
      setDayTitle(targetData.title || `Day ${targetData.dayNumber || 1}: `);
      setDayDescription(targetData.description || '');
      setDayPlaces(targetData.places || '');
      const placeTokens = (targetData.places || '')
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean);
      setSelectedPlaceChips(placeTokens);
      setDayActivities(targetData.activities || '');
      setDayHighlights(targetData.highlights || '');
      setDayTravelDetails(targetData.travelDetails || '');
      setDayDate(targetData.date || '');
      setDayStartTime(targetData.startTime || '09:00 AM');
      setDayEndTime(targetData.endTime || '06:00 PM');
      setDayHotelId(targetData.hotelId || '');
      setDayHotelName(targetData.hotelName || '');
      setDayHotelStarCategory(targetData.hotelStarCategory || '');
      setDayHotelImageUrl(targetData.hotelImageUrl || '');
      setDayHotelLocation(targetData.hotelLocation || '');
      setDayHotelDetails(targetData.hotelDetails || '');
      setDayMealPlan(targetData.mealPlan || 'Breakfast & Dinner (MAP)');
      setDayHotelCheckIn(targetData.hotelCheckIn || '12:00 PM');
      setDayHotelCheckOut(targetData.hotelCheckOut || '11:00 AM');

      // Photos
      let parsedImages: DayImageItem[] = [];
      if (targetData.images) {
        try {
          const parsed = typeof targetData.images === 'string' ? JSON.parse(targetData.images) : targetData.images;
          if (Array.isArray(parsed)) {
            parsedImages = parsed
              .map((p: any) => ({
                url: typeof p === 'string' ? p : p.url || p.imageUrl || '',
                label: typeof p === 'string' ? '' : p.label || p.name || p.placeName || '',
              }))
              .filter((p) => Boolean(p.url));
          }
        } catch {
          if (typeof targetData.images === 'string' && targetData.images.includes(',')) {
            parsedImages = targetData.images
              .split(',')
              .map((s: string) => ({ url: s.trim(), label: '' }))
              .filter((p: any) => Boolean(p.url));
          }
        }
      }
      if (parsedImages.length === 0 && targetData.imageUrl) {
        parsedImages = [{ url: targetData.imageUrl, label: targetData.places || '' }];
      }
      setDayImages(parsedImages);
    } else {
      // Adding new day
      const nextNum = itineraries.length + 1;
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
      setDayDate(recommendNextDate(dayDate) || '');
      setDayHotelId('');
      setDayHotelName('');
      setDayHotelStarCategory('');
      setDayHotelImageUrl('');
      setDayHotelLocation('');
      setDayHotelDetails('');
      setDayMealPlan('Breakfast & Dinner (MAP)');
      setDayHotelCheckIn('12:00 PM');
      setDayHotelCheckOut('11:00 AM');
    }

    const scrollableBody = document.getElementById('day-editor-modal-body');
    if (scrollableBody) scrollableBody.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Populate data when workspace opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveEditingIndex(dayIndex);

    if (dayIndex !== null && initialData) {
      loadDayIntoWorkspace(initialData, dayIndex);
    } else {
      loadDayIntoWorkspace(null, null);
    }
  }, [isOpen, dayIndex, initialData]);

  // Place Library Selection: Accumulates descriptions, highlights, activities and photos across ALL chosen places
  const handleSelectPlace = (place: Place) => {
    const isNew = !selectedPlaceChips.some((p) => p.toLowerCase().trim() === place.name.toLowerCase().trim());
    let updatedChips = selectedPlaceChips;
    if (isNew) {
      updatedChips = [...selectedPlaceChips, place.name];
      setSelectedPlaceChips(updatedChips);
      setDayPlaces(updatedChips.join(', '));
    }

    // Auto-update / suggest Day Title if it was empty or default
    if (!dayTitle.trim() || dayTitle.match(/^Day\s*\d+:?\s*$/i) || dayTitle.includes('Sightseeing')) {
      setDayTitle(`Day ${currentDayNumber}: ${updatedChips.join(' & ')} Sightseeing`);
    }

    // Accumulate descriptions for all chosen places
    const placeDesc = (place.description || place.famousReason || '').trim();
    if (placeDesc) {
      if (!dayDescription.trim()) {
        setDayDescription(`${place.name}: ${placeDesc}`);
      } else if (!dayDescription.toLowerCase().includes(place.name.toLowerCase())) {
        setDayDescription((prev) => `${prev.trim()}\n\n• ${place.name}: ${placeDesc}`);
      }
    }

    // Accumulate highlights
    if (place.highlights) {
      const placeH = place.highlights.split(/[,;•]+/).map((h) => h.trim()).filter(Boolean);
      const curH = dayHighlights ? dayHighlights.split(/[,;•]+/).map((h) => h.trim()).filter(Boolean) : [];
      const mergedH = Array.from(new Set([...curH, ...placeH]));
      setDayHighlights(mergedH.join(', '));
    }

    // Accumulate activities
    if (place.activities) {
      const placeA = place.activities.split(/[,;•]+/).map((a) => a.trim()).filter(Boolean);
      const curA = dayActivities ? dayActivities.split(/[,;•]+/).map((a) => a.trim()).filter(Boolean) : [];
      const mergedA = Array.from(new Set([...curA, ...placeA]));
      setDayActivities(mergedA.join(', '));
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

  // Place Removal: Automatically purges this place's narrative, highlights, activities, and photos from the day
  const handleRemovePlaceChip = (placeName: string) => {
    const cleanTarget = placeName.toLowerCase().trim();
    const updated = selectedPlaceChips.filter((p) => p.toLowerCase().trim() !== cleanTarget);
    setSelectedPlaceChips(updated);
    setDayPlaces(updated.join(', '));

    // Find the place record to know its descriptions, highlights, activities and photos
    const matchedPlace = masterPlaces.find((p) => p.name.toLowerCase().trim() === cleanTarget);

    // 1. Remove this place's narrative from dayDescription
    if (dayDescription) {
      let desc = dayDescription;
      const regexLine = new RegExp(`(^|\\n)\\s*[•\\-*]?\\s*${placeName}[^\\n]*`, 'gi');
      desc = desc.replace(regexLine, '');
      if (matchedPlace?.description) {
        desc = desc.replace(matchedPlace.description, '');
      }
      if (matchedPlace?.famousReason) {
        desc = desc.replace(matchedPlace.famousReason, '');
      }
      desc = desc.replace(/\n{3,}/g, '\n\n').trim();
      setDayDescription(desc);
    }

    // 2. Remove this place's highlights
    if (matchedPlace?.highlights && dayHighlights) {
      const toRemove = matchedPlace.highlights.split(/[,;•]+/).map((h) => h.trim().toLowerCase()).filter(Boolean);
      const remainingH = dayHighlights
        .split(/[,;•]+/)
        .map((h) => h.trim())
        .filter((h) => h && !toRemove.includes(h.toLowerCase()));
      setDayHighlights(remainingH.join(', '));
    }

    // 3. Remove this place's activities
    if (matchedPlace?.activities && dayActivities) {
      const toRemove = matchedPlace.activities.split(/[,;•]+/).map((a) => a.trim().toLowerCase()).filter(Boolean);
      const remainingA = dayActivities
        .split(/[,;•]+/)
        .map((a) => a.trim())
        .filter((a) => a && !toRemove.includes(a.toLowerCase()));
      setDayActivities(remainingA.join(', '));
    }

    // 4. Remove this place's photos
    const placeUrls: string[] = [];
    if (matchedPlace?.imageUrl) placeUrls.push(matchedPlace.imageUrl);
    if ((matchedPlace as any)?.gallery) {
      try {
        const gal = typeof (matchedPlace as any).gallery === 'string'
          ? JSON.parse((matchedPlace as any).gallery)
          : (matchedPlace as any).gallery;
        if (Array.isArray(gal)) {
          gal.forEach((g: any) => {
            const u = typeof g === 'string' ? g : g?.url;
            if (u) placeUrls.push(u);
          });
        }
      } catch {}
    }

    setDayImages((prev) =>
      prev.filter((img) => {
        if (img.label && img.label.toLowerCase().trim() === cleanTarget) return false;
        if (placeUrls.includes(img.url)) return false;
        return true;
      })
    );

    // 5. Update day title if needed
    if (updated.length === 0) {
      setDayTitle(`Day ${currentDayNumber}: Sightseeing & Tour`);
    } else {
      setDayTitle(`Day ${currentDayNumber}: ${updated.join(' & ')} Sightseeing`);
    }
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

    const targetId =
      activeEditingIndex !== null && itineraries[activeEditingIndex]?.id
        ? itineraries[activeEditingIndex].id
        : (initialData?.id || (dayIndex !== null && itineraries[dayIndex]?.id ? itineraries[dayIndex].id : undefined));

    return {
      ...(targetId ? { id: targetId } : {}),
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

      // Scroll modal body to top
      const scrollableBody = document.getElementById('day-editor-modal-body');
      if (scrollableBody) {
        scrollableBody.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  if (!isOpen) return null;

  return (
    /* OUTER BACKDROP: Centered with generous, balanced top/bottom/left/right spacing */
    <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 animate-in fade-in duration-150">
      
      {/* MODAL WINDOW: Clean, elevated, rounded-2xl with clean border and deep soft shadow */}
      <div className="bg-white dark:bg-slate-900 w-full sm:w-[95%] md:w-[92%] lg:w-[88%] max-w-7xl rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto transition-all">
        
        {/* 1. TOP HEADER (Fixed inside modal card) */}
        <header className="px-5 sm:px-7 py-3.5 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Day Number Pill */}
            <div className="w-10 h-10 rounded-xl bg-[#C91F28] text-white flex flex-col items-center justify-center shadow-xs shrink-0 font-mono">
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none">DAY</span>
              <span className="text-sm font-black leading-none mt-0.5">{String(currentDayNumber).padStart(2, '0')}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                  {dayIndex !== null ? `Edit Day ${currentDayNumber}` : `Add Day ${currentDayNumber}`}
                </h2>
                {dayDate && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                    📅 {dayDate}
                  </span>
                )}
                {recommendedDate && dayDate === recommendedDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Auto-Suggested</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {pkg?.packageName ? `Package: ${pkg.packageName}` : 'Travel Package'} {pkg?.destination ? `• ${pkg.destination}` : ''}
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {copiedDayInfo && (
              <button
                type="button"
                onClick={handlePasteIntoWorkspace}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                title="Paste details from clipboard"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paste Day</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2. MAIN BODY WITH RIGHT TOUR DAYS SIDEBAR */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Scrollable Form Body */}
          <div id="day-editor-modal-body" className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-6">
          
          {/* Clipboard Banner (if available) */}
          {copiedDayInfo && (
            <div className="flex items-center justify-between p-3 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <ClipboardPaste className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-900 dark:text-emerald-300 font-medium truncate">
                  Clipboard has day from {copiedDayInfo.sourcePackageName || 'another package'}: <strong>{copiedDayInfo.day?.title || `Day ${copiedDayInfo.day?.dayNumber}`}</strong>
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

          {/* SECTION 1: SCHEDULE & NARRATIVE (Full Width Aligned Grid) */}
          <div className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-750">
              <span className="w-5 h-5 rounded-md bg-[#C91F28] text-white text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Day Schedule & Description
              </h3>
            </div>

            {/* Row 1: Day #, DatePicker, Timing (Clean 12-col grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Day # */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Day Number <span className="text-[#C91F28]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={currentDayNumber}
                  onChange={(e) => setCurrentDayNumber(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl font-mono font-bold text-xs text-center focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] focus:outline-none"
                />
              </div>

              {/* DatePicker */}
              <div className="sm:col-span-5">
                <DatePicker
                  label="Day Date (Interactive Calendar)"
                  value={dayDate}
                  onChange={(newDate) => setDayDate(newDate)}
                  recommendedDate={recommendedDate}
                  duplicateWarning={duplicateDateWarning}
                  placeholder="Click to pick date from calendar..."
                />
              </div>

              {/* Timing Hours */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                  Tour Timing (Start to End)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={dayStartTime}
                      onChange={(e) => setDayStartTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full h-10 pl-8 pr-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] focus:outline-none"
                    />
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold">to</span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={dayEndTime}
                      onChange={(e) => setDayEndTime(e.target.value)}
                      placeholder="06:00 PM"
                      className="w-full h-10 pl-8 pr-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] focus:outline-none"
                    />
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Day Title Headline */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Day Title / Headline <span className="text-[#C91F28]">*</span>
              </label>
              <input
                type="text"
                required
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder="e.g. Arrival in Ooty, Tea Garden Walks & Botanical Gardens"
                className="w-full h-10 px-3.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl font-semibold text-xs focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] focus:outline-none"
              />
            </div>

            {/* Row 3: Day Route Narrative / Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Day Description & Route Narrative <span className="text-[#C91F28]">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={dayDescription}
                onChange={(e) => setDayDescription(e.target.value)}
                placeholder="Detail morning departure, scenic road stops, sightseeing sequence, lunch arrangements, and leisure evening..."
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: PLACES & SIGHTSEEING */}
          <div className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div
              onClick={() => toggleSection('places')}
              className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-750 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#C91F28] text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                  <span>Places & Sightseeing Spots</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Filter and Library Control Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* State */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State</label>
                    <select
                      value={daySelectedState}
                      onChange={(e) => {
                        setDaySelectedState(e.target.value);
                        setDaySelectedDistrict('');
                        if (onLocationChange) onLocationChange(e.target.value, '');
                      }}
                      className="w-full h-9 px-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    >
                      {INDIA_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District / City</label>
                    <select
                      value={daySelectedDistrict}
                      onChange={(e) => {
                        setDaySelectedDistrict(e.target.value);
                        if (onLocationChange) onLocationChange(daySelectedState, e.target.value);
                      }}
                      className="w-full h-9 px-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    >
                      <option value="">All Districts ({daySelectedState})</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name Filter Search */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Spots</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={dayPlaceSearch}
                        onChange={(e) => setDayPlaceSearch(e.target.value)}
                        placeholder="Search spot name..."
                        className="w-full h-9 pl-7 pr-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Quick Add Place to Master */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={onOpenQuickPlace}
                      className="w-full h-9 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C91F28]" />
                      <span>+ New Place</span>
                    </button>
                  </div>
                </div>

                {/* Available Library Spots Chips */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Click to add spots from verified master:
                  </span>
                  {(() => {
                    const filtered = masterPlaces.filter((mp) => {
                      if (daySelectedDistrict && mp.district !== daySelectedDistrict) return false;
                      if (!dayPlaceSearch.trim()) return true;
                      const q = dayPlaceSearch.toLowerCase();
                      return (
                        mp.name.toLowerCase().includes(q) ||
                        mp.district.toLowerCase().includes(q) ||
                        mp.category?.toLowerCase().includes(q)
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                          No places found in this district. Click "+ New Place" above to add one instantly.
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        {filtered.map((mp) => {
                          const isSelected = selectedPlaceChips.includes(mp.name);
                          return (
                            <button
                              type="button"
                              key={mp.id}
                              onClick={() => handleSelectPlace(mp)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-red-50 text-[#C91F28] border border-red-300 dark:bg-red-950/40 dark:border-red-800 font-bold'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <MapPin className="w-3 h-3 text-[#C91F28]" />
                              <span>{mp.name}</span>
                              {isSelected ? (
                                <CheckCircle2 className="w-3 h-3 text-[#C91F28]" />
                              ) : (
                                <Plus className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Selected Sequence Chips */}
                {selectedPlaceChips.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Visiting Sequence for Day {currentDayNumber} ({selectedPlaceChips.length} spots):
                    </span>
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      {selectedPlaceChips.map((chip, chipIdx) => (
                        <div
                          key={chipIdx}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#C91F28] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                            {chipIdx + 1}
                          </span>
                          <span className="font-semibold text-xs">{chip}</span>
                          <button
                            type="button"
                            disabled={chipIdx === 0}
                            onClick={() => handleMovePlaceChip(chipIdx, 'up')}
                            title="Visit earlier"
                            className="p-0.5 hover:text-slate-950 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={chipIdx === selectedPlaceChips.length - 1}
                            onClick={() => handleMovePlaceChip(chipIdx, 'down')}
                            title="Visit later"
                            className="p-0.5 hover:text-slate-950 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlaceChip(chip)}
                            title="Remove"
                            className="p-0.5 text-rose-500 hover:text-rose-700 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Places Summary Text Input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Places Summary Text (Appears on printed itinerary timeline)
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
                    className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: HOTEL & ACCOMMODATION */}
          <div className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div
              onClick={() => toggleSection('hotel')}
              className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-750 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hotel & Night Stay Accommodation</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {dayHotelName ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                    ✓ {dayHotelName}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">No hotel assigned</span>
                )}
                {expandedSections.hotel ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.hotel && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Hotel Card if selected, else quick picker buttons */}
                {dayHotelName ? (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {dayHotelImageUrl ? (
                        <img
                          src={dayHotelImageUrl}
                          alt={dayHotelName}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5" />
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
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {dayHotelLocation || 'Location specified'} • {dayMealPlan}
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
                        title="Remove"
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>No hotel accommodation selected for Night {currentDayNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenHotelPicker}
                        className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                      >
                        + Pick from Hotel Library
                      </button>
                      <button
                        type="button"
                        onClick={onOpenQuickHotel}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        + Create New Hotel
                      </button>
                    </div>
                  </div>
                )}

                {/* Meal Plan & Location 2-col row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Meal Plan Included
                    </label>
                    <select
                      value={dayMealPlan}
                      onChange={(e) => setDayMealPlan(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Hotel Area / Location
                    </label>
                    <input
                      type="text"
                      value={dayHotelLocation}
                      onChange={(e) => setDayHotelLocation(e.target.value)}
                      placeholder="e.g. Ooty Town, Lake View Road"
                      className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: SIGHTSEEING PHOTO GALLERY */}
          <div className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div
              onClick={() => toggleSection('photos')}
              className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-750 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-600" />
                  <span>Sightseeing Photos & Visual Gallery</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                {/* Upload & URL Input Row */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <label className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isUploadingImage ? 'Compressing...' : 'Upload Photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 w-full flex items-center gap-1.5">
                    <input
                      type="url"
                      value={newImageUrlInput}
                      onChange={(e) => setNewImageUrlInput(e.target.value)}
                      placeholder="Or paste image URL (https://...)"
                      className="flex-1 h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      disabled={!newImageUrlInput.trim()}
                      className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Photos Thumbnail Grid */}
                {dayImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {dayImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 rounded-xl p-1.5 border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs relative group"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                          <img src={img.url} alt={img.label || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 ? (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-[#C91F28] text-white">
                              Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8.5px] font-bold bg-slate-900/80 text-white hover:bg-[#C91F28] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              Make Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={img.label || ''}
                          onChange={(e) => handleImageLabelChange(idx, e.target.value)}
                          placeholder="Caption / Place..."
                          className="w-full text-[10.5px] p-1 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                    No photos added yet. Upload photos to make this itinerary visually stunning on customer vouchers.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: ACTIVITIES, HIGHLIGHTS & LOGISTICS (Collapsible) */}
          <div className="bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800 space-y-4">
            <div
              onClick={() => toggleSection('activities')}
              className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-750 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  5
                </span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>Activities, Highlights & Travel Logistics</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {expandedSections.activities ? 'Click to collapse' : 'Click to expand'}
                </span>
                {expandedSections.activities ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.activities && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Key Highlights
                  </label>
                  <input
                    type="text"
                    value={dayHighlights}
                    onChange={(e) => setDayHighlights(e.target.value)}
                    placeholder="e.g. Scenic Sunset, Toy Train..."
                    className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Activities Included
                  </label>
                  <input
                    type="text"
                    value={dayActivities}
                    onChange={(e) => setDayActivities(e.target.value)}
                    placeholder="e.g. Boating, Trekking..."
                    className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Travel Logistics / Instructions
                  </label>
                  <input
                    type="text"
                    value={dayTravelDetails}
                    onChange={(e) => setDayTravelDetails(e.target.value)}
                    placeholder="e.g. Pickup at 9 AM, AC Sedan..."
                    className="w-full h-9 px-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Right Sidebar: Tour Days Overview */}
        <aside
          className={`transition-all duration-200 border-l border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col shrink-0 ${
            isRightPanelMinimized ? 'w-14 sm:w-16 items-center' : 'w-64 sm:w-72'
          }`}
        >
          {/* Sidebar Header */}
          <div
            className={`p-3 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 w-full ${
              isRightPanelMinimized ? 'justify-center flex-col py-3 px-1' : ''
            }`}
          >
            {!isRightPanelMinimized && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Tour Days
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                  {itineraries.length}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsRightPanelMinimized(!isRightPanelMinimized)}
              title={isRightPanelMinimized ? 'Expand Tour Days' : 'Minimize Tour Days'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isRightPanelMinimized ? (
                <PanelRightOpen className="w-4 h-4 text-[#C91F28]" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Sidebar Content */}
          {isRightPanelMinimized ? (
            /* Minimized compact rail */
            <div className="flex-1 overflow-y-auto py-2.5 px-1 space-y-1.5 w-full flex flex-col items-center">
              {itineraries.map((it, idx) => {
                const isActive =
                  activeEditingIndex === idx ||
                  (activeEditingIndex === null && dayIndex === idx) ||
                  (!it.id && currentDayNumber === it.dayNumber);
                return (
                  <button
                    key={it.id || idx}
                    type="button"
                    onClick={() => loadDayIntoWorkspace(it, idx)}
                    title={`Day ${it.dayNumber}: ${it.title || 'Sightseeing'}`}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#C91F28] text-white shadow-xs scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/70 dark:border-slate-700'
                    }`}
                  >
                    D{it.dayNumber}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => loadDayIntoWorkspace(null, null)}
                title="Add New Day"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 hover:text-[#C91F28] hover:bg-red-50 dark:hover:bg-red-950/30 border border-dashed border-slate-300 dark:border-slate-700 transition-all cursor-pointer mt-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded rich list */
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                type="button"
                onClick={() => loadDayIntoWorkspace(null, null)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#C91F28] bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-dashed border-red-300 dark:border-red-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Next Day</span>
              </button>

              {itineraries.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No days yet. Click above to add Day 1.
                </div>
              ) : (
                itineraries.map((it, idx) => {
                  const isActive =
                    activeEditingIndex === idx ||
                    (activeEditingIndex === null && dayIndex === idx) ||
                    (!it.id && currentDayNumber === it.dayNumber);

                  const cleanTitle = (it.title || '')
                    .replace(/^Day\s*\d+:?\s*/i, '')
                    .trim() || it.title || `Day ${it.dayNumber}`;

                  return (
                    <div
                      key={it.id || idx}
                      onClick={() => loadDayIntoWorkspace(it, idx)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800/80 shadow-2xs ring-1 ring-red-400/30'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-650'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                            isActive
                              ? 'bg-[#C91F28] text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Day {it.dayNumber}
                        </span>
                        {it.date && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {it.date}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                        {cleanTitle}
                      </p>

                      {it.places && (
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{it.places}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>
      </div>
        <footer className="px-5 sm:px-7 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel & Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || isUploadingImage}
              onClick={() => handleSaveOnly()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Itinerary Day'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  GripVertical,
  Building,
  Sparkles,
  Utensils,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { ItineraryDay, Place, Hotel } from '../../types/index.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { PlaceModal } from '../places/PlaceModal.js';
import { HotelModal } from '../hotels/HotelModal.js';
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

  // Day Hotel & Accommodation State
  const [dayHotelId, setDayHotelId] = useState('');
  const [dayHotelName, setDayHotelName] = useState('');
  const [dayHotelStarCategory, setDayHotelStarCategory] = useState('');
  const [dayHotelImageUrl, setDayHotelImageUrl] = useState('');
  const [dayHotelLocation, setDayHotelLocation] = useState('');
  const [dayHotelDetails, setDayHotelDetails] = useState('');
  const [dayMealPlan, setDayMealPlan] = useState('Breakfast & Dinner (MAP)');

  // Master Data Selection inside Day Modal
  const [daySelectedState, setDaySelectedState] = useState('Tamil Nadu');
  const [daySelectedDistrict, setDaySelectedDistrict] = useState('');
  const [dayAvailableDistricts, setDayAvailableDistricts] = useState<string[]>([]);
  const [masterPlaces, setMasterPlaces] = useState<Place[]>([]);
  const [masterHotels, setMasterHotels] = useState<Hotel[]>([]);
  const [selectedPlaceChips, setSelectedPlaceChips] = useState<string[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);
  const [dayPlaceSearch, setDayPlaceSearch] = useState('');
  const [dayHotelSearch, setDayHotelSearch] = useState('');
  const [isHotelPickerOpen, setIsHotelPickerOpen] = useState(false);
  const masterDataCache = useRef(new Map<string, { places: Place[]; hotels: Hotel[] }>());

  // Quick Modals from within day editor
  const [isQuickPlaceOpen, setIsQuickPlaceOpen] = useState(false);
  const [isQuickHotelOpen, setIsQuickHotelOpen] = useState(false);

  // Drag and drop state for day reordering
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

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

  // Sync available districts for day modal (reset district on state change so all state places show immediately)
  useEffect(() => {
    const found = INDIA_STATES_AND_DISTRICTS.find((s) => s.state === daySelectedState);
    if (found) {
      setDayAvailableDistricts(found.districts);
      if (daySelectedDistrict && !found.districts.includes(daySelectedDistrict)) {
        setDaySelectedDistrict('');
      }
    } else {
      setDayAvailableDistricts([]);
      setDaySelectedDistrict('');
    }
  }, [daySelectedState]);

  // Load master places and hotels with in-memory caching and optional district filter
  const loadMasterDataForDay = async (stateName: string, districtName: string) => {
    if (!stateName) return;
    const isAll = !districtName || districtName === 'All Districts';
    const cacheKey = `${stateName}::${isAll ? 'ALL' : districtName}`;

    if (masterDataCache.current.has(cacheKey)) {
      const cached = masterDataCache.current.get(cacheKey)!;
      setMasterPlaces(cached.places);
      setMasterHotels(cached.hotels);
      return;
    }

    setIsLoadingMasterData(true);
    try {
      let placesUrl = `/places?state=${encodeURIComponent(stateName)}`;
      let hotelsUrl = `/hotels?state=${encodeURIComponent(stateName)}`;
      if (!isAll) {
        placesUrl += `&district=${encodeURIComponent(districtName)}`;
        hotelsUrl += `&district=${encodeURIComponent(districtName)}`;
      }

      const [placesRes, hotelsRes] = await Promise.all([
        api.get(placesUrl),
        api.get(hotelsUrl),
      ]);
      const places = placesRes.data?.places || [];
      const hotels = hotelsRes.data?.hotels || [];

      masterDataCache.current.set(cacheKey, { places, hotels });
      setMasterPlaces(places);
      setMasterHotels(hotels);
    } catch (err) {
      console.error('Failed to load places/hotels master data:', err);
    } finally {
      setIsLoadingMasterData(false);
    }
  };

  useEffect(() => {
    if (isDayModalOpen && daySelectedState) {
      loadMasterDataForDay(daySelectedState, daySelectedDistrict);
    }
  }, [isDayModalOpen, daySelectedState, daySelectedDistrict]);

  // Recalculate day numbers and sequential dates based on starting date
  const recalculateDays = (daysList: ItineraryDay[]): ItineraryDay[] => {
    let baseDate: Date | null = null;
    const firstDateStr = daysList[0]?.date;
    if (firstDateStr) {
      const parsed = new Date(firstDateStr);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }

    return daysList.map((day, idx) => {
      let calculatedDate = day.date;
      if (baseDate) {
        const curDate = new Date(baseDate);
        curDate.setDate(baseDate.getDate() + idx);
        calculatedDate = curDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }

      const cleanTitle = day.title.replace(/^Day\s*\d+:\s*/i, '');
      return {
        ...day,
        dayNumber: idx + 1,
        title: `Day ${idx + 1}: ${cleanTitle}`,
        date: calculatedDate,
      };
    });
  };

  // Move Day Up / Down with sequential date recalculation
  const handleMoveDay = async (fromIdx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (targetIdx < 0 || targetIdx >= itineraries.length) return;

    const reordered = [...itineraries];
    const temp = reordered[fromIdx];
    reordered[fromIdx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const sequential = recalculateDays(reordered);
    setItineraries(sequential);
    setIsReordering(true);

    try {
      await api.post(`/packages/${id}/itineraries/reorder`, {
        orderedDays: sequential.map((d) => ({ id: d.id, date: d.date })),
      });
      showToast('Itinerary day schedule reordered successfully.');
    } catch (err: any) {
      console.error('Failed to reorder days:', err);
      showToast(err.response?.data?.message || 'Failed to save reordered schedule.', 'error');
      fetchPackage();
    } finally {
      setIsReordering(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDayIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDayIndex === null || draggedDayIndex === targetIndex) {
      setDraggedDayIndex(null);
      return;
    }

    const reordered = [...itineraries];
    const [movedDay] = reordered.splice(draggedDayIndex, 1);
    reordered.splice(targetIndex, 0, movedDay);

    const sequential = recalculateDays(reordered);
    setItineraries(sequential);
    setDraggedDayIndex(null);
    setIsReordering(true);

    try {
      await api.post(`/packages/${id}/itineraries/reorder`, {
        orderedDays: sequential.map((d) => ({ id: d.id, date: d.date })),
      });
      showToast('Itinerary day schedule reordered successfully.');
    } catch (err: any) {
      console.error('Failed to reorder days:', err);
      showToast('Failed to save reordered schedule.', 'error');
      fetchPackage();
    } finally {
      setIsReordering(false);
    }
  };

  // Copy / Duplicate Day
  const handleCopyDay = async (index: number) => {
    const targetDay = itineraries[index];
    if (!targetDay) return;

    try {
      const res = await api.post(`/packages/${id}/itineraries/day/${targetDay.id || targetDay.dayNumber}/copy`);
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      } else {
        await fetchPackage();
      }
      showToast(`Day ${targetDay.dayNumber} copied to new day successfully!`);
    } catch (err: any) {
      console.error('Failed to copy day:', err);
      showToast(err.response?.data?.message || 'Failed to copy day.', 'error');
    }
  };

  const openAddDay = () => {
    setDayIndex(null);
    setDayNumber(itineraries.length + 1);
    setDayTitle(`Day ${itineraries.length + 1}: `);
    setDayDescription('');
    setDayPlaces('');
    setSelectedPlaceChips([]);
    setDayActivities('');
    setDayDate('');
    setDayHighlights('');
    setDayTravelDetails('');
    setDayStartTime('09:00 AM');
    setDayEndTime('06:00 PM');
    setDayImageUrl('');
    setDayImages([]);
    setNewImageUrlInput('');

    // Reset hotel
    setDayHotelId('');
    setDayHotelName('');
    setDayHotelStarCategory('');
    setDayHotelImageUrl('');
    setDayHotelLocation('');
    setDayHotelDetails('');
    setDayMealPlan('Breakfast & Dinner (MAP)');

    // Attempt auto-match state and district from package destination
    if (pkg?.destination) {
      const destLower = pkg.destination.toLowerCase();
      let matchedState = 'Tamil Nadu';
      let matchedDistrict = 'The Nilgiris (Ooty)';
      for (const s of INDIA_STATES_AND_DISTRICTS) {
        if (destLower.includes(s.state.toLowerCase())) {
          matchedState = s.state;
        }
        for (const d of s.districts) {
          if (destLower.includes(d.toLowerCase())) {
            matchedState = s.state;
            matchedDistrict = d;
            break;
          }
        }
      }
      setDaySelectedState(matchedState);
      setDaySelectedDistrict(matchedDistrict);
    }

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

    // Populate chips
    if (item.places) {
      const chips = item.places.split(',').map((p: string) => p.trim()).filter(Boolean);
      setSelectedPlaceChips(chips);
    } else {
      setSelectedPlaceChips([]);
    }

    // Populate hotel
    setDayHotelId(item.hotelId || '');
    setDayHotelName(item.hotelName || '');
    setDayHotelStarCategory(item.hotelStarCategory || '');
    setDayHotelImageUrl(item.hotelImageUrl || '');
    setDayHotelLocation(item.hotelLocation || '');
    setDayHotelDetails(item.hotelDetails || '');
    setDayMealPlan(item.mealPlan || 'Breakfast & Dinner (MAP)');

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

  // 1-Click Select Place from Master Library
  const handleSelectMasterPlace = (place: Place) => {
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

    if (place.imageUrl && !dayImages.some((img) => img.url === place.imageUrl)) {
      setDayImages((prev) => [...prev, { url: place.imageUrl!, label: place.name }]);
      if (!dayImageUrl) setDayImageUrl(place.imageUrl);
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

  // 1-Click Select Hotel from Master Library
  const handleSelectMasterHotel = (hotel: Hotel) => {
    setDayHotelId(hotel.id);
    setDayHotelName(hotel.name);
    setDayHotelStarCategory(hotel.starCategory || '3 Star Comfort');
    setDayHotelImageUrl(hotel.imageUrl || '');
    setDayHotelLocation(`${hotel.city ? `${hotel.city}, ` : ''}${hotel.district}`);
    setDayHotelDetails(hotel.description || hotel.address || '');
  };

  const handleClearHotel = () => {
    setDayHotelId('');
    setDayHotelName('');
    setDayHotelStarCategory('');
    setDayHotelImageUrl('');
    setDayHotelLocation('');
    setDayHotelDetails('');
  };


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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            canvas.toBlob(
              (blob) => {
                resolve({ blob: blob || file, dataUrl });
              },
              'image/jpeg',
              0.75
            );
          } else {
            const raw = reader.result as string;
            resolve({ blob: file, dataUrl: raw });
          }
        };
        img.onerror = () => {
          const raw = reader.result as string;
          resolve({ blob: file, dataUrl: raw });
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve({ blob: file, dataUrl: '' });
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
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 20 MB and was skipped.`);
        continue;
      }

      const { blob, dataUrl } = await compressImage(file);
      let uploadedUrl = '';

      try {
        const formData = new FormData();
        const safeFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg';
        formData.append('image', blob, safeFileName);
        formData.append('folder', 'itineraries');
        const res = await api.post('/upload/image?folder=itineraries', formData);
        if (res.data?.url) {
          uploadedUrl = res.data.url;
        }
      } catch (err) {
        console.warn('Server upload fallback to compressed image:', err);
      }

      if (!uploadedUrl) {
        uploadedUrl = dataUrl;
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
        ...(dayIndex !== null && itineraries[dayIndex]?.id ? { id: itineraries[dayIndex].id } : {}),
        dayNumber: Number(dayNumber) || 1,
        title: dayTitle.trim() || `Day ${dayNumber}`,
        description: dayDescription.trim(),
        places: selectedPlaceChips.length > 0 ? selectedPlaceChips.join(', ') : dayPlaces.trim() || null,
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
      };

      // Persist the specific day directly to avoid 413 (Content Too Large) payload limit on serverless
      const res = await api.post('/packages/' + id + '/itineraries/day', { day: newDay });
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      } else {
        let updated = [...itineraries];
        if (dayIndex !== null) {
          updated[dayIndex] = newDay;
        } else {
          updated.push(newDay);
        }
        updated.sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
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

    setIsSaving(true);
    try {
      const dayIdentifier = targetDay?.id || targetDay?.dayNumber || (index + 1);
      const res = await api.delete('/packages/' + id + '/itineraries/day/' + dayIdentifier);
      if (res.data?.itineraries) {
        setItineraries(res.data.itineraries);
        setPkg((prev: any) => prev ? { ...prev, itineraries: res.data.itineraries } : prev);
      } else {
        const updated = itineraries.filter((_, i) => i !== index);
        setItineraries(updated);
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
      let latestItineraries = itineraries;
      for (let idx = 0; idx < itineraries.length; idx++) {
        const d = itineraries[idx] as any;
        const dayPayload = {
          id: d.id,
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
        };
        const res = await api.post('/packages/' + id + '/itineraries/day', { day: dayPayload });
        if (res.data?.itineraries) {
          latestItineraries = res.data.itineraries;
        }
      }

      setItineraries(latestItineraries);
      setPkg((prev: any) => prev ? { ...prev, itineraries: latestItineraries } : prev);
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
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-40" />
        <div className="h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
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
                key={day.id || idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start justify-between gap-4 ${
                  draggedDayIndex === idx
                    ? 'opacity-40 border-dashed border-red-400 bg-red-50/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-850/40'
                }`}
              >
                {/* Drag handle & Up/Down Arrows */}
                <div className="flex items-center md:flex-col gap-1 self-start pt-0.5 text-slate-400">
                  <div
                    title="Drag to reorder day"
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing rounded"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    disabled={idx === 0 || isReordering}
                    onClick={() => handleMoveDay(idx, 'up')}
                    title="Move Day Up"
                    className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === itineraries.length - 1 || isReordering}
                    onClick={() => handleMoveDay(idx, 'down')}
                    title="Move Day Down"
                    className="p-1 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-3.5 flex-1 w-full">
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

                    {/* Assigned Hotel Card */}
                    {(day as any).hotelName && (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          {(day as any).hotelImageUrl ? (
                            <img
                              src={(day as any).hotelImageUrl}
                              alt={(day as any).hotelName}
                              className="w-8 h-8 rounded-lg object-cover border border-amber-200"
                            />
                          ) : (
                            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                              <Building className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {(day as any).hotelName}
                              </span>
                              {(day as any).hotelStarCategory && (
                                <span className="text-[9.5px] px-1.5 py-0.2 bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-semibold">
                                  {(day as any).hotelStarCategory}
                                </span>
                              )}
                            </div>
                            {(day as any).hotelLocation && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                {(day as any).hotelLocation}
                              </span>
                            )}
                          </div>
                        </div>

                        {(day as any).mealPlan && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                            <Utensils className="w-3 h-3 text-emerald-600" />
                            {(day as any).mealPlan}
                          </span>
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

                {/* Day Action Buttons: Copy, Edit, Delete */}
                <div className="flex items-center gap-1 flex-shrink-0 self-end md:self-start">
                  <button
                    type="button"
                    onClick={() => handleCopyDay(idx)}
                    title="Copy / Duplicate Day"
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditDay(idx)}
                    title="Edit Day"
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(idx)}
                    title="Remove Day"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
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

          {/* PLACE & DESTINATION MASTER SECTION */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#C91F28]" />
                  <span>Places & Attractions for Day {dayNumber}</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Pick sightseeing spots from the Place Master library or type custom destinations
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsQuickPlaceOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Place</span>
                </button>
              </div>
            </div>

            {/* State & District selectors for Place filtering */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">State</span>
                <select
                  value={daySelectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setDaySelectedState(newState);
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
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">District (Optional)</span>
                <select
                  value={daySelectedDistrict}
                  onChange={(e) => setDaySelectedDistrict(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                >
                  <option value="">All Districts ({daySelectedState})</option>
                  {dayAvailableDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Search Place</span>
                <div className="relative">
                  <input
                    type="text"
                    value={dayPlaceSearch}
                    onChange={(e) => setDayPlaceSearch(e.target.value)}
                    placeholder="Filter by name..."
                    className="w-full p-2 pl-7 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                </div>
              </div>
            </div>

            {/* Quick Pick from Master Places */}
            <div>
              <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                <span>Add Place from Library ({daySelectedDistrict ? daySelectedDistrict : daySelectedState}):</span>
                {isLoadingMasterData && <span className="text-[10px] text-slate-400">Loading catalog...</span>}
              </span>

              {(() => {
                const filtered = masterPlaces.filter((mp) => {
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
                            onClick={() => handleSelectMasterPlace(mp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-50 text-[#C91F28] border border-red-300 dark:bg-red-950/40 dark:border-red-800'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-[#C91F28]" />
                            <span>{mp.name}</span>
                            {isSelected ? <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-0.5" /> : <Plus className="w-3 h-3 text-slate-400 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div className="p-3 text-center text-[11px] text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1.5">
                    <span>No places found for {daySelectedDistrict ? daySelectedDistrict : daySelectedState}.</span>
                    <button
                      type="button"
                      onClick={() => setIsQuickPlaceOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C91F28] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create and add new place to library</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Selected Places Ordered Chips */}
            <div>
              <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Selected Places for this Day (Drag or use arrows to order itinerary stops):
              </span>

              {selectedPlaceChips.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedPlaceChips.map((chip, chipIdx) => (
                    <div
                      key={chipIdx}
                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#C91F28] font-bold text-[10px] flex items-center justify-center">
                          {chipIdx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{chip}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          disabled={chipIdx === 0}
                          onClick={() => handleMovePlaceChip(chipIdx, 'up')}
                          title="Move place earlier"
                          className="p-1 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={chipIdx === selectedPlaceChips.length - 1}
                          onClick={() => handleMovePlaceChip(chipIdx, 'down')}
                          title="Move place later"
                          className="p-1 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePlaceChip(chip)}
                          title="Remove place"
                          className="p-1 hover:text-rose-600 cursor-pointer ml-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 text-[11px] text-slate-400 italic">
                  No places selected yet. Pick from above or type manually below.
                </div>
              )}
            </div>

            {/* Manual Places text input fallback */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Places Summary Text (Automatically synced with selected places)
              </label>
              <input
                type="text"
                value={dayPlaces}
                onChange={(e) => {
                  setDayPlaces(e.target.value);
                  setSelectedPlaceChips(e.target.value.split(',').map((p) => p.trim()).filter(Boolean));
                }}
                placeholder="e.g. Ooty Lake, Botanical Garden, Doddabetta Peak"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Activities */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Activities & Sightseeing Highlights</label>
            <input
              type="text"
              value={dayActivities}
              onChange={(e) => setDayActivities(e.target.value)}
              placeholder="e.g. Boating, heritage walk, sunset tea tasting"
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none text-xs"
            />
          </div>

          {/* HOTEL ACCOMMODATION SECTION */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  <span>Hotel Accommodation for Night {dayNumber}</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Choose from existing hotel library or add a new hotel
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {dayHotelName && (
                  <button
                    type="button"
                    onClick={handleClearHotel}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear Hotel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsHotelPickerOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-900/50 transition-colors cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Add Hotel from Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickHotelOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Hotel</span>
                </button>
              </div>
            </div>

            {/* Currently Selected Hotel Card */}
            {dayHotelName ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-800 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {dayHotelImageUrl ? (
                    <img
                      src={dayHotelImageUrl}
                      alt={dayHotelName}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center flex-shrink-0 text-amber-700">
                      <Building className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {dayHotelName}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                        {dayHotelStarCategory || '3 Star'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                      {dayHotelLocation || 'Location specified in itinerary'} • {dayMealPlan}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsHotelPickerOpen(true)}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHotel}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove hotel from this day"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <span className="text-xs text-slate-500 block">No hotel selected for Night {dayNumber} yet.</span>
                <button
                  type="button"
                  onClick={() => setIsHotelPickerOpen(true)}
                  className="mt-1 text-xs font-semibold text-[#C91F28] hover:underline cursor-pointer"
                >
                  Click "Add Hotel from Library" to choose an existing hotel
                </button>
              </div>
            )}

            {/* Hotel Form Fields for fine-tuning */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Selected Hotel / Resort Name
                </label>
                <input
                  type="text"
                  value={dayHotelName}
                  onChange={(e) => setDayHotelName(e.target.value)}
                  placeholder="e.g. Heritage Hill Resort / Sterling Ooty"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Star Category
                </label>
                <input
                  type="text"
                  value={dayHotelStarCategory}
                  onChange={(e) => setDayHotelStarCategory(e.target.value)}
                  placeholder="e.g. 4 Star, Heritage Resort"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>

            {/* Meal Plan & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Meal Plan Included
                </label>
                <select
                  value={dayMealPlan}
                  onChange={(e) => setDayMealPlan(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
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
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Hotel Area / District
                </label>
                <input
                  type="text"
                  value={dayHotelLocation}
                  onChange={(e) => setDayHotelLocation(e.target.value)}
                  placeholder="e.g. Ooty Town, Madikeri Hills"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
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
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-xs">Recommended Formal Photo Resolution & Sizing:</span>
                <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                  • <strong>Single Photo (Full Width):</strong> <strong>1200 × 750 px</strong> (Ratio <strong>16:10</strong>) or <strong>1280 × 720 px</strong> (Ratio <strong>16:9</strong>) — fits the A4 PDF page width with high clarity.<br />
                  • <strong>Multiple Photos (2-3 Grid):</strong> <strong>800 × 600 px</strong> (Ratio <strong>4:3</strong>) or <strong>1200 × 800 px</strong> (Ratio <strong>3:2</strong>).<br />
                  • <strong>Recommended File Size:</strong> Under <strong>5 MB</strong> per photo (JPG, PNG, WebP) for fast PDF generation and print sharpness.
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
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}
                            {idx < dayImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'down')}
                                title="Move down"
                                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                title="Set as Cover Photo"
                                className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors cursor-pointer"
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

      {/* Quick Add Place Modal */}
      <PlaceModal
        isOpen={isQuickPlaceOpen}
        onClose={() => setIsQuickPlaceOpen(false)}
        defaultState={daySelectedState}
        defaultDistrict={daySelectedDistrict}
        onSuccess={(savedPlace) => {
          masterDataCache.current.clear();
          loadMasterDataForDay(daySelectedState, daySelectedDistrict);
          handleSelectMasterPlace(savedPlace);
          showToast(`Place "${savedPlace.name}" added to Place Library and selected for Day ${dayNumber}!`);
        }}
      />

      {/* Quick Add Hotel Modal */}
      <HotelModal
        isOpen={isQuickHotelOpen}
        onClose={() => setIsQuickHotelOpen(false)}
        defaultState={daySelectedState}
        defaultDistrict={daySelectedDistrict}
        onSuccess={(savedHotel) => {
          masterDataCache.current.clear();
          loadMasterDataForDay(daySelectedState, daySelectedDistrict);
          handleSelectMasterHotel(savedHotel);
          showToast(`Hotel "${savedHotel.name}" added to Hotel Library and selected for Day ${dayNumber}!`);
        }}
      />

      {/* Hotel Library Selector Modal */}
      <Modal
        isOpen={isHotelPickerOpen}
        onClose={() => setIsHotelPickerOpen(false)}
        title={`Hotel Library — Select Hotel for Day ${dayNumber}`}
        subtitle="Pick an existing hotel from your verified database in 1 click without recreating"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={dayHotelSearch}
                onChange={(e) => setDayHotelSearch(e.target.value)}
                placeholder="Search hotel name, city, amenities..."
                className="w-full p-2 pl-7 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div>
              <select
                value={daySelectedState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setDaySelectedState(newState);
                  setDaySelectedDistrict('');
                }}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs"
              >
                {INDIA_STATES_AND_DISTRICTS.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={daySelectedDistrict}
                onChange={(e) => setDaySelectedDistrict(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl text-xs"
              >
                <option value="">All Districts ({daySelectedState})</option>
                {dayAvailableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
              Available Hotels in {daySelectedDistrict ? daySelectedDistrict : daySelectedState}:
            </span>
            <button
              type="button"
              onClick={() => {
                setIsHotelPickerOpen(false);
                setIsQuickHotelOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C91F28] hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Not in library? Create New Hotel</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {isLoadingMasterData ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#C91F28]" />
                <span>Loading hotels from database library...</span>
              </div>
            ) : (() => {
              const q = dayHotelSearch.toLowerCase().trim();
              const filtered = masterHotels.filter((h) => {
                if (!q) return true;
                return (
                  h.name.toLowerCase().includes(q) ||
                  h.city?.toLowerCase().includes(q) ||
                  h.district.toLowerCase().includes(q) ||
                  h.starCategory?.toLowerCase().includes(q) ||
                  h.amenities?.toLowerCase().includes(q)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Building className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      No hotels found in {daySelectedDistrict || daySelectedState}.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Create New Hotel" to add one permanently to the library.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHotelPickerOpen(false);
                        setIsQuickHotelOpen(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Hotel</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filtered.map((h) => {
                    const isCurrent = dayHotelId === h.id || dayHotelName === h.name;
                    return (
                      <div
                        key={h.id}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isCurrent
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {h.imageUrl ? (
                          <img
                            src={h.imageUrl}
                            alt={h.name}
                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center flex-shrink-0 text-amber-700">
                            <Building className="w-6 h-6" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {h.name}
                            </h4>
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded shrink-0">
                              {h.starCategory || '3 Star'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" />
                            <span className="truncate">{h.city ? `${h.city}, ` : ''}{h.district}</span>
                          </div>

                          {h.address && (
                            <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                              {h.address}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectMasterHotel(h);
                                setIsHotelPickerOpen(false);
                                showToast(`Hotel "${h.name}" selected for Day ${dayNumber}!`);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                            >
                              {isCurrent ? '✓ Selected' : 'Select Hotel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  X,
  Camera,
  Layers,
  CheckCircle2,
  FileText,
  Search,
  Image as ImageIcon,
  Loader2,
  Check,
  Globe,
  Mail,
  Phone,
  Copy,
  Building,
  Hotel as HotelIcon,
  RotateCcw,
  Star,
  Utensils,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { printElement } from '../../utils/printDocument.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { api } from '../../api/client.js';
import { LocationSelector } from '../common/LocationSelector.js';
import { ProfessionalImageUploader } from '../common/ProfessionalImageUploader.js';
import { notifySuccess, notifyError, notifyWarning, confirmAction } from '../../utils/sweetalert.js';

interface CustomItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PlacePhotoView {
  label: string;
  url: string;
}

interface DestinationPlaceItem {
  id: string;
  name: string;
  state: string;
  district: string;
  category: string;
  famousReason: string;
  suggestedDuration: string;
  distanceFromCenter?: string;
  imageUrl: string;
  views?: PlacePhotoView[];
  activities: string[];
}

interface ItineraryDayPlan {
  dayNumber: number;
  title: string;
  description: string;
  places: string;
  activities: string;
  startTime: string;
  endTime: string;
  imageUrl?: string;
  imageUrls?: string[];
  hotelName?: string;
  hotelType?: string;
  hotelStarCategory?: string;
  hotelImageUrl?: string;
  hotelLocation?: string;
  mealPlan?: string;
  notes?: string;
}

const createFreshDay = (dayNum: number): ItineraryDayPlan => ({
  dayNumber: dayNum,
  title: `Day ${dayNum}: Sightseeing & Exploration`,
  description: '',
  places: '',
  activities: '',
  startTime: '09:00 AM',
  endTime: '06:00 PM',
  imageUrl: '',
  imageUrls: [],
  hotelName: '',
  hotelStarCategory: '3 Star',
  hotelImageUrl: '',
  hotelLocation: '',
  mealPlan: 'Breakfast & Dinner (MAP)',
  notes: '',
});

export const CustomItineraryModal: React.FC<CustomItineraryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { company } = useCompanySettings();

  // Step navigation: 'builder' | 'preview'
  const [activeView, setActiveView] = useState<'builder' | 'preview'>('builder');

  // Package / Trip details - Clean initial state (no hardcoded fake Ooty defaults)
  const [tripTitle, setTripTitle] = useState('');
  const [approxPrice, setApproxPrice] = useState('');
  const [packageType, setPackageType] = useState('HOLIDAY');

  // Multi-level Location Selection
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  // Destination Database & AI Suggestions
  const [destinationCards, setDestinationCards] = useState<DestinationPlaceItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Master Data Access (Places Master & Hotels Master)
  const [activeCatalogTab, setActiveCatalogTab] = useState<'places' | 'hotels' | 'ai'>('places');
  const [masterPlaces, setMasterPlaces] = useState<any[]>([]);
  const [masterHotels, setMasterHotels] = useState<any[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Custom Place Dialog
  const [isCustomPlaceOpen, setIsCustomPlaceOpen] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [customPlaceDesc, setCustomPlaceDesc] = useState('');
  const [customPlaceDuration, setCustomPlaceDuration] = useState('2 Hours');
  const [customPlaceActivities, setCustomPlaceActivities] = useState('');
  const [customPlaceImage, setCustomPlaceImage] = useState('');
  const [isSavingCustomPlace, setIsSavingCustomPlace] = useState(false);

  // Custom Hotel Dialog
  const [isCustomHotelOpen, setIsCustomHotelOpen] = useState(false);
  const [customHotelName, setCustomHotelName] = useState('');
  const [customHotelStar, setCustomHotelStar] = useState('3 Star');
  const [customHotelCity, setCustomHotelCity] = useState('');
  const [customHotelMealPlan, setCustomHotelMealPlan] = useState('Breakfast & Dinner (MAP)');
  const [customHotelImage, setCustomHotelImage] = useState('');

  // Photo Gallery Picker Modal
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryPlace, setGalleryPlace] = useState<DestinationPlaceItem | null>(null);

  // Day-wise Builder State - Clean single Day 1 to start
  const [days, setDays] = useState<ItineraryDayPlan[]>([createFreshDay(1)]);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Update districts when state changes
  useEffect(() => {
    const found = INDIA_STATES_AND_DISTRICTS.find((s) => s.state === selectedState);
    if (found) {
      setAvailableDistricts(found.districts);
      if (!found.districts.includes(selectedDistrict)) {
        setSelectedDistrict(found.districts[0] || '');
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [selectedState]);

  // Load AI suggestions and master data for selected district
  const loadPlacesForLocation = async (state: string, district: string) => {
    setIsAiLoading(true);
    setIsLoadingMaster(true);
    try {
      let pUrl = `/places?state=${encodeURIComponent(state)}`;
      let hUrl = `/hotels?state=${encodeURIComponent(state)}`;
      if (district) {
        pUrl += `&district=${encodeURIComponent(district)}`;
        hUrl += `&district=${encodeURIComponent(district)}`;
      }

      const [aiRes, customRes, placesRes, hotelsRes] = await Promise.all([
        api.post('/packages/ai-suggest', { state, district }).catch(() => ({ data: { places: [] } })),
        api.get(`/packages/destinations/places?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`).catch(() => ({ data: { places: [] } })),
        api.get(pUrl).catch(() => ({ data: { places: [] } })),
        api.get(hUrl).catch(() => ({ data: { hotels: [] } })),
      ]);

      const aiPlaces: DestinationPlaceItem[] = aiRes.data?.places || [];
      const customPlaces: DestinationPlaceItem[] = customRes.data?.places || [];
      let mPlaces: any[] = placesRes.data?.places || [];
      let mHotels: any[] = hotelsRes.data?.hotels || [];

      // If district has no registered master places/hotels, fallback to state-level
      if (mPlaces.length === 0 && district) {
        const fallbackRes = await api.get(`/places?state=${encodeURIComponent(state)}`).catch(() => ({ data: { places: [] } }));
        mPlaces = fallbackRes.data?.places || [];
      }
      if (mHotels.length === 0 && district) {
        const fallbackHotelRes = await api.get(`/hotels?state=${encodeURIComponent(state)}`).catch(() => ({ data: { hotels: [] } }));
        mHotels = fallbackHotelRes.data?.hotels || [];
      }

      setMasterPlaces(mPlaces);
      setMasterHotels(mHotels);

      // Merge avoiding duplicate names
      const map = new Map<string, DestinationPlaceItem>();
      customPlaces.forEach((p) => map.set(p.name.toLowerCase(), p));
      aiPlaces.forEach((p) => {
        if (!map.has(p.name.toLowerCase())) {
          map.set(p.name.toLowerCase(), p);
        }
      });
      mPlaces.forEach((p) => {
        if (!map.has(p.name.toLowerCase())) {
          map.set(p.name.toLowerCase(), {
            id: p.id,
            name: p.name,
            state: p.state,
            district: p.district,
            category: p.category || 'Sightseeing',
            famousReason: p.description || p.famousReason || p.name,
            suggestedDuration: p.suggestedDuration || '2 Hours',
            distanceFromCenter: p.distanceFromCenter,
            imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
            activities: p.activities
              ? (typeof p.activities === 'string'
                  ? p.activities.split(',').map((a: string) => a.trim()).filter(Boolean)
                  : p.activities)
              : ['Sightseeing', 'Photography'],
          });
        }
      });

      setDestinationCards(Array.from(map.values()));
    } catch (err) {
      console.error('Failed to fetch destination suggestions and master data:', err);
    } finally {
      setIsAiLoading(false);
      setIsLoadingMaster(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedState && selectedDistrict) {
      loadPlacesForLocation(selectedState, selectedDistrict);
    }
  }, [isOpen, selectedState, selectedDistrict]);

  // 1-Click Assign Hotel from Master Library
  const handleAssignMasterHotel = (hotel: any) => {
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;
    curDay.hotelName = hotel.name;
    curDay.hotelStarCategory = hotel.starCategory || '3 Star';
    curDay.hotelImageUrl = hotel.imageUrl || undefined;
    curDay.hotelLocation = hotel.city || hotel.district || hotel.address || undefined;
    curDay.mealPlan = curDay.mealPlan || 'Breakfast & Dinner (MAP)';
    setDays(updated);
    notifySuccess('Hotel Assigned!', `Assigned ${hotel.name} (${curDay.hotelStarCategory}) to Day ${curDay.dayNumber}.`);
  };

  // Add Custom Hotel
  const handleAssignCustomHotel = () => {
    if (!customHotelName.trim()) {
      notifyWarning('Validation', 'Please enter a hotel name.');
      return;
    }
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;
    curDay.hotelName = customHotelName.trim();
    curDay.hotelStarCategory = customHotelStar;
    curDay.hotelLocation = customHotelCity.trim() || selectedDistrict;
    curDay.mealPlan = customHotelMealPlan;
    curDay.hotelImageUrl = customHotelImage.trim() || undefined;
    setDays(updated);

    // Reset and close
    setCustomHotelName('');
    setCustomHotelCity('');
    setCustomHotelImage('');
    setIsCustomHotelOpen(false);
    notifySuccess('Custom Hotel Assigned!', `Assigned ${curDay.hotelName} to Day ${curDay.dayNumber}.`);
  };

  // Remove Hotel from active day
  const handleRemoveHotel = () => {
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;
    curDay.hotelName = '';
    curDay.hotelStarCategory = '';
    curDay.hotelImageUrl = '';
    curDay.hotelLocation = '';
    setDays(updated);
  };

  // 1-Click Add Place from Master Library: Automatically appends Place Name, Description, Activities & Photos
  const handleAddMasterPlace = (place: any) => {
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;

    // 1. Append Place Name
    const currentPlaces = curDay.places ? curDay.places.split(',').map((p) => p.trim()).filter(Boolean) : [];
    if (!currentPlaces.some((p) => p.toLowerCase() === place.name.toLowerCase())) {
      currentPlaces.push(place.name);
      curDay.places = currentPlaces.join(', ');
    }

    // 2. Intelligently Append Place Description (User Requirement: descriptions must be auto-added)
    const placeDesc = (place.description || place.famousReason || '').trim();
    if (placeDesc) {
      if (!curDay.description || curDay.description.trim() === '') {
        curDay.description = `${place.name}: ${placeDesc}`;
      } else if (!curDay.description.toLowerCase().includes(place.name.toLowerCase())) {
        curDay.description = `${curDay.description.trim()}\n\n• ${place.name}: ${placeDesc}`;
      }
    }

    // 3. Auto-suggest title if default or empty
    if (
      !curDay.title ||
      curDay.title.includes('Sightseeing & Exploration') ||
      (curDay.title.startsWith('Day ') && curDay.title.length < 12)
    ) {
      curDay.title = `Day ${curDay.dayNumber}: ${currentPlaces.slice(0, 2).join(' & ')} Sightseeing`;
    }

    // 4. Auto-append Activities
    if (place.activities) {
      const actList = typeof place.activities === 'string'
        ? place.activities.split(/[,;•]+/).map((a: string) => a.trim()).filter(Boolean)
        : (Array.isArray(place.activities) ? place.activities : []);
      const currentActs = curDay.activities
        ? curDay.activities.split(/[,;•]+/).map((a) => a.trim()).filter(Boolean)
        : [];
      actList.forEach((act: string) => {
        if (!currentActs.some((a) => a.toLowerCase() === act.toLowerCase())) {
          currentActs.push(act);
        }
      });
      curDay.activities = currentActs.join(', ');
    }

    // 5. Append Photo
    if (place.imageUrl) {
      const existing = curDay.imageUrls && curDay.imageUrls.length > 0
        ? [...curDay.imageUrls]
        : (curDay.imageUrl ? [curDay.imageUrl] : []);
      if (!existing.includes(place.imageUrl)) {
        existing.push(place.imageUrl);
      }
      curDay.imageUrls = existing;
      if (!curDay.imageUrl) curDay.imageUrl = place.imageUrl;
    }

    setDays(updated);
    notifySuccess('Place Added!', `Added "${place.name}" with full description and photos to Day ${curDay.dayNumber}.`);
  };

  // Add place from AI / Catalog Card
  const handleAddPlaceToDay = (place: DestinationPlaceItem) => {
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;

    // 1. Append Place Name
    const currentPlaces = curDay.places ? curDay.places.split(',').map((p) => p.trim()).filter(Boolean) : [];
    if (!currentPlaces.some((p) => p.toLowerCase() === place.name.toLowerCase())) {
      currentPlaces.push(place.name);
      curDay.places = currentPlaces.join(', ');
    }

    // 2. Append Description
    const placeDesc = (place.famousReason || '').trim();
    if (placeDesc) {
      if (!curDay.description || curDay.description.trim() === '') {
        curDay.description = `${place.name}: ${placeDesc}`;
      } else if (!curDay.description.toLowerCase().includes(place.name.toLowerCase())) {
        curDay.description = `${curDay.description.trim()}\n\n• ${place.name}: ${placeDesc}`;
      }
    }

    // 3. Auto-suggest title
    if (
      !curDay.title ||
      curDay.title.includes('Sightseeing & Exploration') ||
      (curDay.title.startsWith('Day ') && curDay.title.length < 12)
    ) {
      curDay.title = `Day ${curDay.dayNumber}: ${currentPlaces.slice(0, 2).join(' & ')} Sightseeing`;
    }

    // 4. Append Activities
    if (place.activities && place.activities.length > 0) {
      const currentActs = curDay.activities
        ? curDay.activities.split(/[,;•]+/).map((a) => a.trim()).filter(Boolean)
        : [];
      place.activities.forEach((act) => {
        if (!currentActs.some((a) => a.toLowerCase() === act.toLowerCase())) {
          currentActs.push(act);
        }
      });
      curDay.activities = currentActs.join(', ');
    }

    // 5. Append Photo
    if (place.imageUrl) {
      const existing = curDay.imageUrls && curDay.imageUrls.length > 0
        ? [...curDay.imageUrls]
        : (curDay.imageUrl ? [curDay.imageUrl] : []);
      if (!existing.includes(place.imageUrl)) {
        existing.push(place.imageUrl);
      }
      curDay.imageUrls = existing;
      if (!curDay.imageUrl) curDay.imageUrl = place.imageUrl;
    }

    setDays(updated);
    notifySuccess('Place Added!', `Added "${place.name}" with description to Day ${curDay.dayNumber}.`);
  };

  // Remove individual place chip
  const handleRemovePlaceChip = (placeName: string) => {
    const updated = [...days];
    const curDay = updated[activeDayIndex];
    if (!curDay) return;
    const currentPlaces = curDay.places ? curDay.places.split(',').map((p) => p.trim()).filter(Boolean) : [];
    const filtered = currentPlaces.filter((p) => p.toLowerCase() !== placeName.toLowerCase());
    curDay.places = filtered.join(', ');
    setDays(updated);
  };

  // Open Image Gallery modal for a place
  const handleOpenGallery = (place: DestinationPlaceItem) => {
    setGalleryPlace(place);
    setGalleryModalOpen(true);
  };

  // Choose photo view from gallery for active day
  const handleSelectPhotoView = (photoUrl: string) => {
    const updated = [...days];
    if (updated[activeDayIndex]) {
      const existing = updated[activeDayIndex].imageUrls || (updated[activeDayIndex].imageUrl ? [updated[activeDayIndex].imageUrl] : []);
      const newUrls = [photoUrl, ...existing.filter((u) => u !== photoUrl)];
      updated[activeDayIndex].imageUrl = photoUrl;
      updated[activeDayIndex].imageUrls = newUrls;
      setDays(updated);
    }
    setGalleryModalOpen(false);
  };

  // Add custom place and save to DB
  const handleAddCustomPlace = async () => {
    if (!customPlaceName.trim()) {
      notifyWarning('Validation', 'Please enter a place name.');
      return;
    }

    setIsSavingCustomPlace(true);
    try {
      const payload = {
        name: customPlaceName.trim(),
        state: selectedState,
        district: selectedDistrict,
        description: customPlaceDesc.trim() || `${customPlaceName.trim()} in ${selectedDistrict}`,
        suggestedDuration: customPlaceDuration || '2 Hours',
        imageUrl: customPlaceImage.trim() || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        activities: customPlaceActivities
          ? customPlaceActivities.split(',').map((a) => a.trim()).filter(Boolean)
          : ['Sightseeing', 'Photography'],
      };

      const res = await api.post('/packages/destinations/places', payload);
      const savedPlace: DestinationPlaceItem = res.data?.place || { ...payload, id: String(Date.now()) };

      // Add to local state & select for active day
      setDestinationCards((prev) => [savedPlace, ...prev]);
      handleAddPlaceToDay(savedPlace);

      // Reset form
      setCustomPlaceName('');
      setCustomPlaceDesc('');
      setCustomPlaceActivities('');
      setCustomPlaceImage('');
      setIsCustomPlaceOpen(false);
    } catch (err) {
      console.error('Failed to save custom place:', err);
      notifyWarning('Place Added Locally', 'Could not save place to database. Added to itinerary only.');
    } finally {
      setIsSavingCustomPlace(false);
    }
  };

  // Day operations
  const handleAddDay = () => {
    const nextNum = days.length + 1;
    const newDay = createFreshDay(nextNum);
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) {
      notifyWarning('Validation', 'An itinerary must contain at least 1 day.');
      return;
    }
    const filtered = days
      .filter((_, i) => i !== index)
      .map((d, i) => ({
        ...d,
        dayNumber: i + 1,
        title: d.title.startsWith('Day ')
          ? `Day ${i + 1}: ${d.title.split(':').slice(1).join(':').trim()}`
          : d.title,
      }));
    setDays(filtered);
    setActiveDayIndex(Math.max(0, index - 1));
  };

  const handleMoveDay = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= days.length) return;
    const reordered = [...days];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const renumbered = reordered.map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      title: d.title.startsWith('Day ')
        ? `Day ${i + 1}: ${d.title.split(':').slice(1).join(':').trim()}`
        : d.title,
    }));
    setDays(renumbered);
    setActiveDayIndex(targetIndex);
  };

  const handleCopyDay = (index: number) => {
    const dayToCopy = days[index];
    if (!dayToCopy) return;
    const copiedDay: ItineraryDayPlan = {
      ...dayToCopy,
      dayNumber: index + 2,
      title: dayToCopy.title.startsWith('Day ')
        ? `Day ${index + 2}: ${dayToCopy.title.split(':').slice(1).join(':').trim()} (Copy)`
        : `${dayToCopy.title} (Copy)`,
      imageUrls: dayToCopy.imageUrls ? [...dayToCopy.imageUrls] : (dayToCopy.imageUrl ? [dayToCopy.imageUrl] : []),
    };
    const updated = [...days];
    updated.splice(index + 1, 0, copiedDay);
    const renumbered = updated.map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      title: d.title.startsWith('Day ')
        ? `Day ${i + 1}: ${d.title.split(':').slice(1).join(':').trim()}`
        : d.title,
    }));
    setDays(renumbered);
    setActiveDayIndex(index + 1);
  };

  // Reset entire form to clean state
  const handleResetItinerary = async () => {
    const confirmed = await confirmAction({
      title: 'Reset Itinerary?',
      text: 'This will clear all entered days and restart with a clean Day 1. Are you sure?',
      confirmText: 'Yes, Reset',
    });
    if (confirmed) {
      setTripTitle('');
      setApproxPrice('');
      setDays([createFreshDay(1)]);
      setActiveDayIndex(0);
      notifySuccess('Reset Complete', 'Itinerary builder reset to clean Day 1.');
    }
  };

  // Save to CRM Database as Package with ALL Day Itinerary & Hotel Fields
  const handleSaveToDatabase = async () => {
    try {
      const finalTitle = tripTitle.trim() || `${selectedDistrict} Custom Tour`;
      setIsSaving(true);
      const durationStr = `${days.length} Days / ${Math.max(1, days.length - 1)} Nights`;

      const allPackagePhotos: string[] = [];
      days.forEach((d) => {
        const photos = d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls : (d.imageUrl ? [d.imageUrl] : []);
        photos.forEach((p) => {
          if (p && !allPackagePhotos.includes(p)) {
            allPackagePhotos.push(p);
          }
        });
      });

      const payload = {
        packageName: finalTitle,
        destination: selectedDistrict,
        duration: durationStr,
        description: `Custom curated itinerary for ${selectedDistrict}, ${selectedState} covering ${days.length} days of sightseeing and activities.`,
        price: parseFloat(approxPrice) || 0,
        packageType,
        imageUrl: allPackagePhotos[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
        gallery: allPackagePhotos.length > 0 ? JSON.stringify(allPackagePhotos) : null,
        itineraries: days.map((d, idx) => {
          const allPhotos = d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls : (d.imageUrl ? [d.imageUrl] : []);
          return {
            dayNumber: Number(d.dayNumber) || (idx + 1),
            title: d.title || `Day ${idx + 1}: Sightseeing`,
            description: d.description || '',
            places: d.places || '',
            activities: d.activities || '',
            startTime: d.startTime || '09:00 AM',
            endTime: d.endTime || '06:00 PM',
            imageUrl: allPhotos[0] || null,
            images: allPhotos.length > 0 ? JSON.stringify(allPhotos) : null,
            hotelName: d.hotelName || null,
            hotelStarCategory: d.hotelStarCategory || null,
            hotelImageUrl: d.hotelImageUrl || null,
            hotelLocation: d.hotelLocation || null,
            mealPlan: d.mealPlan || null,
            hotelDetails: d.notes || null,
          };
        }),
      };

      await api.post('/packages', payload);
      if (onSuccess) onSuccess();
      notifySuccess('Itinerary Saved!', `Itinerary successfully saved to CRM Package catalog as "${payload.packageName}"!`);
      onClose();
    } catch (err: any) {
      notifyError('Save Failed', err.response?.data?.message || 'Failed to save itinerary to CRM database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dedicated Print handler via isolated iframe
  const handlePrint = async () => {
    await printElement('itinerary-document', {
      title: tripTitle || `${selectedDistrict} Custom Tour Itinerary`,
    });
  };

  // Dedicated PDF Download via high-fidelity Print Pipeline
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanTitle = (tripTitle || `${selectedDistrict}_Custom_Itinerary`).replace(/[^a-zA-Z0-9]/g, '_');
      notifySuccess('Opening Print Process', 'Select "Save as PDF" in the print window to download with perfect alignment.');
      await printElement('itinerary-document', {
        title: `Itinerary_${cleanTitle}_${selectedDistrict.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
    } catch (err) {
      console.error('Failed to download itinerary PDF via print:', err);
      notifyError('Print Error', 'Could not open print window. Please try again or use the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  const curActiveDay = days[activeDayIndex] || days[0];
  const curDayPlacesList = curActiveDay?.places
    ? curActiveDay.places.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Custom Destination & Day-Wise Itinerary Builder"
        subtitle="Curate clean day-by-day itineraries with Place Master, Hotel Master & Custom spots"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Navigation & Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('builder')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'builder'
                    ? 'bg-[#C91F28] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Itinerary Builder</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('preview')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'preview'
                    ? 'bg-[#C91F28] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Preview & PDF Export</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeView === 'builder' && (
                <button
                  type="button"
                  onClick={handleResetItinerary}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-300 transition-colors cursor-pointer"
                  title="Clear all fields and restart with fresh Day 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Fresh</span>
                </button>
              )}

              {activeView === 'preview' && (
                <>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#C91F28]" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Download official PDF (via Print process)"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{isGeneratingPdf ? 'Preparing...' : 'Download PDF'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save to CRM Packages'}</span>
              </button>
            </div>
          </div>

          {activeView === 'builder' ? (
            <div className="space-y-4">
              {/* Tour Basic Details: Location, Title & Pricing */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <LocationSelector
                  selectedState={selectedState}
                  selectedDistrict={selectedDistrict}
                  onStateChange={(s) => setSelectedState(s)}
                  onDistrictChange={(d) => setSelectedDistrict(d)}
                  showPlace={false}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Tour Package Title <span className="text-slate-400 font-normal">(optional - defaults to district tour)</span>
                    </label>
                    <input
                      type="text"
                      value={tripTitle}
                      onChange={(e) => setTripTitle(e.target.value)}
                      placeholder={`e.g. Royal ${selectedDistrict || 'South India'} Explorer`}
                      className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Estimated Package Price (₹)
                    </label>
                    <input
                      type="number"
                      value={approxPrice}
                      onChange={(e) => setApproxPrice(e.target.value)}
                      placeholder="e.g. 24999"
                      className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Catalog, Places Master & Hotels Master */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                {/* Catalog Navigation Tabs & Actions */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab('places')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeCatalogTab === 'places'
                          ? 'bg-[#C91F28] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Places Master ({masterPlaces.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab('hotels')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeCatalogTab === 'hotels'
                          ? 'bg-[#C91F28] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <HotelIcon className="w-3.5 h-3.5" />
                      <span>Hotels Master ({masterHotels.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab('ai')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        activeCatalogTab === 'ai'
                          ? 'bg-[#C91F28] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>AI / Catalog ({destinationCards.length})</span>
                    </button>
                  </div>

                  {/* Filter and action tools */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Search places / hotels..."
                        className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C91F28] w-40 sm:w-48"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => loadPlacesForLocation(selectedState, selectedDistrict)}
                      disabled={isAiLoading || isLoadingMaster}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors text-[11px] shadow-2xs cursor-pointer"
                    >
                      {isAiLoading || isLoadingMaster ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>{isAiLoading ? 'Analyzing...' : 'Refresh'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomPlaceOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#C91F28]" />
                      <span>+ Custom Place</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomHotelOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>+ Custom Hotel</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Places Master Content */}
                {activeCatalogTab === 'places' && (
                  <div>
                    {masterPlaces.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          No places found in master database for {selectedDistrict || selectedState}.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Switch to AI / Catalog tab or click "+ Custom Place" to add new places.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                        {masterPlaces
                          .filter((p: any) => {
                            if (!catalogSearch) return true;
                            const q = catalogSearch.toLowerCase();
                            return (
                              p.name?.toLowerCase().includes(q) ||
                              p.category?.toLowerCase().includes(q) ||
                              p.description?.toLowerCase().includes(q)
                            );
                          })
                          .map((place: any) => (
                            <div
                              key={place.id || place.name}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                                    <img
                                      src={place.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'}
                                      alt={place.name}
                                      className="w-full h-full object-cover"
                                      onError={(e: any) => {
                                        e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                                      {place.name}
                                    </span>
                                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold block">
                                      {place.category || 'Attraction'} • {place.suggestedDuration || '2 Hours'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {place.description || place.famousReason || `Scenic landmark in ${place.district || selectedDistrict}`}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {place.district || selectedDistrict}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddMasterPlace(place)}
                                  className="px-2.5 py-1 bg-[#C91F28] hover:bg-[#a81920] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                  title="Add place name, description, activities & photo to Day"
                                >
                                  + Add to Day {activeDayIndex + 1}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Hotels Master Content */}
                {activeCatalogTab === 'hotels' && (
                  <div>
                    {masterHotels.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <HotelIcon className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          No hotels registered in master database for {selectedDistrict || selectedState}.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click "+ Custom Hotel" above to enter a custom stay for Day {activeDayIndex + 1}.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                        {masterHotels
                          .filter((h: any) => {
                            if (!catalogSearch) return true;
                            const q = catalogSearch.toLowerCase();
                            return (
                              h.name?.toLowerCase().includes(q) ||
                              h.starCategory?.toLowerCase().includes(q) ||
                              h.city?.toLowerCase().includes(q) ||
                              h.district?.toLowerCase().includes(q)
                            );
                          })
                          .map((hotel: any) => (
                            <div
                              key={hotel.id || hotel.name}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                                    <img
                                      src={hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80'}
                                      alt={hotel.name}
                                      className="w-full h-full object-cover"
                                      onError={(e: any) => {
                                        e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80';
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                                      {hotel.name}
                                    </span>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                                      ⭐ {hotel.starCategory || '3 Star'} • {hotel.city || hotel.district || selectedDistrict}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                  {hotel.address || hotel.description || `Premium hospitality partner in ${hotel.city || selectedDistrict}`}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {hotel.amenities ? hotel.amenities.slice(0, 20) + '...' : 'WiFi, Restaurant'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAssignMasterHotel(hotel)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                >
                                  🏨 Assign to Day {activeDayIndex + 1}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: AI & Curated Places */}
                {activeCatalogTab === 'ai' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                    {destinationCards
                      .filter((p) => {
                        if (!catalogSearch) return true;
                        const q = catalogSearch.toLowerCase();
                        return (
                          p.name?.toLowerCase().includes(q) ||
                          p.category?.toLowerCase().includes(q) ||
                          p.famousReason?.toLowerCase().includes(q)
                        );
                      })
                      .map((place) => (
                        <div
                          key={place.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md transition-shadow"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                onClick={() => handleOpenGallery(place)}
                                className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
                                title="Click to view photo gallery & angles"
                              >
                                <img
                                  src={place.imageUrl}
                                  alt={place.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e: any) => {
                                    e.target.src =
                                      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Camera className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                                  {place.name}
                                </span>
                                <span className="text-[10px] text-[#C91F28] font-semibold block">
                                  {place.category} • {place.suggestedDuration}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                              {place.famousReason}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2">
                            <button
                              type="button"
                              onClick={() => handleOpenGallery(place)}
                              className="text-[10px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Photo Views</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddPlaceToDay(place)}
                              className="px-2.5 py-1 bg-[#C91F28] hover:bg-[#a81920] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Add place name, description, activities & photo to Day"
                            >
                              + Add to Day {activeDayIndex + 1}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Custom Place Modal Form */}
              {isCustomPlaceOpen && (
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#C91F28]" />
                      <span>Add New Custom Tourist Place (Will auto-add description to Day {activeDayIndex + 1})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomPlaceOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Place Name (e.g. Needle Rock Viewpoint)"
                      value={customPlaceName}
                      onChange={(e) => setCustomPlaceName(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Activities (e.g. Photography, Sunset viewing)"
                      value={customPlaceActivities}
                      onChange={(e) => setCustomPlaceActivities(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Photo URL (Unsplash or direct image URL)"
                      value={customPlaceImage}
                      onChange={(e) => setCustomPlaceImage(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    />
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Description / Sightseeing details (automatically added to Day description)"
                        value={customPlaceDesc}
                        onChange={(e) => setCustomPlaceDesc(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddCustomPlace}
                        disabled={isSavingCustomPlace}
                        className="flex-1 py-2 bg-[#C91F28] hover:bg-[#a81920] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSavingCustomPlace ? 'Saving...' : 'Save & Add to Plan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomPlaceOpen(false)}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Hotel Modal Form */}
              {isCustomHotelOpen && (
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <HotelIcon className="w-4 h-4 text-emerald-600" />
                      <span>Add Custom Hotel Stay for Day {activeDayIndex + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomHotelOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      placeholder="Hotel Name (e.g. Royal Orchid Resort)"
                      value={customHotelName}
                      onChange={(e) => setCustomHotelName(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    />
                    <select
                      value={customHotelStar}
                      onChange={(e) => setCustomHotelStar(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    >
                      <option value="3 Star">3 Star Comfort</option>
                      <option value="4 Star">4 Star Premium</option>
                      <option value="5 Star">5 Star Luxury</option>
                      <option value="Resort">Resort & Spa</option>
                      <option value="Homestay">Heritage Homestay</option>
                      <option value="Budget">Budget Stay</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Location / City (e.g. Near Lake)"
                      value={customHotelCity}
                      onChange={(e) => setCustomHotelCity(e.target.value)}
                      className="p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                    />
                    <div>
                      <select
                        value={customHotelMealPlan}
                        onChange={(e) => setCustomHotelMealPlan(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      >
                        <option value="Breakfast & Dinner (MAP)">Breakfast & Dinner (MAP)</option>
                        <option value="Breakfast Included (CP)">Breakfast Included (CP)</option>
                        <option value="All Meals Included (AP)">All Meals (Breakfast, Lunch, Dinner - AP)</option>
                        <option value="Room Only (EP)">Room Only (EP)</option>
                        <option value="Dinner Only">Dinner Only</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Hotel Photo URL (optional)"
                        value={customHotelImage}
                        onChange={(e) => setCustomHotelImage(e.target.value)}
                        className="w-full p-2 border rounded-lg text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCustomHotelOpen(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAssignCustomHotel}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Assign Hotel to Day {activeDayIndex + 1}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Day-Wise Organizer Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-[80%]">
                    {days.map((d, index) => (
                      <button
                        key={d.dayNumber}
                        type="button"
                        onClick={() => setActiveDayIndex(index)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          activeDayIndex === index
                            ? 'bg-[#C91F28] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>Day {d.dayNumber}</span>
                        {d.places && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Day</span>
                  </button>
                </div>

                {/* Active Day Detail Form (Matches Main Itinerary Standards) */}
                {curActiveDay && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                    {/* Day Header & Move/Copy/Delete Controls */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="px-2.5 py-1 bg-[#C91F28] text-white text-[11px] font-black rounded-lg shrink-0">
                          Day {curActiveDay.dayNumber}
                        </span>
                        <input
                          type="text"
                          value={curActiveDay.title}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].title = e.target.value;
                            setDays(u);
                          }}
                          placeholder={`Day ${curActiveDay.dayNumber}: Sightseeing & Exploration`}
                          className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 hover:border-slate-400 focus:border-[#C91F28] focus:outline-none w-full max-w-md py-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveDay(activeDayIndex, 'up')}
                          disabled={activeDayIndex === 0}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move Day Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDay(activeDayIndex, 'down')}
                          disabled={activeDayIndex === days.length - 1}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          title="Move Day Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyDay(activeDayIndex)}
                          className="p-1.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                          title="Copy / Duplicate Day"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(activeDayIndex)}
                          className="p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Remove Day"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Places Covered & Place Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                          <span>Places & Attractions Covered</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Click "+ Add to Day" in catalog above to add places with auto-description
                        </span>
                      </div>

                      {/* Removable Place Chips */}
                      {curDayPlacesList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          {curDayPlacesList.map((placeName, pIdx) => (
                            <span
                              key={pIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 shadow-2xs"
                            >
                              <MapPin className="w-3 h-3 text-[#C91F28]" />
                              <span>{placeName}</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePlaceChip(placeName)}
                                className="ml-1 text-red-500 hover:text-red-700 dark:hover:text-red-200 cursor-pointer"
                                title={`Remove ${placeName}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <input
                        type="text"
                        value={curActiveDay.places}
                        onChange={(e) => {
                          const u = [...days];
                          u[activeDayIndex].places = e.target.value;
                          setDays(u);
                        }}
                        placeholder="e.g. Lalbagh Botanical Garden, Bangalore Palace, Vidhana Soudha"
                        className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>

                    {/* Day Description & Sightseeing Schedule */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Day Description & Sightseeing Schedule</span>
                        </label>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Descriptions auto-accumulate as you select places</span>
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={curActiveDay.description}
                        onChange={(e) => {
                          const u = [...days];
                          u[activeDayIndex].description = e.target.value;
                          setDays(u);
                        }}
                        placeholder="Detailed itinerary schedule for the day (e.g. • Lalbagh: Explore 240-acre garden with glass house... • Bangalore Palace: Grand Tudor-style royal residence...)"
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-sans leading-relaxed"
                      />
                    </div>

                    {/* Hotel / Stay Accommodation Card */}
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <HotelIcon className="w-4 h-4 text-amber-600" />
                          <span>Hotel / Stay Accommodation</span>
                        </label>

                        {curActiveDay.hotelName && (
                          <button
                            type="button"
                            onClick={handleRemoveHotel}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Remove Hotel
                          </button>
                        )}
                      </div>

                      {curActiveDay.hotelName ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-slate-700">
                          <div className="flex items-center gap-2.5">
                            {curActiveDay.hotelImageUrl ? (
                              <img
                                src={curActiveDay.hotelImageUrl}
                                alt={curActiveDay.hotelName}
                                className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-amber-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-amber-700">
                                <HotelIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                {curActiveDay.hotelName}
                              </span>
                              <span className="text-[11px] text-amber-600 font-semibold block">
                                ⭐ {curActiveDay.hotelStarCategory || '3 Star'} • {curActiveDay.hotelLocation || selectedDistrict}
                              </span>
                            </div>
                          </div>

                          <div className="w-full sm:w-auto">
                            <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Meal Plan</label>
                            <select
                              value={curActiveDay.mealPlan || 'Breakfast & Dinner (MAP)'}
                              onChange={(e) => {
                                const u = [...days];
                                u[activeDayIndex].mealPlan = e.target.value;
                                setDays(u);
                              }}
                              className="p-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              <option value="Breakfast & Dinner (MAP)">Breakfast & Dinner (MAP)</option>
                              <option value="Breakfast Included (CP)">Breakfast Included (CP)</option>
                              <option value="All Meals Included (AP)">All Meals (AP)</option>
                              <option value="Room Only (EP)">Room Only (EP)</option>
                              <option value="Dinner Only">Dinner Only</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={curActiveDay.hotelName || ''}
                            onChange={(e) => {
                              const u = [...days];
                              u[activeDayIndex].hotelName = e.target.value;
                              setDays(u);
                            }}
                            placeholder="Type hotel name or choose from master above..."
                            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
                          />
                          <select
                            value={curActiveDay.mealPlan || 'Breakfast & Dinner (MAP)'}
                            onChange={(e) => {
                              const u = [...days];
                              u[activeDayIndex].mealPlan = e.target.value;
                              setDays(u);
                            }}
                            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
                          >
                            <option value="Breakfast & Dinner (MAP)">Breakfast & Dinner (MAP)</option>
                            <option value="Breakfast Included (CP)">Breakfast Included (CP)</option>
                            <option value="All Meals Included (AP)">All Meals Included (AP)</option>
                            <option value="Room Only (EP)">Room Only (EP)</option>
                            <option value="Dinner Only">Dinner Only</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Activities & Schedule Timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Activities & Excursions</span>
                        </label>
                        <input
                          type="text"
                          value={curActiveDay.activities}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].activities = e.target.value;
                            setDays(u);
                          }}
                          placeholder="e.g. Guided palace tour, Botanical walk, Photography, Shopping"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Tour Timings</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={curActiveDay.startTime}
                            onChange={(e) => {
                              const u = [...days];
                              u[activeDayIndex].startTime = e.target.value;
                              setDays(u);
                            }}
                            placeholder="09:00 AM"
                            className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-center"
                          />
                          <input
                            type="text"
                            value={curActiveDay.endTime}
                            onChange={(e) => {
                              const u = [...days];
                              u[activeDayIndex].endTime = e.target.value;
                              setDays(u);
                            }}
                            placeholder="06:00 PM"
                            className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Day Photos & Gallery Uploader */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Day Landmark Photos & Gallery (Photos from places appear here automatically)
                      </label>
                      <ProfessionalImageUploader
                        category="ITINERARY_DAY"
                        images={curActiveDay.imageUrls && curActiveDay.imageUrls.length > 0 ? curActiveDay.imageUrls : (curActiveDay.imageUrl ? [curActiveDay.imageUrl] : [])}
                        onUrlListChange={(newUrls) => {
                          const u = [...days];
                          u[activeDayIndex].imageUrls = newUrls;
                          u[activeDayIndex].imageUrl = newUrls[0] || '';
                          setDays(u);
                        }}
                        maxImages={6}
                        helperText="Upload or attach landmark photos. Portrait or standard photos display with perfect aspect ratio in A4 export."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Document Preview Container targeted for A4 PDF export */
            <div className="overflow-y-auto max-h-[70vh] p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                id="itinerary-document"
                className="w-full max-w-[800px] bg-white text-slate-800 font-serif p-8 sm:p-10 shadow-xl border border-slate-200"
                style={{ minHeight: '1050px' }}
              >
                {/* Header Wave Accent */}
                <div
                  className="w-full bg-[#C91F28] overflow-hidden relative mb-5 rounded-t-lg shrink-0"
                  style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
                >
                  <img
                    src="/assets/ooting-header-wave.png"
                    alt=""
                    className="w-full h-full object-cover opacity-90"
                    style={{ width: '100%', height: '8px', objectFit: 'cover' }}
                  />
                </div>

                {/* Letterhead Header Section */}
                <div className="px-1 pt-1 pb-5 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-6">
                    {/* LEFT SIDE: Logo & Company Name/Tagline */}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                        style={{ width: '56px', height: '56px', minWidth: '56px', maxWidth: '56px', minHeight: '56px', maxHeight: '56px', overflow: 'hidden' }}
                      >
                        <img
                          src={company.logoUrl || '/assets/ooting-logo.jpg'}
                          alt={company.name || 'Ooting'}
                          className="max-w-full max-h-full object-contain"
                          style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight uppercase">
                          {(company.name || 'OOTING').toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                          {company.tagline || 'Journeys Beyond Ordinary'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Licensed Tour Operator & Destination Specialist
                        </span>
                      </div>
                    </div>

                    {/* RIGHT SIDE: Company Contact Details */}
                    <div className="flex justify-end ml-auto shrink-0">
                      <div className="w-fit ml-auto flex flex-col space-y-1.5 text-xs text-slate-700 max-w-[320px]">
                        {company.website && (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                              <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight break-all">{company.website}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                              <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight break-all">{company.email}</span>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                              <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight">{company.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                            <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                          </span>
                          <span className="font-medium text-slate-800 tracking-tight">
                            GSTIN: {company?.gstin?.trim() ? company.gstin.trim().toUpperCase().replace(/^GSTIN:\s*/i, '') : 'NILL'}
                          </span>
                        </div>
                        {company.address && (
                          <div className="flex items-start gap-2 pt-0.5">
                            <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                              <MapPin className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                            </span>
                            <div className="text-slate-800 font-bold leading-snug whitespace-pre-line">
                              {company.address}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between rounded-lg my-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-widest">
                      CUSTOM TOUR ITINERARY
                    </span>
                    <h2 className="text-sm font-black tracking-wide">
                      {(tripTitle.trim() || `${selectedDistrict} Custom Tour`).toUpperCase()}
                    </h2>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Destination</span>
                    <span className="font-bold text-white">{selectedDistrict}, {selectedState}</span>
                  </div>
                </div>

                {/* Days Timeline */}
                <div className="py-6 space-y-6">
                  {days.map((day) => (
                    <div
                      key={day.dayNumber}
                      className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2 break-inside-avoid"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-[#C91F28] text-white font-black rounded-lg text-xs">
                          Day {day.dayNumber}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {day.startTime} - {day.endTime}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{day.title}</h3>
                      {day.description && (
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                          {day.description}
                        </p>
                      )}

                      {/* Day Photos */}
                      {(() => {
                        const photos = day.imageUrls && day.imageUrls.length > 0
                          ? day.imageUrls
                          : day.imageUrl ? [day.imageUrl] : [];
                        if (photos.length === 0) return null;

                        const placesList = day.places
                          ? day.places.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : [];

                        if (photos.length === 1) {
                          const placeLabel = placesList.length > 0 ? placesList.join(' • ') : day.title;
                          return (
                            <div className="pt-2">
                              <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                <div className="relative w-full bg-slate-900/5 flex items-center justify-center aspect-[16/10] max-h-[380px] overflow-hidden">
                                  <img
                                    src={photos[0]}
                                    alt={placeLabel}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                </div>
                                {placeLabel && (
                                  <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-[#C91F28] flex-shrink-0" />
                                    <span className="font-semibold text-slate-900">{placeLabel}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="pt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {photos.map((photoUrl, pIdx) => {
                                const placeLabel = placesList[pIdx] || placesList[0] || `${day.title} - View ${pIdx + 1}`;
                                return (
                                  <div
                                    key={pIdx}
                                    className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                                  >
                                    <div className="relative w-full bg-slate-900/5 flex items-center justify-center aspect-[16/10] overflow-hidden">
                                      <img
                                        src={photoUrl}
                                        alt={placeLabel}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                        }}
                                      />
                                    </div>
                                    {placeLabel && (
                                      <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-800 font-medium">
                                        <MapPin className="w-3 h-3 text-[#C91F28] flex-shrink-0" />
                                        <span className="truncate font-semibold text-slate-800">{placeLabel}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {day.places && (
                        <div className="pt-2 flex items-start gap-1.5 text-xs text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#C91F28] flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Places Covered:</strong> {day.places}
                          </span>
                        </div>
                      )}

                      {day.activities && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-700">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Activities:</strong> {day.activities}
                          </span>
                        </div>
                      )}

                      {(day.hotelName || day.mealPlan) && (
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                          {day.hotelName && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              🏨 {day.hotelName} {day.hotelStarCategory ? `(${day.hotelStarCategory})` : ''}
                            </span>
                          )}
                          {day.mealPlan && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              🍽️ {day.mealPlan}
                            </span>
                          )}
                        </div>
                      )}

                      {day.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                          Note: {day.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Fixed Footer Note */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {company.name || 'Ooting'} • {company.email || 'contact@ooting.com'} • {company.website || 'https://ooting.in'}
                  </span>
                  <span>Page 1 of 1</span>
                </div>

                {/* Bottom Wave Footer */}
                <div className="w-full h-3 bg-[#C91F28] overflow-hidden relative mt-4 rounded-b-lg">
                  <img
                    src="/assets/ooting-header-wave.png"
                    alt=""
                    className="w-full h-full object-cover opacity-90 rotate-180"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Place Photo Gallery Modal (Multiple Angles & Views) */}
      {galleryModalOpen && galleryPlace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {galleryPlace.name} — Photo Gallery & Views
                </h3>
                <p className="text-xs text-slate-500">
                  Select a preferred photo angle to feature for Day {activeDayIndex + 1}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(
                galleryPlace.views || [
                  { label: 'Front View', url: galleryPlace.imageUrl },
                  {
                    label: 'Side View',
                    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
                  },
                  {
                    label: 'Panorama View',
                    url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
                  },
                  {
                    label: 'Top View',
                    url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80',
                  },
                ]
              ).map((view, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectPhotoView(view.url)}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-[#C91F28] cursor-pointer bg-slate-900 transition-all shadow-sm"
                >
                  <img
                    src={view.url}
                    alt={view.label}
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <span className="text-white font-bold text-xs">{view.label}</span>
                    <span className="text-slate-300 text-[10px] truncate">{galleryPlace.name}</span>
                  </div>
                  {days[activeDayIndex]?.imageUrl === view.url && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGalleryModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

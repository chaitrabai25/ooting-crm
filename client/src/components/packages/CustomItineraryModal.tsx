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
  Share2,
  Printer,
  X,
  Camera,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  Image as ImageIcon,
  Loader2,
  Check,
  Globe,
  Mail,
  Phone,
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { api } from '../../api/client.js';
import { LocationSelector } from '../common/LocationSelector.js';
import { ProfessionalImageUploader } from '../common/ProfessionalImageUploader.js';

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
  mealPlan?: string;
  notes?: string;
}

export const CustomItineraryModal: React.FC<CustomItineraryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { company } = useCompanySettings();

  // Step navigation: 'builder' | 'preview'
  const [activeView, setActiveView] = useState<'builder' | 'preview'>('builder');

  // Package / Trip details
  const [tripTitle, setTripTitle] = useState('Scenic Holiday Tour');
  const [approxPrice, setApproxPrice] = useState('25000');
  const [packageType, setPackageType] = useState('HOLIDAY');

  // Multi-level Location Selection
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [selectedDistrict, setSelectedDistrict] = useState('The Nilgiris (Ooty)');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  // Destination Database & AI Suggestions
  const [destinationCards, setDestinationCards] = useState<DestinationPlaceItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Custom Place Dialog
  const [isCustomPlaceOpen, setIsCustomPlaceOpen] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [customPlaceDesc, setCustomPlaceDesc] = useState('');
  const [customPlaceDuration, setCustomPlaceDuration] = useState('2 Hours');
  const [customPlaceActivities, setCustomPlaceActivities] = useState('');
  const [customPlaceImage, setCustomPlaceImage] = useState('');
  const [isSavingCustomPlace, setIsSavingCustomPlace] = useState(false);

  // Photo Gallery Picker Modal
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryPlace, setGalleryPlace] = useState<DestinationPlaceItem | null>(null);

  // Day-wise Builder State
  const [days, setDays] = useState<ItineraryDayPlan[]>([
    {
      dayNumber: 1,
      title: 'Day 1: Arrival & Local Sightseeing',
      description: 'Arrive at destination, hotel check-in, and explore iconic landmarks and local scenic attractions.',
      places: 'Ooty Lake & Boathouse, Government Botanical Garden',
      activities: 'Speed Boating, Botanical Walk, Photography',
      startTime: '09:30 AM',
      endTime: '06:00 PM',
      imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
      imageUrls: ['https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80'],
      hotelName: 'Heritage Hill Resort / Sterling Ooty',
      mealPlan: 'Dinner Included',
      notes: 'Evening free for local shopping and market stroll.',
    },
    {
      dayNumber: 2,
      title: 'Day 2: Viewpoints & Pristine Nature',
      description: 'Morning panoramic mountain viewpoints followed by pristine waterfalls and lakeside landscapes.',
      places: 'Doddabetta Peak, Pykara Waterfalls & Lake',
      activities: 'Telescope House viewing, Pine forest stroll, Pykara boating',
      startTime: '09:00 AM',
      endTime: '05:30 PM',
      imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      imageUrls: ['https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80'],
      hotelName: 'Heritage Hill Resort / Sterling Ooty',
      mealPlan: 'Breakfast & Dinner Included',
      notes: 'Carry light woolens for mountain winds.',
    },
  ]);

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

  // Load AI suggestions and saved places for selected district
  const loadPlacesForLocation = async (state: string, district: string) => {
    setIsAiLoading(true);
    try {
      const [aiRes, customRes] = await Promise.all([
        api.post('/packages/ai-suggest', { state, district }),
        api.get(`/packages/destinations/places?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`),
      ]);

      const aiPlaces: DestinationPlaceItem[] = aiRes.data?.places || [];
      const customPlaces: DestinationPlaceItem[] = customRes.data?.places || [];

      // Merge avoiding duplicate IDs
      const map = new Map<string, DestinationPlaceItem>();
      customPlaces.forEach((p) => map.set(p.name.toLowerCase(), p));
      aiPlaces.forEach((p) => {
        if (!map.has(p.name.toLowerCase())) {
          map.set(p.name.toLowerCase(), p);
        }
      });

      setDestinationCards(Array.from(map.values()));
    } catch (err) {
      console.error('Failed to fetch destination suggestions:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      loadPlacesForLocation(selectedState, selectedDistrict);
    }
  }, [selectedState, selectedDistrict]);

  if (!isOpen) return null;

  // Add place to active day
  const handleAddPlaceToDay = (place: DestinationPlaceItem) => {
    const updated = [...days];
    const currentDay = updated[activeDayIndex];
    if (!currentDay) return;

    // Append place name
    const currentPlaces = currentDay.places ? currentDay.places.split(',').map((p) => p.trim()) : [];
    if (!currentPlaces.includes(place.name)) {
      currentPlaces.push(place.name);
      currentDay.places = currentPlaces.join(', ');
    }

    // Append activities
    if (place.activities && place.activities.length > 0) {
      const currentActs = currentDay.activities ? currentDay.activities.split(',').map((a) => a.trim()) : [];
      place.activities.forEach((act) => {
        if (!currentActs.includes(act)) {
          currentActs.push(act);
        }
      });
      currentDay.activities = currentActs.join(', ');
    }

    if (place.imageUrl) {
      const existing = currentDay.imageUrls || (currentDay.imageUrl ? [currentDay.imageUrl] : []);
      if (!existing.includes(place.imageUrl)) {
        currentDay.imageUrls = [...existing, place.imageUrl];
      }
      if (!currentDay.imageUrl) {
        currentDay.imageUrl = place.imageUrl;
      }
    }

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
    if (!customPlaceName.trim()) return;

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
          ? customPlaceActivities.split(',').map((a) => a.trim())
          : ['Sightseeing', 'Photography'],
      };

      const res = await api.post('/packages/destinations/places', payload);
      const savedPlace: DestinationPlaceItem = res.data?.place || { ...payload, id: String(Date.now()) };

      // Add to local state
      setDestinationCards((prev) => [savedPlace, ...prev]);

      // Add directly to current day plan
      handleAddPlaceToDay(savedPlace);

      // Reset form
      setCustomPlaceName('');
      setCustomPlaceDesc('');
      setCustomPlaceActivities('');
      setCustomPlaceImage('');
      setIsCustomPlaceOpen(false);
    } catch (err) {
      console.error('Failed to save custom place:', err);
      alert('Could not save place to database. Added to itinerary only.');
    } finally {
      setIsSavingCustomPlace(false);
    }
  };

  // Day operations
  const handleAddDay = () => {
    const nextNum = days.length + 1;
    const newDay: ItineraryDayPlan = {
      dayNumber: nextNum,
      title: `Day ${nextNum}: Sightseeing & Exploration`,
      description: `Comprehensive full-day curated exploration around ${selectedDistrict}.`,
      places: '',
      activities: '',
      startTime: '09:00 AM',
      endTime: '06:00 PM',
      notes: '',
    };
    setDays([...days, newDay]);
    setActiveDayIndex(days.length);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) {
      alert('An itinerary must contain at least 1 day.');
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

  // Save to CRM Database as Package
  const handleSaveToDatabase = async () => {
    try {
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
        packageName: tripTitle.trim() || `${selectedDistrict} Custom Itinerary`,
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
            title: d.title,
            description: d.description,
            places: d.places,
            activities: d.activities,
            startTime: d.startTime,
            endTime: d.endTime,
            imageUrl: allPhotos[0] || null,
            images: allPhotos.length > 0 ? JSON.stringify(allPhotos) : null,
          };
        }),
      };

      await api.post('/packages', payload);
      if (onSuccess) onSuccess();
      alert(`Itinerary successfully saved to CRM Package catalog as "${payload.packageName}"!`);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save itinerary to CRM database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dedicated PDF Download targeting ONLY #itinerary-document
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanTitle = tripTitle.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Itinerary_${cleanTitle}_${selectedDistrict.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      const { download } = await generateA4Pdf({
        elementId: 'itinerary-document',
        filename,
        onePageOnly: false,
      });
      download();
    } catch (err) {
      console.error('Failed to download itinerary PDF:', err);
      alert('PDF generation error. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Custom Destination & Day-Wise Itinerary Builder"
        subtitle="Select State -> District -> Pick Famous Places & Activities -> Export Clean A4 PDF"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Mode Tabs & Controls */}
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
                <span>Preview & A4 PDF Export</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeView === 'preview' && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Itinerary PDF'}</span>
                </button>
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
              {/* Location Selector: State -> District */}
                <div className="space-y-3">
                  <LocationSelector
                    selectedState={selectedState}
                    selectedDistrict={selectedDistrict}
                    onStateChange={(s) => setSelectedState(s)}
                    onDistrictChange={(d) => setSelectedDistrict(d)}
                    showPlace={false}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Tour Title</label>
                      <input
                        type="text"
                        value={tripTitle}
                        onChange={(e) => setTripTitle(e.target.value)}
                        placeholder="e.g. Scenic Hill Station Holiday"
                        className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Estimated Price (₹)</label>
                      <input
                        type="number"
                        value={approxPrice}
                        onChange={(e) => setApproxPrice(e.target.value)}
                        placeholder="e.g. 25000"
                        className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

              {/* Destination Catalog & AI Suggestions */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Famous Places in {selectedDistrict} ({destinationCards.length} Attractions)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPlacesForLocation(selectedState, selectedDistrict)}
                      disabled={isAiLoading}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors text-[11px] shadow-2xs cursor-pointer"
                    >
                      {isAiLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>{isAiLoading ? 'Analyzing Places...' : '✨ AI Suggest Places'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomPlaceOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#C91F28]" />
                      <span>+ Add Custom Place</span>
                    </button>
                  </div>
                </div>

                {/* Destination Cards Carousel / Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {destinationCards.map((place) => (
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
                          className="px-2 py-0.5 bg-[#C91F28] hover:bg-[#a81920] text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                        >
                          + Add to Day {activeDayIndex + 1}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Place Modal Form */}
              {isCustomPlaceOpen && (
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      + Add New Custom Tourist Place (Saved to CRM Database)
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
                        placeholder="Description / Why it is famous"
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

              {/* Day-Wise Organizer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {days.map((d, index) => (
                      <button
                        key={d.dayNumber}
                        type="button"
                        onClick={() => setActiveDayIndex(index)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                          activeDayIndex === index
                            ? 'bg-[#C91F28] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>Day {d.dayNumber}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Day</span>
                  </button>
                </div>

                {/* Active Day Detail Form */}
                {days[activeDayIndex] && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#C91F28] text-white text-[11px] font-black rounded-lg">
                          Day {days[activeDayIndex].dayNumber}
                        </span>
                        <input
                          type="text"
                          value={days[activeDayIndex].title}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].title = e.target.value;
                            setDays(u);
                          }}
                          className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#C91F28] focus:outline-none w-72"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveDay(activeDayIndex, 'up')}
                          disabled={activeDayIndex === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Day Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDay(activeDayIndex, 'down')}
                          disabled={activeDayIndex === days.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Day Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(activeDayIndex)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Remove Day"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Places & Sightseeing Spots
                        </label>
                        <input
                          type="text"
                          value={days[activeDayIndex].places}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].places = e.target.value;
                            setDays(u);
                          }}
                          placeholder="e.g. Ooty Lake, Botanical Garden"
                          className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Activities & Excursions
                        </label>
                        <input
                          type="text"
                          value={days[activeDayIndex].activities}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].activities = e.target.value;
                            setDays(u);
                          }}
                          placeholder="e.g. Boating, Guided Walk"
                          className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Day Description & Schedule
                      </label>
                      <textarea
                        rows={2}
                        value={days[activeDayIndex].description}
                        onChange={(e) => {
                          const u = [...days];
                          u[activeDayIndex].description = e.target.value;
                          setDays(u);
                        }}
                        className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Hotel / Stay Accommodation
                        </label>
                        <input
                          type="text"
                          value={days[activeDayIndex].hotelName || ''}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].hotelName = e.target.value;
                            setDays(u);
                          }}
                          placeholder="e.g. 4-Star Mountain Resort / Sterling Ooty"
                          className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Meal Plan Included
                        </label>
                        <input
                          type="text"
                          value={days[activeDayIndex].mealPlan || ''}
                          onChange={(e) => {
                            const u = [...days];
                            u[activeDayIndex].mealPlan = e.target.value;
                            setDays(u);
                          }}
                          placeholder="e.g. Breakfast & Dinner Included"
                          className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Day Photos & Gallery (Aspect ratio: 5:8 Portrait recommended, zero-crop proportional display)
                      </label>
                      <ProfessionalImageUploader
                        category="ITINERARY_DAY"
                        images={days[activeDayIndex].imageUrls || (days[activeDayIndex].imageUrl ? [days[activeDayIndex].imageUrl] : [])}
                        onUrlListChange={(newUrls) => {
                          const u = [...days];
                          u[activeDayIndex].imageUrls = newUrls;
                          u[activeDayIndex].imageUrl = newUrls[0] || '';
                          setDays(u);
                        }}
                        maxImages={6}
                        helperText="Upload or attach landmark photos. Portrait (5:8) or standard photos fit without any clipping."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Document Preview Container strictly targeted for A4 PDF export */
            <div className="overflow-y-auto max-h-[70vh] p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                id="itinerary-document"
                className="w-full max-w-[800px] bg-white text-slate-800 font-sans p-8 sm:p-10 shadow-xl border border-slate-200"
                style={{ minHeight: '1050px' }}
              >
                {/* Header Wave Accent */}
                <div className="w-full h-3 bg-[#C91F28] overflow-hidden relative mb-5 rounded-t-lg">
                  <img
                    src="/assets/ooting-header-wave.png"
                    alt=""
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>

                {/* Letterhead Header Section */}
                <div className="px-1 pt-1 pb-5 border-b border-slate-200">
                  <div className="grid grid-cols-2 gap-8 items-start">
                    {/* LEFT SIDE: Logo & Company Name/Tagline */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-xs flex-shrink-0">
                        <img
                          src={company.logoUrl || '/assets/ooting-logo.jpg'}
                          alt={company.name || 'Ooting'}
                          className="w-full h-full object-contain"
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

                    {/* RIGHT SIDE: Company Contact Details (Neat Right-Aligned Container with Fixed-Width Red Icons) */}
                    <div className="flex justify-end ml-auto shrink-0">
                      <div className="flex flex-col space-y-2 text-xs text-slate-700 min-w-[260px] max-w-[340px]">
                        {company.website && (
                          <div className="flex items-center gap-2.5">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                              <Globe className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight break-all">{company.website}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2.5">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                              <Mail className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight break-all">{company.email}</span>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-2.5">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                              <Phone className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-medium text-slate-800 tracking-tight">{company.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5">
                          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-mono font-bold text-slate-900 tracking-tight">
                            GSTIN: {company?.gstin?.trim() ? company.gstin.trim().toUpperCase().replace(/^GSTIN:\s*/i, '') : 'NIL'}
                          </span>
                        </div>
                        {company.address && (
                          <div className="flex items-start gap-2.5 pt-0.5">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28] mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-slate-600 leading-snug break-words">
                              {company.address}
                            </span>
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
                      {tripTitle.toUpperCase()}
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
                      <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>

                      {/* Day Photos - Intelligent aspect-ratio scaling with Place Name label */}
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
                              🏨 {day.hotelName}
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

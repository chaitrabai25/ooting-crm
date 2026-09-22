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
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import {
  FAMOUS_DESTINATIONS_DATABASE,
  DestinationPlace,
  getDestinationsByLocation,
  generateAiDestinationSuggestions,
} from '../../data/destinationDatabase.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { api } from '../../api/client.js';

interface CustomItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
  notes?: string;
}

export const CustomItineraryModal: React.FC<CustomItineraryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step navigation: 'builder' | 'preview'
  const [activeView, setActiveView] = useState<'builder' | 'preview'>('builder');

  // Package / Trip details
  const [tripTitle, setTripTitle] = useState('Nilgiri Scenic Holiday Tour');
  const [customerName, setCustomerName] = useState('');
  const [approxPrice, setApproxPrice] = useState('25000');
  const [packageType, setPackageType] = useState('HOLIDAY');

  // Multi-level Location Selection
  const [selectedState, setSelectedState] = useState('Tamil Nadu');
  const [selectedDistrict, setSelectedDistrict] = useState('The Nilgiris (Ooty)');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  // Destination Database & AI Suggestions
  const [destinationCards, setDestinationCards] = useState<DestinationPlace[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Custom Place Dialog
  const [isCustomPlaceOpen, setIsCustomPlaceOpen] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [customPlaceDesc, setCustomPlaceDesc] = useState('');
  const [customPlaceDuration, setCustomPlaceDuration] = useState('2 Hours');
  const [customPlaceActivities, setCustomPlaceActivities] = useState('');

  // Day-wise Builder State
  const [days, setDays] = useState<ItineraryDayPlan[]>([
    {
      dayNumber: 1,
      title: 'Day 1: Arrival & Ooty Town Exploration',
      description: 'Arrive in Ooty, check into hotel/resort, and explore local scenic spots.',
      places: 'Ooty Lake & Boathouse, Government Botanical Garden',
      activities: 'Speed Boating, Botanical Walk, Photography',
      startTime: '09:30 AM',
      endTime: '06:00 PM',
      imageUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
      notes: 'Evening free for local shopping at Charing Cross.',
    },
    {
      dayNumber: 2,
      title: 'Day 2: Doddabetta Summit & Pykara Excursion',
      description: 'Morning panoramic viewpoints followed by pristine waterfalls and pine forests.',
      places: 'Doddabetta Peak, Pykara Waterfalls & Lake',
      activities: 'Telescope House viewing, Pine forest stroll, Pykara boating',
      startTime: '09:00 AM',
      endTime: '05:30 PM',
      imageUrl: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      notes: 'Carry warm jackets for peak viewpoint winds.',
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

  // Update destination cards when state or district changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      const places = getDestinationsByLocation(selectedState, selectedDistrict);
      setDestinationCards(places);
    }
  }, [selectedState, selectedDistrict]);

  if (!isOpen) return null;

  // Add place to active day
  const handleAddPlaceToDay = (place: DestinationPlace) => {
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
        if (!currentActs.includes(act.name)) {
          currentActs.push(act.name);
        }
      });
      currentDay.activities = currentActs.join(', ');
    }

    if (!currentDay.imageUrl && place.imageUrl) {
      currentDay.imageUrl = place.imageUrl;
    }

    setDays(updated);
  };

  // Add custom place manually
  const handleAddCustomPlace = () => {
    if (!customPlaceName.trim()) return;
    const updated = [...days];
    const currentDay = updated[activeDayIndex];
    if (!currentDay) return;

    const currentPlaces = currentDay.places ? currentDay.places.split(',').map((p) => p.trim()) : [];
    currentPlaces.push(customPlaceName.trim());
    currentDay.places = currentPlaces.join(', ');

    if (customPlaceActivities.trim()) {
      const currentActs = currentDay.activities ? currentDay.activities.split(',').map((a) => a.trim()) : [];
      currentActs.push(customPlaceActivities.trim());
      currentDay.activities = currentActs.join(', ');
    }

    setDays(updated);
    setCustomPlaceName('');
    setCustomPlaceDesc('');
    setCustomPlaceActivities('');
    setIsCustomPlaceOpen(false);
  };

  // Trigger AI Destination Suggestion
  const handleAiSuggest = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      const suggestions = generateAiDestinationSuggestions(selectedState, selectedDistrict);
      setDestinationCards(suggestions);
      setIsAiLoading(false);
    }, 600);
  };

  // Day operations
  const handleAddDay = () => {
    const nextNum = days.length + 1;
    const newDay: ItineraryDayPlan = {
      dayNumber: nextNum,
      title: `Day ${nextNum}: Sightseeing & Excursion`,
      description: `Comprehensive full-day exploration around ${selectedDistrict}.`,
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
    const filtered = days.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      title: d.title.startsWith('Day ') ? `Day ${i + 1}: ${d.title.split(':').slice(1).join(':').trim()}` : d.title,
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
      title: d.title.startsWith('Day ') ? `Day ${i + 1}: ${d.title.split(':').slice(1).join(':').trim()}` : d.title,
    }));
    setDays(renumbered);
    setActiveDayIndex(targetIndex);
  };

  // Save to CRM Database as Package
  const handleSaveToDatabase = async () => {
    try {
      setIsSaving(true);
      const durationStr = `${days.length} Days / ${Math.max(1, days.length - 1)} Nights`;
      
      const payload = {
        packageName: tripTitle.trim() || `${selectedDistrict} Custom Itinerary`,
        destination: selectedDistrict,
        duration: durationStr,
        description: `Custom curated itinerary for ${selectedDistrict}, ${selectedState} covering ${days.length} days of sightseeing and activities.`,
        price: parseFloat(approxPrice) || 0,
        packageType,
        itineraries: days.map((d) => ({
          dayNumber: d.dayNumber,
          title: d.title,
          description: d.description,
          places: d.places,
          activities: d.activities,
          startTime: d.startTime,
          endTime: d.endTime,
          imageUrl: d.imageUrl || null,
        })),
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Premium Destination & Day-Wise Itinerary Builder"
      subtitle="Select State -> District -> Pick Famous Places & Activities -> Day-Wise PDF Export"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Mode Tabs & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('builder')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
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
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold shadow-xs hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Itinerary PDF'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save to CRM Packages'}</span>
            </button>
          </div>
        </div>

        {activeView === 'builder' ? (
          <div className="space-y-4">
            {/* Location Selector: State -> District */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                Location & Trip Definition
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Select State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-medium"
                  >
                    {INDIA_STATES_AND_DISTRICTS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Select District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-bold text-brand-600"
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Trip / Tour Title</label>
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g. Ooty - Coorg Hill Station Escape"
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
                  Famous Places & Attractions in {selectedDistrict}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={isAiLoading}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors text-[11px] shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiLoading ? 'Analyzing...' : '✨ AI Suggest Famous Places'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCustomPlaceOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-100 text-[11px]"
                  >
                    <Plus className="w-3 h-3 text-[#C91F28]" />
                    <span>Add Custom Place</span>
                  </button>
                </div>
              </div>

              {/* Destination Cards Carousel / Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {destinationCards.map((place) => (
                  <div
                    key={place.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <img
                          src={place.imageUrl}
                          alt={place.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="min-w-0">
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
                      <span className="text-[10px] text-slate-400 font-medium">
                        {place.activities.length} activity suggested
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPlaceToDay(place)}
                        className="px-2 py-0.5 bg-[#C91F28] hover:bg-[#a81920] text-white text-[10px] font-bold rounded-md transition-colors"
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
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs block">
                  Add Custom Sightseeing / Attraction
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Place Name (e.g. Dolphin's Nose)"
                    value={customPlaceName}
                    onChange={(e) => setCustomPlaceName(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Activities (e.g. Photography, Trek)"
                    value={customPlaceActivities}
                    onChange={(e) => setCustomPlaceActivities(e.target.value)}
                    className="p-1.5 border rounded-lg text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomPlace}
                      className="px-3 py-1 bg-[#C91F28] text-white font-bold rounded-lg text-xs"
                    >
                      Add to Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomPlaceOpen(false)}
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs"
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
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 ${
                        activeDayIndex === index
                          ? 'bg-[#C91F28] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>Day {d.dayNumber}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddDay}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 flex items-center gap-1 flex-shrink-0"
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
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Day Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDay(activeDayIndex, 'down')}
                        disabled={activeDayIndex === days.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Day Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(activeDayIndex)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
              <div className="w-full h-2.5 bg-[#C91F28] mb-6 rounded-full"></div>

              {/* Letterhead Header Section */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 bg-white shadow-2xs">
                    <img
                      src="/assets/ooting-logo.jpg"
                      alt="Ooting"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                      OOTING
                    </h1>
                    <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mt-0.5">
                      Journeys Beyond Ordinary
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="px-3 py-1 bg-slate-900 text-amber-400 font-black text-[11px] uppercase tracking-wider rounded-lg">
                    CUSTOM TOUR ITINERARY
                  </span>
                  <p className="font-bold text-slate-900 mt-1">{tripTitle}</p>
                  <p className="text-[10px] text-slate-500">
                    {selectedDistrict}, {selectedState}
                  </p>
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
                <span>Ooting Holidays • bookings@ooting.com • https://ooting.in</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Shield,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  Utensils,
  CreditCard,
  Building,
  UserCheck,
  Send,
  Loader2,
  Printer,
} from 'lucide-react';
import { api } from '../../api/client.js';

interface PublicTourInfo {
  id: string;
  assignmentCode: string;
  groupName: string;
  destination: string;
  startDate: string;
  endDate: string;
  reportingTime?: string;
  reportingLocation?: string;
  route?: string;
  primaryGuide?: {
    fullName: string;
    phone: string;
    photoUrl?: string;
    languages?: string;
  };
  company?: {
    name: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  passengerCount: number;
}

export const TourCustomerRegistrationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [tour, setTour] = useState<PublicTourInfo | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [dietaryPreference, setDietaryPreference] = useState('Veg');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [roomAllocation, setRoomAllocation] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchTour = async () => {
      try {
        setIsLoadingTour(true);
        const res = await api.get(`/guides/public-registration/${id}`);
        setTour(res.data);
      } catch (err: any) {
        setLoadError(err.response?.data?.message || 'Tour registration link is invalid or has expired.');
      } finally {
        setIsLoadingTour(false);
      }
    };
    fetchTour();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }
    if (!age || Number(age) <= 0) {
      setErrorMessage('Please enter a valid age.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post(`/guides/public-registration/${id}`, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        age: Number(age),
        gender,
        roleInTrip: 'Traveller',
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        bloodGroup,
        dietaryPreference,
        medicalNotes: medicalNotes.trim() || null,
        idProofType,
        idProofNumber: idProofNumber.trim() || null,
        roomAllocation: roomAllocation.trim() || null,
        notes: specialRequests.trim() || null,
      });

      setSubmitSuccess(res.data?.message || 'Your registration has been submitted successfully!');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTour) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading tour details & registration form...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !tour) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unable to Open Registration</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {loadError || 'The tour link you followed is not valid or registration has closed.'}
          </p>
          <div className="pt-2">
            <a
              href="https://ooting.in"
              className="inline-block px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-brand-700"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-900/50 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              Registration Confirmed
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              You're All Set for the Trip!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {submitSuccess}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-5 text-left border border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-medium">Tour Package</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{tour.groupName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-medium">Destination</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{tour.destination}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-medium">Start Date</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {new Date(tour.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {tour.primaryGuide && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 font-medium">Your Tour Guide</span>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  {tour.primaryGuide.fullName} ({tour.primaryGuide.phone})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Download / Print Slip (PDF)</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            A confirmation has been recorded directly on your tour manifest. Your tour manager and guide have received your room and meal preferences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Brand & Tour Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/80 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-indigo-700 p-6 sm:p-8 text-white">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                {tour.company?.logoUrl ? (
                  <img
                    src={tour.company.logoUrl}
                    alt={tour.company.name}
                    className="h-10 w-auto max-w-[120px] object-contain rounded-lg bg-white/90 p-1"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-lg">
                    {tour.company?.name?.[0] || 'O'}
                  </div>
                )}
                <span className="font-bold text-sm tracking-wide text-white/90">
                  {tour.company?.name || 'Ooting CRM'}
                </span>
              </div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
                Traveller Registration
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              {tour.groupName}
            </h1>
            <p className="text-white/80 text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/90 shrink-0" />
              {tour.destination}
            </p>
          </div>

          {/* Tour Logistics Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60 text-xs">
            <div>
              <span className="block text-slate-500 dark:text-slate-400 font-medium">Dates</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                {new Date(tour.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(tour.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {tour.reportingTime && (
              <div>
                <span className="block text-slate-500 dark:text-slate-400 font-medium">Reporting Time</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  {tour.reportingTime}
                </span>
              </div>
            )}
            {tour.reportingLocation && (
              <div className="col-span-2">
                <span className="block text-slate-500 dark:text-slate-400 font-medium">Meeting Point</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  {tour.reportingLocation}
                </span>
              </div>
            )}
          </div>

          {/* Guide Contact Preview */}
          {tour.primaryGuide && (
            <div className="px-6 py-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center font-bold text-amber-900 dark:text-amber-100">
                  {tour.primaryGuide.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Assigned Tour Guide: {tour.primaryGuide.fullName}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Languages: {tour.primaryGuide.languages || 'English, Kannada, Hindi'}
                  </p>
                </div>
              </div>
              <a
                href={`tel:${tour.primaryGuide.phone}`}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Guide
              </a>
            </div>
          )}
        </div>

        {/* The Google-Form Style Registration Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/80 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-600" />
              Passenger Trip Registration Form
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Please submit each traveller's details. This information is required for hotel check-ins, transport manifests, meal planning, and safety roll-calls.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
            {/* Section 1: Personal Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-brand-600">
                1. Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Legal Name (as per Govt ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Age *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Health, Meals & Emergency (Group Trip Safety) */}
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-600">
                <HeartPulse className="w-3.5 h-3.5" />
                2. Safety, Health & Dietary Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Food / Meal Preference *
                  </label>
                  <select
                    value={dietaryPreference}
                    onChange={(e) => setDietaryPreference(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Veg">Vegetarian (Pure Veg)</option>
                    <option value="Non-Veg">Non-Vegetarian</option>
                    <option value="Jain">Jain Food (No Onion/Garlic)</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Blood Group (Optional)
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                    <option value="Unknown">Not Sure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Emergency Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Suresh (Father / Spouse)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Emergency Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="e.g. +91 99887 76655"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Medical Notes / Allergies / Motion Sickness (Optional)
                </label>
                <input
                  type="text"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g. Asthma, peanut allergy, prone to car sickness (front seat preferred)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Section 3: Room Sharing & ID Details */}
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-600">
                <CreditCard className="w-3.5 h-3.5" />
                3. Room Allocation & ID Proof
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Room Sharing Companion / Preferences
                  </label>
                  <input
                    type="text"
                    value={roomAllocation}
                    onChange={(e) => setRoomAllocation(e.target.value)}
                    placeholder="e.g. Sharing with Priya (Room 204)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Govt ID Proof Type
                  </label>
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ID Number (Last 4 Digits or Full Number)
                </label>
                <input
                  type="text"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-4589"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Any Special Request or Notes for the Guide
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Celebrating wedding anniversary on Day 2, luggage assistance needed..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Complete Trip Registration
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                🔒 Your details are stored securely on the encrypted Ooting CRM operations portal.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Users, User, Phone, Mail, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Booking, Traveller } from '../../types/index.js';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Booking | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [packageId, setPackageId] = useState(initialData?.packageId || '');
  const [travelStartDate, setTravelStartDate] = useState(
    initialData?.travelStartDate ? initialData.travelStartDate.split('T')[0] : ''
  );
  const [travelEndDate, setTravelEndDate] = useState(
    initialData?.travelEndDate ? initialData.travelEndDate.split('T')[0] : ''
  );
  const [travellers, setTravellers] = useState(initialData?.travellers || 1);
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount || 0);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [bookingStatus, setBookingStatus] = useState(initialData?.bookingStatus || 'CONFIRMED');
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assignedUserId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Multi-traveller state
  const [travellersList, setTravellersList] = useState<Traveller[]>([]);

  // B2B Agent Option
  const [agentId, setAgentId] = useState('');
  const [commissionRate, setCommissionRate] = useState(0);

  // Dropdown data
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/customers?limit=100').then((res) => setCustomers(res.data.data || []));
      api.get('/packages?limit=100').then((res) => setPackages(res.data.data || []));
      api.get('/users/staff').then((res) => setStaff(res.data || []));
      api.get('/agents?limit=100').then((res) => setAgents(res.data.data || []));

      // If editing, load full booking with travellersList
      if (initialData?.id) {
        api.get('/bookings/' + initialData.id).then((res) => {
          const b = res.data;
          if (b) {
            setCustomerId(b.customerId || '');
            setPackageId(b.packageId || '');
            setTravelStartDate(b.travelStartDate ? b.travelStartDate.split('T')[0] : '');
            setTravelEndDate(b.travelEndDate ? b.travelEndDate.split('T')[0] : '');
            setTravellers(b.travellers || 1);
            setTotalAmount(b.totalAmount || 0);
            setDiscount(b.discount || 0);
            setBookingStatus(b.bookingStatus || 'CONFIRMED');
            setAssignedUserId(b.assignedUserId || '');
            setNotes(b.notes || '');

            if (b.travellersList && b.travellersList.length > 0) {
              setTravellersList(b.travellersList);
            } else {
              // initialize with customer
              setTravellersList([
                {
                  name: b.customer?.fullName || '',
                  phone: b.customer?.phone || '',
                  email: b.customer?.email || '',
                  isPrimary: true,
                },
              ]);
            }
          }
        });
      } else {
        // New booking: initialize 1 traveller
        setTravellersList([
          {
            name: '',
            phone: '',
            email: '',
            isPrimary: true,
          },
        ]);
      }
    }
  }, [isOpen, initialData]);

  // Adjust travellers list when traveller count changes
  const handleTravellerCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setTravellers(validCount);

    const pkg = packages.find((p) => p.id === packageId);
    if (pkg && !initialData) {
      setTotalAmount(pkg.price * validCount);
    }

    setTravellersList((prev) => {
      const updated = [...prev];
      if (validCount > updated.length) {
        for (let i = updated.length; i < validCount; i++) {
          updated.push({
            name: '',
            age: null,
            gender: 'MALE',
            phone: '',
            email: '',
            isPrimary: false,
          });
        }
      } else if (validCount < updated.length) {
        return updated.slice(0, validCount);
      }
      return updated;
    });
  };

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setTravellersList((prev) => {
        const updated = [...prev];
        if (updated.length === 0) {
          updated.push({
            name: selected.fullName,
            phone: selected.phone,
            email: selected.email || '',
            isPrimary: true,
          });
        } else {
          updated[0] = {
            ...updated[0],
            name: selected.fullName,
            phone: selected.phone,
            email: selected.email || '',
            isPrimary: true,
          };
        }
        return updated;
      });
    }
  };

  const handlePackageSelect = (pkgId: string) => {
    setPackageId(pkgId);
    const selected = packages.find((p) => p.id === pkgId);
    if (selected && !initialData) {
      setTotalAmount(selected.price * travellers);
    }
  };

  const updateTravellerField = (index: number, field: keyof Traveller, value: any) => {
    setTravellersList((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const finalAmount = Math.max(0, Number(totalAmount) - Number(discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Customer is required.');
      return;
    }
    if (!travelStartDate || !travelEndDate) {
      setError('Travel dates are required.');
      return;
    }

    // Validate travellers list
    for (let i = 0; i < travellersList.length; i++) {
      if (!travellersList[i].name || !travellersList[i].name.trim()) {
        setError(`Please enter the full name for Traveller ${i + 1}.`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        customerId,
        packageId: packageId || null,
        assignedUserId: assignedUserId || null,
        travelStartDate,
        travelEndDate,
        travellers: Number(travellers),
        totalAmount: Number(totalAmount),
        discount: Number(discount),
        bookingStatus,
        notes: notes || null,
        agentId: agentId || null,
        commissionRate: Number(commissionRate) || 0,
        travellersList: travellersList.map((t, idx) => ({
          name: t.name.trim(),
          age: t.age ? Number(t.age) : null,
          gender: t.gender || null,
          phone: t.phone ? t.phone.trim() : null,
          email: t.email ? t.email.trim() : null,
          isPrimary: idx === 0 || !!t.isPrimary,
        })),
      };

      if (initialData?.id) {
        await api.put('/bookings/' + initialData.id, payload);
      } else {
        await api.post('/bookings', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Booking' : 'Create Confirmed Booking'}
      subtitle="Record confirmed travel itinerary, multi-traveller details, and financials"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-red-50 text-[#C91F28] border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer & Package */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Customer *</label>
            <select
              required
              value={customerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white font-medium"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Travel Package</label>
            <select
              value={packageId}
              onChange={(e) => handlePackageSelect(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white font-medium"
            >
              <option value="">-- Custom Tour Package --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageName} ({p.duration})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates & Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Travel Start Date *</label>
            <input
              type="date"
              required
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Travel End Date *</label>
            <input
              type="date"
              required
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Number of Travellers *</label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={travellers}
              onChange={(e) => handleTravellerCountChange(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Multi-Traveller Details Card */}
        <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C91F28]" />
              <span className="font-bold text-slate-800 text-sm">
                Traveller Information ({travellersList.length} {travellersList.length === 1 ? 'Person' : 'People'})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Fields adapt dynamically based on traveller count
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {travellersList.map((traveller, index) => (
              <div
                key={index}
                className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-[#C91F28] font-bold text-[11px] flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">
                      Traveller {index + 1} {index === 0 ? '(Primary Contact)' : ''}
                    </span>
                  </div>
                  {index === 0 && (
                    <span className="text-[10px] bg-red-50 text-[#C91F28] px-2 py-0.5 rounded-full font-medium">
                      Primary Booker
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full legal name"
                      value={traveller.name}
                      onChange={(e) => updateTravellerField(index, 'name', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      placeholder="Age"
                      value={traveller.age ?? ''}
                      onChange={(e) => updateTravellerField(index, 'age', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Gender</label>
                    <select
                      value={traveller.gender || 'MALE'}
                      onChange={(e) => updateTravellerField(index, 'gender', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={traveller.phone || ''}
                      onChange={(e) => updateTravellerField(index, 'phone', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={traveller.email || ''}
                      onChange={(e) => updateTravellerField(index, 'email', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Calculation Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Total Booking Price (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Discount Given (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-semibold text-slate-700">Final Booking Amount:</span>
            <span className="font-extrabold text-[#C91F28] text-base">
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* B2B Agent connection */}
        {!initialData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
            <div>
              <label className="font-semibold text-slate-700">B2B Agent Partner (Optional)</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
              >
                <option value="">-- Direct Customer (No Agent) --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName} ({a.contactPerson})
                  </option>
                ))}
              </select>
            </div>
            {agentId && (
              <div>
                <label className="font-semibold text-slate-700">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  placeholder="e.g. 10%"
                  className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Booking Status</label>
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value as any)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
            >
              <option value="CONFIRMED">Confirmed</option>
              <option value="HOLD">Hold</option>
              <option value="ENQUIRY">Enquiry</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Assigned Sales Executive</label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
            >
              <option value="">-- Unassigned --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Internal Booking Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special meal instructions, hotel confirmation codes, chauffeur details..."
            className="mt-1 w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Booking' : 'Create Confirmed Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

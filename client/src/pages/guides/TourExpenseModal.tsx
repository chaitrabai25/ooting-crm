import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  User,
  Users,
  Calendar,
  Clock,
  FileText,
  Tag,
  Receipt,
  Bed,
  CheckCircle2,
  AlertCircle,
  X,
  Droplet,
  Coffee,
  Ticket,
  Car,
  Upload,
  Image as ImageIcon,
  Building,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { TourExpense, TourExpenseCategory, TourExpenseType } from '../../types/index.js';

interface PassengerOption {
  id: string;
  name: string;
  roomAllocation?: string;
  roleInTrip?: string;
  phone?: string;
}

interface TourExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId: string;
  passengers: PassengerOption[];
  initialPassengerId?: string | null;
  initialExpenseType?: TourExpenseType;
  editingExpense?: TourExpense | null;
}

export const TourExpenseModal: React.FC<TourExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignmentId,
  passengers,
  initialPassengerId,
  initialExpenseType,
  editingExpense,
}) => {
  const [expenseType, setExpenseType] = useState<TourExpenseType>('PASSENGER');
  const [passengerId, setPassengerId] = useState<string>('');
  const [passengerName, setPassengerName] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [passengerRole, setPassengerRole] = useState<string>('');

  const [category, setCategory] = useState<string>('MISCELLANEOUS');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseTime, setExpenseTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [splitType, setSplitType] = useState('SPLIT_EQUALLY');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = Boolean(editingExpense && editingExpense.id);

  useEffect(() => {
    if (editingExpense && editingExpense.id) {
      setExpenseType(editingExpense.expenseType || 'PASSENGER');
      setPassengerId(editingExpense.passengerId || '');
      setPassengerName(editingExpense.passengerName || '');
      setRoomNumber(editingExpense.roomNumber || '');
      setPassengerRole(editingExpense.passengerRole || '');
      setCategory(editingExpense.category || 'MISCELLANEOUS');
      setTitle(editingExpense.title || '');
      setAmount(String(editingExpense.amount || ''));
      setExpenseDate(
        editingExpense.expenseDate
          ? new Date(editingExpense.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setExpenseTime(editingExpense.expenseTime || '');
      setReceiptNumber(editingExpense.receiptNumber || '');
      setReceiptUrl(editingExpense.receiptUrl || '');
      setSplitType(editingExpense.splitType || 'SPLIT_EQUALLY');
      setNotes(editingExpense.notes || '');
    } else {
      // New expense
      const effectiveType = initialExpenseType || (editingExpense?.expenseType as TourExpenseType) || 'PASSENGER';
      setExpenseType(effectiveType);

      if (effectiveType === 'GENERAL') {
        setPassengerId('');
        setPassengerName('');
        setRoomNumber('');
        setPassengerRole('');
        setSplitType(editingExpense?.splitType || 'SPLIT_EQUALLY');
        setCategory(editingExpense?.category || 'WATER_BOTTLE');
      } else {
        if (initialPassengerId) {
          const p = passengers.find((x) => x.id === initialPassengerId);
          if (p) {
            setPassengerId(p.id);
            setPassengerName(p.name);
            setRoomNumber(p.roomAllocation || '');
            setPassengerRole(p.roleInTrip || '');
          }
        } else if (passengers.length > 0) {
          setPassengerId(passengers[0].id);
          setPassengerName(passengers[0].name);
          setRoomNumber(passengers[0].roomAllocation || '');
          setPassengerRole(passengers[0].roleInTrip || '');
        }
        setSplitType('SPLIT_EQUALLY');
        setCategory('MISCELLANEOUS');
      }

      setTitle(editingExpense?.title || '');
      setAmount(editingExpense?.amount ? String(editingExpense.amount) : '');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
      setReceiptNumber('');
      setReceiptUrl(editingExpense?.receiptUrl || '');
      setNotes('');
    }
    setFormError(null);
  }, [editingExpense, initialPassengerId, initialExpenseType, isOpen, passengers]);

  const handlePassengerSelect = (selectedId: string) => {
    setPassengerId(selectedId);
    const p = passengers.find((x) => x.id === selectedId);
    if (p) {
      setPassengerName(p.name);
      setRoomNumber(p.roomAllocation || '');
      setPassengerRole(p.roleInTrip || '');
    } else {
      setPassengerName('');
      setRoomNumber('');
      setPassengerRole('');
    }
  };

  const handleQuickCategorySelect = (cat: string, defaultTitle: string) => {
    setCategory(cat);
    if (!title) {
      setTitle(defaultTitle);
    }
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingSlip(true);
      setFormError(null);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'expenses');
      const res = await api.post('/upload/image?folder=expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setReceiptUrl(res.data.url);
      }
    } catch (err: any) {
      setFormError('Failed to upload bill receipt slip. Please try again.');
    } finally {
      setIsUploadingSlip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter what this expense was for.');
      return;
    }

    if (expenseType === 'PASSENGER' && !passengerName.trim()) {
      setFormError('Please select or specify the passenger for this expense.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        expenseType,
        passengerId: expenseType === 'PASSENGER' && passengerId !== '__manual__' ? passengerId || null : null,
        passengerName: expenseType === 'PASSENGER' ? passengerName.trim() : null,
        passengerRole: expenseType === 'PASSENGER' ? passengerRole || null : null,
        roomNumber: expenseType === 'PASSENGER' ? roomNumber || null : null,
        splitType: expenseType === 'GENERAL' ? (splitType || 'SPLIT_EQUALLY') : 'NO_SPLIT',
        category,
        title: title.trim(),
        amount: parsedAmount,
        expenseDate,
        expenseTime,
        receiptNumber: receiptNumber.trim() || null,
        receiptUrl: receiptUrl.trim() || null,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        await api.put(`/guides/assignments/${assignmentId}/expenses/${editingExpense!.id}`, payload);
      } else {
        await api.post(`/guides/assignments/${assignmentId}/expenses`, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save tour expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Tour Expense' : 'Log Field Tour Expense'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold">{formError}</p>
          </div>
        )}

        {/* Expense Classification Toggle */}
        <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpenseType('PASSENGER')}
            className={`flex-1 py-2 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2 ${
              expenseType === 'PASSENGER'
                ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Passenger Expense (Customer Extra)</span>
          </button>
          <button
            type="button"
            onClick={() => setExpenseType('GENERAL')}
            className={`flex-1 py-2 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2 ${
              expenseType === 'GENERAL'
                ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>General Tour Expense (Shared / Bus)</span>
          </button>
        </div>

        {/* PASSENGER EXPENSE: Passenger Selector */}
        {expenseType === 'PASSENGER' ? (
          <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/60 dark:border-brand-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Select or Enter Passenger Name *
              </label>
              {passengers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (passengerId === '__manual__') {
                      handlePassengerSelect(passengers[0]?.id || '');
                    } else {
                      setPassengerId('__manual__');
                      setPassengerName('');
                      setRoomNumber('');
                      setPassengerRole('');
                    }
                  }}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline"
                >
                  {passengerId === '__manual__' ? '← Select from Manifest List' : '+ Enter Name Manually'}
                </button>
              )}
            </div>

            {passengers.length > 0 && passengerId !== '__manual__' ? (
              <select
                required
                value={passengerId}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setPassengerId('__manual__');
                    setPassengerName('');
                    setRoomNumber('');
                    setPassengerRole('');
                  } else {
                    handlePassengerSelect(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="">-- Choose passenger from manifest --</option>
                {passengers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.roomAllocation ? `(Room ${p.roomAllocation})` : ''} - {p.roleInTrip || 'Passenger'}
                  </option>
                ))}
                <option value="__manual__">+ Other / Enter Custom Name Directly...</option>
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter Passenger / Customer Name..."
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Room # (Optional)"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {passengerName && passengerId !== '__manual__' && (
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                <span>Selected: <strong className="text-slate-900 dark:text-white">{passengerName}</strong></span>
                {roomNumber && (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                    <Bed className="w-3 h-3" />
                    <span>{roomNumber}</span>
                  </span>
                )}
                {passengerRole && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    {passengerRole}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* GENERAL EXPENSE: Group Split Settings */
          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl space-y-2">
            <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
              Shared Tour Expense & Cost Allocation
            </span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Select whether this is an internal company operational expense or divided across passengers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div
                onClick={() => setSplitType('COMPANY_EXPENSE')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  splitType === 'COMPANY_EXPENSE'
                    ? 'border-brand-600 bg-brand-50/80 dark:bg-brand-950/50 text-brand-900 dark:text-brand-100 shadow-xs ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <Building className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>🏢 Company / Internal Expense</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <strong>Do Not Divide.</strong> Absorbed as tour operating cost. NOT billed to travellers.
                </p>
              </div>

              <div
                onClick={() => setSplitType('SPLIT_EQUALLY')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  splitType === 'SPLIT_EQUALLY'
                    ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>👥 Split Equally Across Passengers</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Divided evenly per traveller (e.g. group water cartons, shared sightseeing entry).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Buttons */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Quick Categories
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickCategorySelect('WATER_BOTTLES', 'Mineral Water Bottles for Tour')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'WATER_BOTTLES'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Droplet className="w-3 h-3 text-cyan-400" />
              <span>Water Bottles</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCategorySelect('ENTRY_TICKETS', 'Entry Tickets / Monument Passes')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'ENTRY_TICKETS'
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Ticket className="w-3 h-3" />
              <span>Entry Tickets</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCategorySelect('MEALS_FOOD', 'Extra Meal / Lunch Expense')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'MEALS_FOOD'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Coffee className="w-3 h-3" />
              <span>Food / Meals</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCategorySelect('PARKING_TOLL', 'Toll & Bus Parking Fees')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'PARKING_TOLL'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Parking / Toll</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCategorySelect('DRIVER_ALLOWANCE', 'Driver Food & Allowance')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'DRIVER_ALLOWANCE'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Driver Allowance</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickCategorySelect('MISCELLANEOUS', 'Other General Tour Expense')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                category === 'MISCELLANEOUS'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>Other Expenses</span>
            </button>
          </div>
        </div>

        {/* Title & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Title / Item Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5x 20L Water Cans for Bus or Extra Boating Ticket"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* Date, Time & Bill / Receipt # */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Approx Time
            </label>
            <input
              type="text"
              placeholder="e.g. 11:30 AM"
              value={expenseTime}
              onChange={(e) => setExpenseTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bill / Receipt # (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. INV-9042"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Expense Slip / Bill Receipt Upload */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Bill Receipt / Expense Slip Photo (Optional)
          </label>
          {receiptUrl ? (
            <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={receiptUrl}
                  alt="Receipt Slip"
                  className="w-12 h-12 object-cover rounded-md border border-slate-200 dark:border-slate-600 shrink-0 bg-slate-100"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="text-[11px] truncate">
                  <span className="font-bold text-slate-900 dark:text-white block">Slip Attached</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (receiptUrl.startsWith('data:')) {
                        const w = window.open('');
                        if (w) {
                          w.document.write(`<img src="${receiptUrl}" style="max-width:100%; height:auto;" />`);
                          w.document.title = "Bill Slip Preview";
                        }
                      } else {
                        let fullUrl = receiptUrl;
                        if (fullUrl.startsWith('/uploads/')) {
                          const apiOrigin = api.defaults.baseURL ? new URL(api.defaults.baseURL, window.location.origin).origin : window.location.origin;
                          fullUrl = `${apiOrigin}${fullUrl}`;
                        }
                        window.open(fullUrl, '_blank');
                      }
                    }}
                    className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Bill Slip
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptUrl('')}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md border border-rose-200 dark:border-rose-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-semibold cursor-pointer text-xs transition-all shadow-xs">
                <Upload className="w-4 h-4 text-brand-600" />
                <span>{isUploadingSlip ? 'Uploading Slip...' : 'Upload Bill Slip / Camera Photo'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isUploadingSlip}
                  onChange={handleSlipUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-500">
                JPG, PNG, WebP or PDF bills
              </span>
            </div>
          )}
        </div>

        {/* Notes / Reason */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Reason / Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Add any specific context or remarks for this expense..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Tour Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

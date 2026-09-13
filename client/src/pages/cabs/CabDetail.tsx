import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Printer,
  Edit2,
  Trash2,
  DollarSign,
  Share2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { CabModal } from './CabModal.js';
import { CabBooking } from '../../types/index.js';

export const CabDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cab, setCab] = useState<CabBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCab = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/cabs/${id}`);
      setCab(res.data);
    } catch (err) {
      console.error('Failed to load cab booking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCab();
  }, [id]);

  const handleStatusChange = async (bookingStatus: string) => {
    try {
      await api.patch(`/cabs/${id}/status`, { bookingStatus });
      fetchCab();
    } catch (err) {
      console.error('Failed to update cab status:', err);
    }
  };

  const handlePaymentStatusChange = async (paymentStatus: string) => {
    try {
      await api.patch(`/cabs/${id}/status`, { paymentStatus });
      fetchCab();
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/cabs/${id}`);
      navigate('/cabs');
    } catch (err) {
      console.error('Failed to delete cab booking:', err);
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Loading cab booking details...
      </div>
    );
  }

  if (!cab) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">Cab booking not found.</p>
        <button
          onClick={() => navigate('/cabs')}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold"
        >
          Back to Cab Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cabs')}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {cab.bookingReference}
              </h1>
              <Badge status={cab.bookingStatus} />
              <Badge status={cab.paymentStatus} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Created on {new Date(cab.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/cabs/${cab.id}/voucher`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#C91F28]" />
            <span>Duty Slip / Voucher</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Booking</span>
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="Delete Cab Booking"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Customer Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <User className="w-4 h-4 text-brand-600" />
            Customer Information
          </h2>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-base block">
              {cab.customerName}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{cab.customerPhone}</span>
              <CopyButton text={cab.customerPhone} title="Copy phone" />
            </div>
            {cab.customerEmail && (
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{cab.customerEmail}</span>
                <CopyButton text={cab.customerEmail} title="Copy email" />
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <span className="text-slate-500">Passenger Count:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 ml-1.5">
              {cab.passengerCount} Guest(s)
            </span>
          </div>
        </div>

        {/* Route Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Trip Route & Schedule
          </h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pickup</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {cab.pickupPlace}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Drop</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {cab.dropPlace}
              </span>
            </div>
            {cab.travelRoute && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Route</span>
                <span className="text-slate-700 dark:text-slate-300">{cab.travelRoute}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500">Pickup Date & Time:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {new Date(cab.pickupDate).toLocaleDateString('en-IN')} at {cab.pickupTime}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle & Driver Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-amber-600" />
            Vehicle & Driver
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Vehicle:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {cab.vehicleType} ({cab.requiredCabType})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Car Number:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  {cab.carNumber || 'Not Assigned'}
                </span>
                {cab.carNumber && <CopyButton text={cab.carNumber} title="Copy Car No." />}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Driver:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {cab.driverName || 'Not Assigned'}
              </span>
            </div>
            {cab.driverPhone && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Driver Phone:</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cab.driverPhone}
                  </span>
                  <CopyButton text={cab.driverPhone} title="Copy Driver Phone" />
                </div>
              </div>
            )}
            {cab.cabProvider && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs">
                <span className="text-slate-500">Vendor:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {cab.cabProvider}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financials & Status Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Financial Breakdown & Quick Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Total Agreed Fare</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              ₹{Number(cab.cabAmount).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Advance Received</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{Number(cab.advanceAmount).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block mb-1">Balance Due</span>
            <span className="text-xl font-bold text-[#C91F28]">
              ₹{Number(cab.balanceAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Quick Status Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Trip Status:
            </span>
            {['CONFIRMED', 'ON_TRIP', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  cab.bookingStatus === st
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment:
            </span>
            {['PENDING', 'PARTIAL', 'PAID'].map((pst) => (
              <button
                key={pst}
                onClick={() => handlePaymentStatusChange(pst)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  cab.paymentStatus === pst
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {pst}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Special Instructions & Internal Notes */}
      {(cab.specialInstructions || cab.internalNotes) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cab.specialInstructions && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Special Instructions (Guest / Voucher)
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {cab.specialInstructions}
              </p>
            </div>
          )}
          {cab.internalNotes && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Internal Office Notes
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {cab.internalNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <CabModal
          isOpen={isEditModalOpen}
          initialData={cab}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => fetchCab()}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Cab Booking"
        message={`Are you sure you want to delete cab booking ${cab.bookingReference}? This action cannot be undone.`}
        confirmLabel="Delete Booking"
        isDanger
      />
    </div>
  );
};

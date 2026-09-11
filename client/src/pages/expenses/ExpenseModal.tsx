import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState('HOTEL_BOOKING');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/bookings?limit=50').then((res) => setBookings(res.data.data || []));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await api.post('/expenses', {
        category,
        amount: Number(amount),
        expenseDate,
        description,
        bookingId: bookingId || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Business Expense"
      subtitle="Track vendor disbursements and operating expenditures"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700">Expense Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
          >
            <option value="HOTEL_BOOKING">Hotel Booking</option>
            <option value="TRANSPORT">Transport & Cab</option>
            <option value="GUIDE">Local Tour Guide</option>
            <option value="FLIGHT_TICKETS">Flight Tickets</option>
            <option value="ENTRY_FEES">Monument / Park Entry</option>
            <option value="MARKETING">Marketing & Advertising</option>
            <option value="OFFICE">Office & Administration</option>
            <option value="MISC">Miscellaneous</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Amount (₹) *</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Expense Date *</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Related Booking (Optional)</label>
          <select
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
          >
            <option value="">-- General Operational Expense (No Booking) --</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bookingNumber} ({b.customer?.fullName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Description *</label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Paid cab chauffeur advance for 3 days Mysore trip..."
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Bell,
  Sparkles,
  Users,
  BookmarkCheck,
  FileText,
  Clock,
  ChevronDown,
  X,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';

interface NavbarProps {
  onOpenLeadModal?: () => void;
  onOpenCustomerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLeadModal,
  onOpenCustomerModal,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick Action menu state
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  // Follow-up notifications state
  const [followUpCounts, setFollowUpCounts] = useState<{ today: number; overdue: number }>({
    today: 0,
    overdue: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/followups/counts');
        setFollowUpCounts(res.data);
      } catch (err) {
        // quiet error
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data);
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setIsQuickOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAlerts = followUpCounts.today + followUpCounts.overdue;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Search Input Container */}
      <div className="relative w-96 max-w-full" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setIsSearchOpen(true);
            }}
            placeholder="Search customers, leads, bookings, packages..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 py-2 max-h-96 overflow-y-auto z-50">
            {isSearching ? (
              <p className="px-4 py-3 text-xs text-slate-500 text-center">Searching database...</p>
            ) : (
              <div>
                {/* Customers */}
                {searchResults.customers?.length > 0 && (
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Customers</p>
                    {searchResults.customers.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          navigate(`/customers/${c.id}`);
                          setIsSearchOpen(false);
                        }}
                        className="px-2 py-1.5 text-xs hover:bg-slate-50 rounded-md cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-800">{c.fullName}</span>
                        <span className="text-[11px] text-slate-500">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Leads */}
                {searchResults.leads?.length > 0 && (
                  <div className="px-3 py-1.5 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Leads</p>
                    {searchResults.leads.map((l: any) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          navigate(`/leads/${l.id}`);
                          setIsSearchOpen(false);
                        }}
                        className="px-2 py-1.5 text-xs hover:bg-slate-50 rounded-md cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-800">{l.destination}</span>
                        <span className="text-[11px] text-slate-500">{l.customerName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bookings */}
                {searchResults.bookings?.length > 0 && (
                  <div className="px-3 py-1.5 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Bookings</p>
                    {searchResults.bookings.map((b: any) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          navigate(`/bookings/${b.id}`);
                          setIsSearchOpen(false);
                        }}
                        className="px-2 py-1.5 text-xs hover:bg-slate-50 rounded-md cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-brand-600">{b.bookingNumber}</span>
                        <span className="text-[11px] text-slate-500">{b.customerName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty check */}
                {!searchResults.customers?.length &&
                  !searchResults.leads?.length &&
                  !searchResults.bookings?.length &&
                  !searchResults.packages?.length && (
                    <p className="px-4 py-3 text-xs text-slate-500 text-center">No matching database records found.</p>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Action Button */}
        <div className="relative" ref={quickRef}>
          <button
            type="button"
            onClick={() => setIsQuickOpen(!isQuickOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isQuickOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/leads?action=create');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5"
              >
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>New Lead / Enquiry</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/customers?action=create');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5"
              >
                <Users className="w-4 h-4 text-brand-600" />
                <span>New Customer</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/quotations?action=create');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5"
              >
                <FileText className="w-4 h-4 text-brand-600" />
                <span>New Quotation</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/bookings?action=create');
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-2.5"
              >
                <BookmarkCheck className="w-4 h-4 text-brand-600" />
                <span>New Booking</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications / Follow-up due reminder */}
        <button
          type="button"
          onClick={() => navigate('/followups')}
          title="Follow-ups due"
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {totalAlerts > 0 && (
            <span
              className={`absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${
                followUpCounts.overdue > 0 ? 'bg-red-600' : 'bg-amber-500'
              }`}
            >
              {totalAlerts}
            </span>
          )}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold text-xs flex items-center justify-center">
            {user?.name?.charAt(0) || 'O'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</span>
            <span className="text-[10px] text-slate-500 capitalize">{user?.role?.toLowerCase()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Bell,
  Sparkles,
  Users,
  BookmarkCheck,
  FileText,
  ChevronDown,
  X,
  ArrowLeft,
  Sun,
  Moon,
  Car,
  Menu,
  Crown,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { LanguageSelector } from '../common/LanguageSelector.js';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
  onOpenLeadModal?: () => void;
  onOpenCustomerModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { company } = useCompanySettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Subscription notice calculation for customer organizations
  const subscriptionNotice = React.useMemo(() => {
    if (company?.isOoting) return null;
    if (!company?.subscriptionExpiresAt) return null;
    const expiry = new Date(company.subscriptionExpiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const formattedDate = expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    if (daysLeft < 0) {
      return {
        type: 'expired',
        daysLeft,
        text: `Plan Expired (${formattedDate})`,
        urgent: true,
      };
    }
    if (daysLeft <= 14) {
      return {
        type: 'expiring_soon',
        daysLeft,
        text: `Plan expires in ${daysLeft}d (${formattedDate})`,
        urgent: true,
      };
    }
    return {
      type: 'active',
      daysLeft,
      text: `Plan valid until ${formattedDate} (${daysLeft}d left)`,
      urgent: false,
    };
  }, [company?.isOoting, company?.subscriptionExpiresAt]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick Action menu state
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  // Follow-up notifications state
  const [followUpCounts, setFollowUpCounts] = useState<{ today: number; overdue: number }>({
    today: 0,
    overdue: 0,
  });

  const isSubPage = location.pathname !== '/';

  useEffect(() => {
    const fetchCounts = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await api.get('/followups/counts');
        setFollowUpCounts(res.data);
      } catch (err) {
        // quiet error
      }
    };
    fetchCounts();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    const interval = setInterval(fetchCounts, 60000); // 60s relaxed interval for live multi-user sync
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
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

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K to focus Search
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const totalAlerts = followUpCounts.today + followUpCounts.overdue;

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      {/* Left Section: Mobile Menu, Back Arrow & Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          title="Open Menu"
          className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex-shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Navigation Back Arrow on Sub-Pages */}
        {isSubPage && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            title="Go Back"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Search Input Container */}
        <div className="relative w-full" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setIsSearchOpen(true);
              }}
              placeholder="Search customers, leads, bookings, packages..."
              className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-2.5 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-md pointer-events-none">
                Ctrl K
              </span>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchResults && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 max-h-96 overflow-y-auto z-50">
              {isSearching ? (
                <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                  Searching database...
                </p>
              ) : (
                <div>
                  {/* Customers */}
                  {searchResults.customers?.length > 0 && (
                    <div className="px-3 py-1.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                        Customers
                      </p>
                      {searchResults.customers.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            navigate(`/customers/${c.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {c.fullName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.phone}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leads */}
                  {searchResults.leads?.length > 0 && (
                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                        Leads
                      </p>
                      {searchResults.leads.map((l: any) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            navigate(`/leads/${l.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {l.destination}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {l.customerName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bookings */}
                  {searchResults.bookings?.length > 0 && (
                    <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                        Bookings
                      </p>
                      {searchResults.bookings.map((b: any) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            navigate(`/bookings/${b.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-brand-600 dark:text-brand-400">
                            {b.bookingNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {b.customerName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty check */}
                  {!searchResults.customers?.length &&
                    !searchResults.leads?.length &&
                    !searchResults.bookings?.length &&
                    !searchResults.packages?.length && (
                      <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                        No matching database records found.
                      </p>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Subscription Expiry Reminder */}
        {subscriptionNotice && (
          <div
            title={`Your organization plan expires on ${new Date(company.subscriptionExpiresAt!).toLocaleDateString('en-IN')}. Please contact Master Admin to renew access.`}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              subscriptionNotice.urgent
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>{subscriptionNotice.text}</span>
          </div>
        )}

        {/* Multilingual Selector */}
        <LanguageSelector />

        {/* Dark / Light Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors shadow-2xs cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* Quick Action Button */}
        <div className="relative" ref={quickRef}>
          <button
            type="button"
            onClick={() => setIsQuickOpen(!isQuickOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create New</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isQuickOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-1.5 z-50 ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in-50 zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/leads?action=create');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>New Lead / Enquiry</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/customers?action=create');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>New Customer</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/quotations/new');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>New Quotation</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/cabs?action=create');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Car className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>New Cab Booking</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickOpen(false);
                  navigate('/bookings?action=create');
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
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
          className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shadow-2xs cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {totalAlerts > 0 && (
            <span
              className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-xs ${
                followUpCounts.overdue > 0 ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
              }`}
            >
              {totalAlerts}
            </span>
          )}
        </button>

        {/* User Pill Capsule */}
        <div
          onClick={() => navigate('/settings')}
          title="User Profile & Settings"
          className="flex items-center gap-2.5 pl-2.5 pr-3 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-800 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              {user?.role?.toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

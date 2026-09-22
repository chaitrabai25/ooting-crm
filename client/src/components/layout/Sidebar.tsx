import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Compass,
  CalendarCheck,
  FileText,
  BookmarkCheck,
  CreditCard,
  Receipt,
  Briefcase,
  Building2,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  History,
  LogOut,
  Sparkles,
  Car,
  Calendar,
  MessageSquare,
  ChevronDown,
  Upload,
  Download,
  UserCheck,
  ArrowDownUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface NavLinkItem {
  type: 'link';
  name: string;
  path: string;
  icon: React.ElementType;
  module?: string;
  matchQuery?: { param: string; value: string };
}

interface NavGroupItem {
  type: 'group';
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavLinkItem[];
}

type NavItem = NavLinkItem | NavGroupItem;

interface NavigationSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user, logout, can } = useAuth();
  const location = useLocation();

  // Collapsible groups open/closed state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'leads-enquiries': true,
    bookings: true,
    b2b: true,
    'import-export': false,
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isLinkActive = (item: NavLinkItem): boolean => {
    const itemUrl = new URL(item.path, 'http://dummy.com');
    const itemPath = itemUrl.pathname;
    const itemParams = itemUrl.searchParams;

    if (item.path === '/') {
      return location.pathname === '/';
    }

    if (location.pathname !== itemPath) {
      return false;
    }

    // Check specific query params if configured
    if (item.matchQuery) {
      const currentVal = new URLSearchParams(location.search).get(item.matchQuery.param) || '';
      return currentVal === item.matchQuery.value;
    }

    if (itemParams.has('tab')) {
      const targetTab = itemParams.get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || (itemPath === '/leads' ? 'all' : '');
      return currentTab === targetTab;
    }

    return true;
  };

  // Auto-expand parent group if a child is active
  useEffect(() => {
    navigationSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.type === 'group') {
          const hasActiveChild = item.items.some((child) => isLinkActive(child));
          if (hasActiveChild) {
            setOpenGroups((prev) => ({ ...prev, [item.id]: true }));
          }
        }
      });
    });
  }, [location.pathname, location.search]);

  const navigationSections: NavigationSection[] = [
    {
      title: 'Main',
      items: [
        { type: 'link', name: 'Dashboard', path: '/', icon: LayoutDashboard, module: 'dashboard' },
        { type: 'link', name: 'CRM Calendar', path: '/calendar', icon: Calendar, module: 'calendar' },
      ],
    },
    {
      title: 'Sales & Operations',
      items: [
        {
          type: 'group',
          id: 'leads-enquiries',
          title: 'Leads & Enquiries',
          icon: Sparkles,
          items: [
            {
              type: 'link',
              name: 'Leads',
              path: '/leads?tab=new',
              icon: UserCheck,
              module: 'leads',
              matchQuery: { param: 'tab', value: 'new' },
            },
            {
              type: 'link',
              name: 'Enquiries',
              path: '/leads?tab=all',
              icon: Sparkles,
              module: 'leads',
              matchQuery: { param: 'tab', value: 'all' },
            },
            {
              type: 'link',
              name: 'Follow-ups',
              path: '/followups',
              icon: CalendarCheck,
              module: 'followups',
            },
          ],
        },
        { type: 'link', name: 'Quotations', path: '/quotations', icon: FileText, module: 'quotations' },
        {
          type: 'group',
          id: 'bookings',
          title: 'Bookings',
          icon: BookmarkCheck,
          items: [
            {
              type: 'link',
              name: 'Tour Bookings',
              path: '/bookings',
              icon: BookmarkCheck,
              module: 'bookings',
            },
            {
              type: 'link',
              name: 'Cab Bookings',
              path: '/cabs',
              icon: Car,
              module: 'cabs',
            },
          ],
        },
        { type: 'link', name: 'Customers', path: '/customers', icon: Users, module: 'customers' },
        { type: 'link', name: 'Passenger List', path: '/passengers', icon: Users, module: 'customers' },
        { type: 'link', name: 'Bulk WhatsApp', path: '/whatsapp', icon: MessageSquare, module: 'whatsapp' },
      ],
    },
    {
      title: 'Travel Products',
      items: [
        { type: 'link', name: 'Packages & Itinerary', path: '/packages', icon: Compass, module: 'packages' },
      ],
    },
    {
      title: 'Partnerships',
      items: [
        {
          type: 'group',
          id: 'b2b',
          title: 'B2B',
          icon: Briefcase,
          items: [
            {
              type: 'link',
              name: 'Travel Agents',
              path: '/agents',
              icon: Briefcase,
              module: 'agents',
            },
            {
              type: 'link',
              name: 'Service Providers',
              path: '/suppliers',
              icon: Building2,
              module: 'suppliers',
            },
          ],
        },
      ],
    },
    {
      title: 'Finance & Accounts',
      items: [
        { type: 'link', name: 'Payments', path: '/payments', icon: CreditCard, module: 'payments' },
        { type: 'link', name: 'Expenses', path: '/expenses', icon: Receipt, module: 'expenses' },
      ],
    },
    {
      title: 'Data & Tools',
      items: [
        {
          type: 'group',
          id: 'import-export',
          title: 'Import / Export',
          icon: ArrowDownUp,
          items: [
            {
              type: 'link',
              name: 'Import Data',
              path: '/import-export?tab=import',
              icon: Upload,
              matchQuery: { param: 'tab', value: 'import' },
            },
            {
              type: 'link',
              name: 'Export Data',
              path: '/import-export?tab=export',
              icon: Download,
              matchQuery: { param: 'tab', value: 'export' },
            },
          ],
        },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { type: 'link', name: 'Business Reports', path: '/reports', icon: FileSpreadsheet, module: 'reports' },
        { type: 'link', name: 'Analytics', path: '/analytics', icon: BarChart3, module: 'analytics' },
      ],
    },
    {
      title: 'Administration',
      adminOnly: true,
      items: [
        { type: 'link', name: 'Staff Users', path: '/users', icon: ShieldCheck, module: 'users' },
        { type: 'link', name: 'Settings', path: '/settings', icon: Settings, module: 'settings' },
        { type: 'link', name: 'Audit Logs', path: '/audit-logs', icon: History, module: 'audit-logs' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-800 z-30 select-none shadow-xl">
      {/* Brand Header with authentic Ooting logo */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800 bg-slate-950/80">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white p-0.5 shadow-sm border border-slate-700">
          <img
            src="/assets/ooting-logo.jpg"
            alt="Ooting"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-sm tracking-wide text-white truncate">OOTING CRM</span>
          <span className="text-[10px] text-brand-400 font-semibold tracking-tight truncate">
            Journeys Beyond Ordinary
          </span>
        </div>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navigationSections.map((section, idx) => {
          if (section.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
            return null;
          }

          // Filter items based on permissions
          const visibleItems = section.items
            .map((item) => {
              if (item.type === 'link') {
                if (!item.module) return item;
                return can(item.module, 'view') ? item : null;
              } else {
                // Group item: only keep visible children
                const visibleChildren = item.items.filter((child) => {
                  if (!child.module) return true;
                  return can(child.module, 'view');
                });
                if (visibleChildren.length === 0) return null;
                return { ...item, items: visibleChildren };
              }
            })
            .filter(Boolean) as NavItem[];

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  if (item.type === 'link') {
                    const Icon = item.icon;
                    const active = isLinkActive(item);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? 'bg-[#C91F28] text-white shadow-md shadow-red-950/40 font-bold'
                            : 'text-slate-200 hover:text-white hover:bg-slate-800/80 active:scale-[0.99]'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  }

                  // Group item
                  const GroupIcon = item.icon;
                  const isOpen = !!openGroups[item.id];
                  const hasActiveChild = item.items.some((child) => isLinkActive(child));

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          hasActiveChild
                            ? 'text-white font-bold bg-slate-800/50'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GroupIcon className={`w-4 h-4 flex-shrink-0 ${hasActiveChild ? 'text-[#C91F28]' : 'text-slate-400'}`} />
                          <span>{item.title}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-white' : ''
                          }`}
                        />
                      </button>

                      {/* Group Children (Accordion) */}
                      {isOpen && (
                        <div className="pl-3.5 space-y-0.5 ml-3 border-l border-slate-800 my-0.5">
                          {item.items.map((child) => {
                            const ChildIcon = child.icon;
                            const active = isLinkActive(child);

                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  active
                                    ? 'bg-[#C91F28] text-white font-bold shadow-xs shadow-red-950/30'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                                }`}
                              >
                                <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{child.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User profile & logout footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-850/60 border border-slate-800/60">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate">{user?.name}</span>
            <span className="text-[10px] text-brand-400 uppercase font-medium tracking-wide truncate">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

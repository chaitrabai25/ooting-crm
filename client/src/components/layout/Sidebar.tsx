import React from 'react';
import { NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Sidebar: React.FC = () => {
  const { user, logout, can } = useAuth();

  const navigationSections = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, module: 'dashboard' },
        { name: 'CRM Calendar', path: '/calendar', icon: Calendar, module: 'calendar' },
      ],
    },
    {
      title: 'Sales & Operations',
      items: [
        { name: 'Leads & Enquiries', path: '/leads', icon: Sparkles, module: 'leads' },
        { name: 'Quotations', path: '/quotations', icon: FileText, module: 'quotations' },
        { name: 'Tour Bookings', path: '/bookings', icon: BookmarkCheck, module: 'bookings' },
        { name: 'CAB Bookings', path: '/cabs', icon: Car, module: 'cabs' },
        { name: 'Follow-ups', path: '/followups', icon: CalendarCheck, module: 'followups' },
        { name: 'Customers', path: '/customers', icon: Users, module: 'customers' },
        { name: 'Passenger List', path: '/passengers', icon: Users, module: 'customers' },
        { name: 'Bulk WhatsApp', path: '/whatsapp', icon: MessageSquare, module: 'whatsapp' },
      ],
    },
    {
      title: 'Travel Products',
      items: [
        { name: 'Packages & Itinerary', path: '/packages', icon: Compass, module: 'packages' },
      ],
    },
    {
      title: 'Partnerships',
      items: [
        { name: 'B2B Travel Agents', path: '/agents', icon: Briefcase, module: 'agents' },
        { name: 'B2B Service Providers', path: '/suppliers', icon: Building2, module: 'suppliers' },
      ],
    },
    {
      title: 'Finance & Accounts',
      items: [
        { name: 'Payments', path: '/payments', icon: CreditCard, module: 'payments' },
        { name: 'Expenses', path: '/expenses', icon: Receipt, module: 'expenses' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Business Reports', path: '/reports', icon: FileSpreadsheet, module: 'reports' },
        { name: 'Analytics', path: '/analytics', icon: BarChart3, module: 'analytics' },
      ],
    },
    {
      title: 'Administration',
      adminOnly: true,
      items: [
        { name: 'Staff Users', path: '/users', icon: ShieldCheck, module: 'users' },
        { name: 'Settings', path: '/settings', icon: Settings, module: 'settings' },
        { name: 'Audit Logs', path: '/audit-logs', icon: History, module: 'audit-logs' },
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
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navigationSections.map((section, idx) => {
          if (section.adminOnly && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
            return null;
          }

          const visibleItems = section.items.filter((item) => {
            if (!item.module) return true;
            return can(item.module, 'view');
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <RouterNavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[#C91F28] text-white shadow-md shadow-red-950/40'
                            : 'text-slate-200 hover:text-white hover:bg-slate-800/80 active:scale-[0.99]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </RouterNavLink>
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
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

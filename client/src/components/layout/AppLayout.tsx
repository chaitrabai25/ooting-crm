import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Navbar } from './Navbar.js';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors print:bg-white print:min-h-0 print:block">
      <div className="no-print print:hidden">
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 print:block print:w-full">
        <div className="no-print print:hidden">
          <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        </div>
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

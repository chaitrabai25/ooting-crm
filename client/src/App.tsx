import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AppLayout } from './components/layout/AppLayout.js';

// Pages
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';

import { LeadList } from './pages/leads/LeadList.js';
import { LeadDetail } from './pages/leads/LeadDetail.js';

import { FollowUpList } from './pages/followups/FollowUpList.js';
import { CalendarPage } from './pages/calendar/CalendarPage.js';

import { CustomerList } from './pages/customers/CustomerList.js';
import { CustomerDetail } from './pages/customers/CustomerDetail.js';

import { PackageList } from './pages/packages/PackageList.js';
import { PackageDetail } from './pages/packages/PackageDetail.js';
import { ItineraryPdfView } from './pages/packages/ItineraryPdfView.js';

import { QuotationList } from './pages/quotations/QuotationList.js';
import { QuotationBuilder } from './pages/quotations/QuotationBuilder.js';
import { QuotationView } from './pages/quotations/QuotationView.js';

import { BookingList } from './pages/bookings/BookingList.js';
import { BookingDetail } from './pages/bookings/BookingDetail.js';
import { PassengerList } from './pages/passengers/PassengerList.js';

import { CabList } from './pages/cabs/CabList.js';
import { CabDetail } from './pages/cabs/CabDetail.js';
import { CabVoucher } from './pages/cabs/CabVoucher.js';

import { BulkWhatsAppPage } from './pages/whatsapp/BulkWhatsAppPage.js';

import { PaymentList } from './pages/payments/PaymentList.js';
import { ExpenseList } from './pages/expenses/ExpenseList.js';

import { AgentList } from './pages/agents/AgentList.js';
import { AgentDetail } from './pages/agents/AgentDetail.js';

import { AnalyticsPage } from './pages/analytics/AnalyticsPage.js';
import { ReportsPage } from './pages/reports/ReportsPage.js';

import { UserList } from './pages/users/UserList.js';
import { SettingsPage } from './pages/settings/SettingsPage.js';
import { AuditLogsPage } from './pages/audit-logs/AuditLogsPage.js';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />

                {/* CRM Calendar & Schedule */}
                <Route path="/calendar" element={<CalendarPage />} />

                {/* Leads & Enquiries */}
                <Route path="/leads" element={<LeadList />} />
                <Route path="/leads/:id" element={<LeadDetail />} />

                {/* Follow-ups */}
                <Route path="/followups" element={<FollowUpList />} />

                {/* Customers */}
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />

                {/* Travel Packages & Itineraries */}
                <Route path="/packages" element={<PackageList />} />
                <Route path="/packages/:id" element={<PackageDetail />} />
                <Route path="/packages/:id/itinerary-pdf" element={<ItineraryPdfView />} />

                {/* Quotations */}
                <Route path="/quotations" element={<QuotationList />} />
                <Route path="/quotations/new" element={<QuotationBuilder />} />
                <Route path="/quotations/:id" element={<QuotationView />} />
                <Route path="/quotations/:id/edit" element={<QuotationBuilder />} />

                {/* Tour Bookings */}
                <Route path="/bookings" element={<BookingList />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/passengers" element={<PassengerList />} />

                {/* Tourist Cab Transfers & Duty Slips */}
                <Route path="/cabs" element={<CabList />} />
                <Route path="/cabs/:id" element={<CabDetail />} />
                <Route path="/cabs/:id/voucher" element={<CabVoucher />} />

                {/* Automated & Bulk WhatsApp */}
                <Route path="/whatsapp" element={<BulkWhatsAppPage />} />

                {/* Payments & Financials */}
                <Route path="/payments" element={<PaymentList />} />
                <Route path="/expenses" element={<ExpenseList />} />

                {/* B2B Travel Agents */}
                <Route path="/agents" element={<AgentList />} />
                <Route path="/agents/:id" element={<AgentDetail />} />

                {/* Reports & Analytics */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* Administration (Admin & Super Admin only) */}
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                  <Route path="/users" element={<UserList />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

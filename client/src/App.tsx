/**
 * Application Entry & Router
 * Implements code splitting and route-level lazy loading to optimize initial load times.
 * Only requested modules and dependencies are loaded on demand.
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { CompanySettingsProvider } from './context/CompanySettingsContext.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { PageLoader } from './components/ui/PageLoader.js';

// Lazy-loaded Pages (loaded on demand to ensure lightning fast initial startup)
const Login = lazy(() => import('./pages/Login.js').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard.js').then(m => ({ default: m.Dashboard })));

const LeadList = lazy(() => import('./pages/leads/LeadList.js').then(m => ({ default: m.LeadList })));
const LeadDetail = lazy(() => import('./pages/leads/LeadDetail.js').then(m => ({ default: m.LeadDetail })));

const FollowUpList = lazy(() => import('./pages/followups/FollowUpList.js').then(m => ({ default: m.FollowUpList })));
const CalendarPage = lazy(() => import('./pages/calendar/CalendarPage.js').then(m => ({ default: m.CalendarPage })));

const CustomerList = lazy(() => import('./pages/customers/CustomerList.js').then(m => ({ default: m.CustomerList })));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail.js').then(m => ({ default: m.CustomerDetail })));

const PackageList = lazy(() => import('./pages/packages/PackageList.js').then(m => ({ default: m.PackageList })));
const PackageDetail = lazy(() => import('./pages/packages/PackageDetail.js').then(m => ({ default: m.PackageDetail })));
const ItineraryPdfView = lazy(() => import('./pages/packages/ItineraryPdfView.js').then(m => ({ default: m.ItineraryPdfView })));

const PlaceList = lazy(() => import('./pages/places/PlaceList.js').then(m => ({ default: m.PlaceList })));
const HotelList = lazy(() => import('./pages/hotels/HotelList.js').then(m => ({ default: m.HotelList })));

const QuotationList = lazy(() => import('./pages/quotations/QuotationList.js').then(m => ({ default: m.QuotationList })));
const QuotationBuilder = lazy(() => import('./pages/quotations/QuotationBuilder.js').then(m => ({ default: m.QuotationBuilder })));
const QuotationView = lazy(() => import('./pages/quotations/QuotationView.js').then(m => ({ default: m.QuotationView })));

const BookingList = lazy(() => import('./pages/bookings/BookingList.js').then(m => ({ default: m.BookingList })));
const BookingDetail = lazy(() => import('./pages/bookings/BookingDetail.js').then(m => ({ default: m.BookingDetail })));
const PassengerList = lazy(() => import('./pages/passengers/PassengerList.js').then(m => ({ default: m.PassengerList })));

const CabList = lazy(() => import('./pages/cabs/CabList.js').then(m => ({ default: m.CabList })));
const CabDetail = lazy(() => import('./pages/cabs/CabDetail.js').then(m => ({ default: m.CabDetail })));
const CabVoucher = lazy(() => import('./pages/cabs/CabVoucher.js').then(m => ({ default: m.CabVoucher })));

const BulkWhatsAppPage = lazy(() => import('./pages/whatsapp/BulkWhatsAppPage.js').then(m => ({ default: m.BulkWhatsAppPage })));

const PaymentList = lazy(() => import('./pages/payments/PaymentList.js').then(m => ({ default: m.PaymentList })));
const ExpenseList = lazy(() => import('./pages/expenses/ExpenseList.js').then(m => ({ default: m.ExpenseList })));

const AgentList = lazy(() => import('./pages/agents/AgentList.js').then(m => ({ default: m.AgentList })));
const AgentDetail = lazy(() => import('./pages/agents/AgentDetail.js').then(m => ({ default: m.AgentDetail })));

const SupplierList = lazy(() => import('./pages/suppliers/SupplierList.js').then(m => ({ default: m.SupplierList })));
const SupplierDetail = lazy(() => import('./pages/suppliers/SupplierDetail.js').then(m => ({ default: m.SupplierDetail })));

const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage.js').then(m => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.js').then(m => ({ default: m.ReportsPage })));

const UserList = lazy(() => import('./pages/users/UserList.js').then(m => ({ default: m.UserList })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.js').then(m => ({ default: m.SettingsPage })));
const AuditLogsPage = lazy(() => import('./pages/audit-logs/AuditLogsPage.js').then(m => ({ default: m.AuditLogsPage })));
const ImportExportPage = lazy(() => import('./pages/import-export/ImportExportPage.js').then(m => ({ default: m.ImportExportPage })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CompanySettingsProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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

                    {/* Master Data */}
                    <Route path="/places" element={<PlaceList />} />
                    <Route path="/hotels" element={<HotelList />} />

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

                    {/* B2B Suppliers */}
                    <Route path="/suppliers" element={<SupplierList />} />
                    <Route path="/suppliers/:id" element={<SupplierDetail />} />

                    {/* Reports & Analytics */}
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />

                    {/* Import & Export Center */}
                    <Route path="/import-export" element={<ImportExportPage />} />

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
            </Suspense>
          </BrowserRouter>
        </CompanySettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'OPERATIONS' | 'ACCOUNTANT' | 'AGENT';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTATION_SENT' | 'FOLLOW_UP' | 'WON' | 'LOST' | 'CANCELLED';

export type BookingStatus = 'ENQUIRY' | 'HOLD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export type FollowUpType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'OTHER';

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: {
    leads: number;
    bookings: number;
  };
}

export interface Lead {
  id: string;
  customerId: string;
  customer: Customer;
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  source: string;
  destination: string;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  budget?: number | null;
  packageId?: string | null;
  package?: { id: string; packageName: string; price: number } | null;
  enquiryStatus: LeadStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string | null;
  nextFollowUpAt?: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: FollowUp[];
  _count?: {
    followUps: number;
    quotations: number;
  };
}

export interface FollowUp {
  id: string;
  leadId: string;
  lead?: {
    id: string;
    destination: string;
    customer: { id: string; fullName: string; phone: string; email?: string | null };
  };
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; email: string } | null;
  scheduledAt: string;
  type: FollowUpType;
  notes?: string | null;
  status: FollowUpStatus;
  completedAt?: string | null;
  createdAt: string;
}

export interface Traveller {
  id?: string;
  bookingId?: string;
  name: string;
  age?: number | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PassengerItem {
  id: string;
  bookingId: string;
  bookingNumber: string;
  packageId?: string | null;
  packageName: string;
  bookingDate: string;
  travelStartDate: string;
  travelEndDate: string;
  bookingStatus: BookingStatus;
  paymentStatus?: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  title: string;
  description: string;
  activities?: string | null;
  places?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  imageUrl?: string | null;
  images?: string | null;
}

export interface Package {
  id: string;
  packageName: string;
  destination: string;
  duration: string;
  description: string;
  price: number;
  packageType: string;
  inclusions?: string | null;
  exclusions?: string | null;
  imageUrl?: string | null;
  gallery?: string | null;
  status: string;
  createdAt: string;
  itineraries?: ItineraryDay[];
  _count?: {
    bookings: number;
    leads: number;
  };
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId?: string | null;
  customerId: string;
  customer: Customer;
  packageId?: string | null;
  package?: Package | null;
  destination: string;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  accommodation?: string | null;
  transport?: string | null;
  activities?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  basePrice: number;
  discount: number;
  tax: number;
  cabDetails?: string | null;
  additionalCharges?: number;
  paymentTerms?: string | null;
  cancellationTerms?: string | null;
  notes?: string | null;
  finalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | string;
  termsAndConditions?: string | null;
  createdById?: string | null;
  createdByUser?: { id: string; name: string; email: string; phone?: string | null } | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customer: Customer;
  leadId?: string | null;
  packageId?: string | null;
  package?: Package | null;
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string } | null;
  travelStartDate: string;
  travelEndDate: string;
  travellers: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  bookingStatus: BookingStatus;
  bookingDate: string;
  serviceProviders?: string | null;
  notes?: string | null;
  createdAt: string;
  travellersList?: Traveller[];
  payments?: Payment[];
  expenses?: Expense[];
}

export interface Payment {
  id: string;
  bookingId: string;
  booking?: {
    id: string;
    bookingNumber: string;
    customer: { fullName: string; phone: string };
  };
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  createdAt: string;
}

export interface Agent {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  agentType?: 'Diamond' | 'Gold' | 'Silver' | string;
  googleReviewUrl?: string | null;
  googleReviewRating?: number | null;
  googleReviewNotes?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  totalBookings?: number;
  totalRevenue?: number;
  totalCommission?: number;
  pendingCommission?: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  bookingId?: string | null;
  booking?: { id: string; bookingNumber: string };
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface DashboardCards {
  totalLeads: number;
  newLeads: number;
  inProgressLeads?: number;
  wonLeads?: number;
  totalQuotations?: number;
  draftQuotations?: number;
  acceptedQuotations?: number;
  totalBookings: number;
  confirmedBookings: number;
  departuresToday?: number;
  totalCabs?: number;
  activeCabs?: number;
  totalCustomers?: number;
  totalRevenue: number;
  totalCollected: number;
  pendingPayments: number;
  b2bBookings?: number;
  conversionRate?: number;
  followUpsToday?: number;
}

export interface TodaysTasks {
  todayFollowUps: any[];
  overdueFollowUps: any[];
  todayDepartures: any[];
  todayCabs: any[];
  expiringQuotations: any[];
}

export interface CabBooking {
  id: string;
  bookingReference: string;
  customerId?: string | null;
  customer?: Customer | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  leadId?: string | null;
  bookingId?: string | null;
  booking?: Booking | null;
  packageId?: string | null;
  package?: Package | null;
  assignedStaffId?: string | null;
  assignedStaff?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
  pickupDate: string;
  pickupTime: string;
  pickupPlace: string;
  dropPlace: string;
  travelRoute?: string | null;
  enquiryDate?: string | null;
  carNumber?: string | null;
  vehicleType: 'SEDAN' | 'SUV' | 'INNOVA' | 'TEMPO_TRAVELLER' | 'HATCHBACK' | 'LUXURY' | string;
  passengerCount: number;
  driverName?: string | null;
  driverPhone?: string | null;
  cabProvider?: string | null;
  requiredCabType: 'AC' | 'NON_AC' | string;
  tripType: 'ONE_WAY' | 'ROUND_TRIP' | 'LOCAL' | 'OUTSTATION' | string;
  estimatedDistance?: string | null;
  estimatedDuration?: string | null;
  cabAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | string;
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'ON_TRIP' | 'COMPLETED' | 'CANCELLED' | string;
  specialInstructions?: string | null;
  internalNotes?: string | null;
  driverAllowanceType?: 'NONE' | 'DAY_WISE' | 'NIGHT_WISE' | 'CUSTOM' | string | null;
  driverAllowanceRate?: number | null;
  driverAllowanceDays?: number | null;
  driverAllowanceTotal?: number | null;
  dutyRange?: string | null;
  customTableRows?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  eventType: 'MEETING' | 'TASK' | 'REMINDER' | 'FOLLOW_UP' | 'CAB_TRIP' | 'DEPARTURE' | 'PAYMENT_DUE' | 'LEAVE' | string;
  startDate: string;
  endDate?: string | null;
  allDay: boolean;
  userId?: string | null;
  user?: { id: string; name: string } | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  color?: string | null;
  source?: string;
  refId?: string;
  meta?: any;
  createdAt?: string;
}

export interface StaffWorkload {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  metrics: {
    activeLeads: number;
    todayFollowUps: number;
    activeBookings: number;
    upcomingCabs: number;
    todayEvents: number;
    totalActiveTasks: number;
  };
  availability: 'AVAILABLE' | 'BUSY' | 'OVERLOADED';
}

export type SupplierType =
  | 'HOTEL'
  | 'CAB'
  | 'CAB_VENDOR'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'ACTIVITY_PROVIDER'
  | 'TOUR_GUIDE'
  | 'GUIDE'
  | 'HOUSEBOAT'
  | 'CRUISE'
  | 'VISA'
  | 'VISA_AGENT'
  | 'TOUR_OPERATOR'
  | 'FLIGHT'
  | 'OTHER';

export interface Supplier {
  id: string;
  name: string;
  supplierType: SupplierType | string;
  contactPerson?: string | null;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  alternateContact?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  tier?: 'Diamond' | 'Gold' | 'Silver' | string;
  serviceCategories?: string | null;
  categoryDetails?: string | null;
  category?: string | null;
  servicesProvided?: string | null;
  destinationsCovered?: string | null;
  contractDetails?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number;
  commissionDetails?: string | null;
  bankDetails?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | string;
  assignedToId?: string | null;
  assignedUser?: { id: string; name: string; email: string; phone?: string | null } | null;
  tags?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}


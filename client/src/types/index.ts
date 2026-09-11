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
  finalAmount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  termsAndConditions?: string | null;
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
  followUpsToday: number;
  confirmedBookings: number;
  totalRevenue: number;
  totalCollected: number;
  pendingPayments: number;
  b2bBookings: number;
  conversionRate: number;
}

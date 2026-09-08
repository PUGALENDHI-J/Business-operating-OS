// Types mirror the exact column/field names returned by the Phase 3 API
// (see /docs/04-api-specification.md) so the frontend never has to guess
// or transform shapes — what the API returns is what these describe.

export type UserType = "staff" | "customer";
export type LeadStatus = "new" | "contacted" | "interested" | "follow_up" | "converted" | "lost";
export type KycStatus = "pending" | "verified" | "rejected";
export type ChitGroupStatus = "pending" | "active" | "completed" | "cancelled";
export type ChitMemberStatus = "active" | "defaulted" | "completed" | "exited";
export type InstallmentStatus = "pending" | "paid" | "partial" | "overdue" | "waived";
export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other";
export type PaymentStatus = "success" | "failed" | "refunded" | "reversed";
export type AuctionStatus = "scheduled" | "live" | "completed" | "cancelled";
export type FollowupStatus = "pending" | "completed" | "cancelled";
export type Frequency = "weekly" | "monthly";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CurrentUser {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  user_type: UserType;
  roles: string[];
  permissions: string[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  employee_code: string | null;
  designation: string | null;
  joining_date: string | null;
  is_active: boolean;
  branch_id: string;
  branch_name: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  roles?: Role[];
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  interested_scheme_id: string | null;
  interested_scheme_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  converted_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  date_of_birth?: string | null;
  kyc_status: KycStatus;
  is_active: boolean;
  branch_id: string | null;
  branch_name: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerDocument {
  id: string;
  document_type: string;
  file_url: string;
  status: KycStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
  uploaded_at: string;
}

export interface ChitMembership {
  id: string;
  member_serial_no: number;
  status: ChitMemberStatus;
  join_date: string;
  exit_date: string | null;
  chit_group_id: string;
  group_code: string;
  group_status: ChitGroupStatus;
  start_date: string;
  end_date: string;
  scheme_name: string;
  chit_amount: string;
  installment_amount: string;
  frequency: Frequency;
}

export interface CustomerPaymentRow {
  id: string;
  amount: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  payment_date: string;
  status: PaymentStatus;
  cycle_number: number;
  group_code: string;
  scheme_name: string;
  receipt_number: string | null;
}

export interface CustomerOutstanding {
  outstandingAmount: number;
  overdueAmount: number;
}

export interface CustomerAuctionRow {
  id: string;
  cycle_number: number;
  scheduled_at: string;
  status: AuctionStatus;
  winning_bid_percent: string | null;
  prize_amount: string | null;
  group_code: string;
  scheme_name: string;
  won_by_this_customer: boolean;
}

export interface Followup {
  id: string;
  due_date: string;
  status: FollowupStatus;
  notes: string | null;
  completed_at: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
}

export interface WhatsappHistoryRow {
  id: string;
  recipient_phone: string;
  status: string;
  related_entity_type: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  template_name: string | null;
}

export interface ActivityRow {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
  actor_name: string | null;
}

export interface ChitScheme {
  id: string;
  name: string;
  scheme_code: string;
  chit_amount: string;
  member_count: number;
  duration_periods: number;
  frequency: Frequency;
  installment_amount: string;
  max_bid_percent: string;
  commission_percent: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChitGroup {
  id: string;
  group_code: string;
  start_date: string;
  end_date: string;
  status: ChitGroupStatus;
  current_cycle: number;
  scheme_id: string;
  scheme_name: string;
  chit_amount: string;
  member_count: number;
  frequency: Frequency;
  branch_id: string;
  branch_name: string;
  created_at: string;
  updated_at: string;
}

export interface ChitMember {
  id: string;
  member_serial_no: number;
  status: ChitMemberStatus;
  join_date: string;
  exit_date: string | null;
  exit_reason: string | null;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  chit_group_id: string;
  group_code: string;
  scheme_name: string;
  created_at: string;
  updated_at: string;
}

export interface Installment {
  id: string;
  cycle_number: number;
  due_date: string;
  due_amount: string;
  paid_amount: string;
  status: InstallmentStatus;
  chit_member_id: string;
  customer_name: string;
  customer_phone: string;
  group_code: string;
  scheme_name: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  amount: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  payment_date: string;
  status: PaymentStatus;
  notes: string | null;
  installment_id: string;
  cycle_number: number;
  due_amount: string;
  due_date: string;
  chit_member_id: string;
  customer_name: string;
  group_code: string;
  scheme_name: string;
  collected_by: string | null;
  collected_by_name: string | null;
  receipt_number: string | null;
  created_at: string;
}

export interface Auction {
  id: string;
  cycle_number: number;
  scheduled_at: string;
  status: AuctionStatus;
  winning_bid_percent: string | null;
  prize_amount: string | null;
  commission_amount: string | null;
  notes: string | null;
  chit_group_id: string;
  group_code: string;
  scheme_name: string;
  chit_amount: string;
  scheme_commission_percent: string;
  winning_member_id: string | null;
  winning_customer_name: string | null;
  conducted_by: string | null;
  conducted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  bid_percent: string;
  bid_amount: string;
  bid_time: string;
  is_winning_bid: boolean;
  chit_member_id: string;
  customer_name: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface WhatsappTemplate {
  id: string;
  template_name: string;
  meta_template_name: string | null;
  category: string | null;
  language_code: string;
  body_text: string;
  status: "pending" | "approved" | "rejected" | "disabled";
  created_at: string;
  updated_at: string;
}

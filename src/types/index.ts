export interface Business {
  id: string;
  owner_id: string;
  name: string;
  logo_url?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
  business_type?: string;
  currency: string;
  default_language: string;
  financial_year_start?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  mobile_number?: string;
  alternate_mobile_number?: string;
  whatsapp_number?: string;
  business_type?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  email?: string;
  gstin?: string;
  opening_balance: number;
  opening_balance_type: 'receivable' | 'payable';
  notes?: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  customer_id: string;
  transaction_date: string;
  transaction_type: 'credit' | 'debit' | 'payment' | 'opening' | 'adjustment' | 'sales_return' | 'purchase_return';
  amount: number;
  description?: string;
  reference_number?: string;
  payment_method?: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // New fields for material-based transactions
  discount_type?: 'none' | 'percentage' | 'fixed';
  discount_value?: number;
  subtotal?: number;
  discount_amount?: number;
  taxable_amount?: number;
  total_gst?: number;
  grand_total?: number;
  invoice_number?: string;
  invoice_date?: string;
}

export interface TransactionItem {
  id: string;
  business_id: string;
  transaction_id: string;
  product_id?: string;
  item_name: string;
  item_code?: string;
  description?: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  line_subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  gst_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  item_name: string;
  item_code?: string;
  description?: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage?: number;
  final_rate?: number;
  minimum_order_quantity?: number;
  effective_date?: string;
  expiry_date?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export type TransactionType = 'credit' | 'debit' | 'payment' | 'opening' | 'adjustment';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type CustomerStatus = 'active' | 'archived';
export type ProductStatus = 'active' | 'inactive';

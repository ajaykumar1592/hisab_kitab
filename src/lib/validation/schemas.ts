import { z } from 'zod';

// Customer schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  mobile_number: z.string().regex(/^[0-9]{10}$/, 'Invalid mobile number').optional(),
  alternate_mobile_number: z.string().regex(/^[0-9]{10}$/, 'Invalid mobile number').optional(),
  whatsapp_number: z.string().regex(/^[0-9]{10,15}$/, 'Invalid WhatsApp number').optional(),
  business_type: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pin_code: z.string().regex(/^[0-9]{6}$/, 'Invalid PIN code').optional(),
  email: z.string().email('Invalid email').optional(),
  gstin: z.string().max(15).optional(),
  opening_balance: z.number().min(0, 'Opening balance must be positive').default(0),
  opening_balance_type: z.enum(['receivable', 'payable']).default('receivable'),
  notes: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export const customerUpdateSchema = customerSchema.partial();

// Transaction schemas
export const transactionSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  transaction_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  transaction_type: z.enum(['credit', 'debit', 'payment', 'opening', 'adjustment', 'sales_return', 'purchase_return']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional(),
  reference_number: z.string().max(100).optional(),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']).optional(),
});

export const transactionUpdateSchema = transactionSchema.partial();

// Product schemas
export const productSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(255),
  item_code: z.string().max(50).optional(),
  category_id: z.string().uuid('Invalid category ID').optional(),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1, 'Unit is required').max(50),
  quantity: z.number().positive('Quantity must be positive').default(1),
  rate: z.number().positive('Rate must be positive'),
  gst_percentage: z.number().min(0).max(100).optional(),
  hsn_code: z.string().max(20).optional(),
  minimum_order_quantity: z.number().positive().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const productUpdateSchema = productSchema.partial();

export const productCreateSchema = productSchema.refine(
  (data) => data.category_id !== undefined,
  { message: 'Category is required', path: ['category_id'] }
);

// Product category schemas
export const productCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  parent_category_id: z.string().uuid().optional(),
});

export const productCategoryUpdateSchema = productCategorySchema.partial();

// Product query schema
export const productQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// Business schemas
export const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(255),
  logo_url: z.string().url('Invalid URL').optional(),
  mobile_number: z.string().regex(/^[0-9]{10}$/, 'Invalid mobile number').optional(),
  whatsapp_number: z.string().regex(/^[0-9]{10,15}$/, 'Invalid WhatsApp number').optional(),
  email: z.string().email('Invalid email').optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pin_code: z.string().regex(/^[0-9]{6}$/, 'Invalid PIN code').optional(),
  gstin: z.string().max(15).optional(),
  business_type: z.string().max(100).optional(),
  currency: z.string().default('INR'),
  default_language: z.enum(['en', 'hi']).default('en'),
  financial_year_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// WhatsApp schemas
export const whatsappConfigSchema = z.object({
  meta_app_id: z.string().min(1, 'Meta App ID is required'),
  meta_app_secret: z.string().min(1, 'Meta App Secret is required'),
  whatsapp_business_account_id: z.string().min(1, 'WhatsApp Business Account ID is required'),
  phone_number_id: z.string().min(1, 'Phone Number ID is required'),
  access_token: z.string().min(1, 'Access Token is required'),
  webhook_verify_token: z.string().min(1, 'Webhook Verify Token is required'),
  api_version: z.string().default('v18.0'),
  business_display_number: z.string().optional(),
});

// Payment schemas
export const paymentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  payment_amount: z.number().positive('Payment amount must be positive'),
  payment_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']).default('cash'),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(1, 'Full name is required'),
  business_name: z.string().min(1, 'Business name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// Search schemas
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  filters: z.record(z.string(), z.any()).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
export type WhatsAppConfigInput = z.infer<typeof whatsappConfigSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

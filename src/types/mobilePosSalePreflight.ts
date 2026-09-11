export type PreflightLine = {
  product_id: string | number;
  product_variant_id: string | number | null;
  quantity: string;
};

export type PreflightPaymentIntentLine = {
  payment_method_id: string | number;
  amount: string;
  account_id?: string | number | null;
};

export type SalePreflightRequest = {
  client_id: string | number;
  lines: PreflightLine[];
  payment_intent: PreflightPaymentIntentLine[];
};

export type PreflightTotals = {
  merchandise_total: string;
  net_total: string;
  subtotal: string;
  subtotal_excluding_tax: string;
  subtotal_including_tax: string;
  tax: string;
  discount: string;
  shipping: string;
  grand_total: string;
};

export type PreflightLineResult = {
  product_id: string | number;
  product_variant_id: string | number | null;
  quantity: string;
  unit_price: string;
  net_unit_price: string;
  net_subtotal: string;
  subtotal: string;
  total: string;
  tax?: {
    amount: string;
  } | null;
};

export type PreflightPayments = {
  requested?: unknown[];
  total_paid: string;
  change: string;
  balance_due: string;
};

export type PreflightErrorCode =
  | 'insufficient_stock'
  | 'invalid_client'
  | 'invalid_quantity'
  | 'unsupported_product_type'
  | 'serial_selection_required'
  | 'batch_selection_required'
  | 'combo_not_supported'
  | 'invalid_payment_method'
  | 'unsupported_payment_method'
  | 'invalid_account'
  | 'payment_total_invalid'
  | 'invalid_operational_context'
  | string;

export type PreflightError = {
  code: PreflightErrorCode;
  message: string;
  line_index?: number | null;
  product_id?: string | number | null;
  product_variant_id?: string | number | null;
  available_quantity?: string | null;
  requested_quantity?: string | null;
};

export type SalePreflightResponse = {
  can_submit: boolean;
  totals: PreflightTotals;
  lines: PreflightLineResult[];
  payments: PreflightPayments;
  errors: PreflightError[];
};

export type FiscalSummary = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  discountCents: number;
  shippingCents: number;
};

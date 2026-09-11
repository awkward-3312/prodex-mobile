import type { CheckoutCurrency } from './mobilePosCheckout';
import type { PreflightLine, PreflightPaymentIntentLine } from './mobilePosSalePreflight';

export type SaleSubmissionRequest = {
  sale_uuid: string;
  client_id: string | number;
  lines: PreflightLine[];
  payments: PreflightPaymentIntentLine[];
  notes?: string;
};

export type ConfirmedSale = {
  id: string | number;
  ref: string;
  sale_uuid: string;
  grand_total: string;
  payment_status: 'paid' | 'partial' | 'unpaid';
  fiscal_number: string | null;
  fiscal_status: string | null;
};

export type SaleSubmissionResponse = { success: true; idempotent: boolean; sale: ConfirmedSale };
export type SaleAttempt = {
  version: 1;
  owner: string;
  request: SaleSubmissionRequest;
  currency: CheckoutCurrency;
  response?: SaleSubmissionResponse;
};

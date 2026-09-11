export type MobileSalePaymentStatus = 'paid' | 'partial' | 'unpaid';

export type MobileSaleCustomer = { id: string | number; name: string };
export type MobileSaleBranch = { id: string | number; name: string };
export type MobileSaleFiscal = { number: string | null; status: string | null };

export type MobileSalePagination = {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
};

export type MobileSale = {
  sale_id: string | number;
  sale_uuid: string | null;
  reference: string;
  date: string;
  customer: MobileSaleCustomer | null;
  branch: MobileSaleBranch | null;
  items_count: number;
  grand_total: string;
  paid_amount: string;
  due_amount: string;
  payment_status: MobileSalePaymentStatus;
  fiscal: MobileSaleFiscal | null;
};

export type MobileSalesResponse = {
  items: MobileSale[];
  pagination: MobileSalePagination;
};

export type CheckoutCurrency = {
  code: string;
  symbol: string;
  price_decimals: number;
  locale?: string | null;
};

export type CheckoutOperationalContext = {
  branch: { id: string | number; name: string } | null;
  inventory_location: { id: string | number; name: string } | null;
  cash_drawer: { id: string | number; name: string } | null;
};

export type CheckoutCustomer = {
  id: string | number;
  name: string;
  phone?: string | null;
  rtn?: string | null;
  email?: string | null;
};

export type CheckoutCustomerContext = {
  default: CheckoutCustomer | null;
};

export type CheckoutPaymentMethod = {
  id: string | number;
  name: string;
  type: string;
  is_cash: boolean;
  is_card: boolean;
  requires_account: boolean;
  is_supported: boolean;
  is_available: boolean;
  supports_change: boolean;
  stripe_supported: boolean;
};

export type CheckoutAccount = {
  id: string | number;
  name: string;
  payment_method_id?: string | number | null;
};

export type CheckoutTaxConfig = {
  prices_include_tax?: boolean | null;
  default_tax_rate?: string | null;
};

export type CheckoutPricing = {
  price_list_id?: string | number | null;
  price_list_name?: string | null;
};

export type CheckoutCapabilities = {
  can_create_sale: boolean;
  reason: string | null;
  mixed_payments: boolean;
};

export type CheckoutContext = {
  operational_context: CheckoutOperationalContext;
  customer: CheckoutCustomerContext;
  payment_methods: CheckoutPaymentMethod[];
  accounts: CheckoutAccount[];
  tax_config: CheckoutTaxConfig;
  currency: CheckoutCurrency;
  pricing: CheckoutPricing;
  capabilities: CheckoutCapabilities;
};

export type ClientSearchResult = {
  id: string | number;
  name: string;
  phone?: string | null;
  rtn?: string | null;
  email?: string | null;
};

export type ClientSearchResponse = {
  items: ClientSearchResult[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
};

export type MobileProductMatch = {
  field?: string | null;
  source_field?: string | null;
  type?: string | null;
  scanned_value?: string | null;
  scanner_type?: string | null;
  weighted?: boolean;
};

export type MobileResolvedProduct = {
  id?: number | string | null;
  variant_id?: number | string | null;
  product_id?: number | string | null;
  product_variant_id?: number | string | null;
  name?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  code?: string | null;
  gtin?: string | null;
  barcode_symbology?: string | null;
  type?: string | null;
  unit?: string | null;
  unit_id?: number | string | null;
};

export type MobileProductPricing = {
  price?: string | number | null;
  source?: string | null;
};

export type MobileProductInventory = {
  location_id?: number | string | null;
  inventory_location_id?: number | string | null;
  quantity?: number | string | null;
  reserved_quantity?: number | string | null;
  available_quantity?: number | string | null;
  manage_stock?: boolean;
  out_of_stock?: boolean;
  low_stock?: boolean;
  overselling_allowed?: boolean;
};

export type MobileProductSellability = {
  can_sell?: boolean;
  reason?: string | null;
};

export type MobileProductResolveData = {
  match?: MobileProductMatch;
  product?: MobileResolvedProduct;
  pricing?: MobileProductPricing;
  inventory?: MobileProductInventory;
  sellability?: MobileProductSellability;
  scan_quantity?: number | string | null;
};

export type MobileProductResolveResponse = {
  data?: MobileProductResolveData;
};


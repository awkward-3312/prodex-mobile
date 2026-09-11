export type MobilePosCategory = {
  id: string | number;
  name: string;
};

export type MobilePosPagination = {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
};

export type MobilePosCatalogItem = {
  product_id: string | number;
  product_variant_id: string | number | null;
  name: string;
  variant_name: string | null;
  display_name: string;
  code: string | null;
  gtin: string | null;
  barcode_symbology: string | null;
  type: string | null;
  unit: string | null;
  unit_id: string | number | null;
  category: MobilePosCategory | string | null;
  image_url: string | null;
  pricing: {
    price: string;
    source: string | null;
  };
  inventory: {
    inventory_location_id: string | number;
    quantity: number;
    reserved_quantity: number;
    available_quantity: number;
    manage_stock: boolean;
    out_of_stock: boolean;
    low_stock: boolean;
    overselling_allowed: boolean;
  };
  sellability: {
    can_sell: boolean;
    reason: string | null;
  };
};

export type MobilePosCatalogResponse = {
  items: MobilePosCatalogItem[];
  categories: MobilePosCategory[];
  pagination: MobilePosPagination;
};

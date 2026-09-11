export type MobileInventoryCategory = {
  id: string | number;
  name: string;
};

export type MobileInventoryPagination = {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_more: boolean;
};

export type MobileInventorySummary = {
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
};

export type MobileInventoryStockStatus = 'low_stock' | 'out_of_stock';

export type MobileInventoryItem = {
  product_id: string | number;
  product_variant_id: string | number | null;
  name: string;
  variant_name: string | null;
  display_name: string;
  code: string | null;
  gtin: string | null;
  category: MobileInventoryCategory | null;
  image_url: string | null;
  inventory: {
    inventory_location_id: string | number;
    quantity: string;
    reserved_quantity: string;
    available_quantity: string;
    manage_stock: boolean;
    out_of_stock: boolean;
    low_stock: boolean;
  };
};

export type MobileInventoryResponse = {
  items: MobileInventoryItem[];
  categories: MobileInventoryCategory[];
  summary: MobileInventorySummary;
  pagination: MobileInventoryPagination;
};

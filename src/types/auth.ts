export type TenantInfo = {
  base_url: string;
  [key: string]: unknown;
};

export type TenantResolution = TenantInfo;

export type AuthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_at?: string | null;
  [key: string]: unknown;
};

export type AuthenticatedUser = {
  id?: string | number;
  name?: string;
  email?: string;
  avatar?: string | null;
  profile_photo_url?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  photo?: string | null;
  [key: string]: unknown;
};

export type OperationalEntity = {
  id: string | number;
  name?: string | null;
  code?: string | null;
  [key: string]: unknown;
};

export type Branch = OperationalEntity & {
  default_warehouse_id?: string | number | null;
  default_inventory_location_id?: string | number | null;
};

export type InventoryLocation = OperationalEntity & {
  branch_id?: string | number | null;
  type?: string | null;
  is_sellable?: boolean;
  is_default_sales?: boolean;
};

export type CashDrawer = OperationalEntity & {
  branch_id?: string | number | null;
  inventory_location_id?: string | number | null;
  warehouse_id?: string | number | null;
};

export type OperationalEffectiveContext = {
  source?: string | null;
  branch_id?: string | number | null;
  inventory_location_id?: string | number | null;
  cash_drawer_id?: string | number | null;
  legacy_warehouse_id?: string | number | null;
  can_override?: boolean;
  [key: string]: unknown;
};

export type OperationalContext = {
  effective?: OperationalEffectiveContext | null;
  branches?: Branch[];
  inventory_locations?: InventoryLocation[];
  cash_drawers?: CashDrawer[];
  ready_for_location_pos?: boolean;
  [key: string]: unknown;
};

export type MobileBootstrap = {
  user?: AuthenticatedUser;
  tenant?: TenantInfo;
  company_name?: string;
  operational_context?: OperationalContext;
  inventory_locations?: InventoryLocation[];
  permissions?: string[];
  currency?: Record<string, unknown>;
  locale?: string;
  timezone?: string;
  [key: string]: unknown;
};

export type AuthSession = {
  version: 1;
  workspace: string;
  baseUrl: string;
  accessToken: string;
  tokenType: string;
  expiresAt: string | null;
};

export type AuthStatus = 'initializing' | 'unauthenticated' | 'resolving_tenant' | 'authenticating' | 'bootstrapping' | 'bootstrap_error' | 'authenticated';
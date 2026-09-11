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
  [key: string]: unknown;
};

export type InventoryLocation = {
  id: string | number;
  name?: string;
  [key: string]: unknown;
};

export type OperationalContext = {
  effective?: {
    inventory_location_id?: string | number | null;
    [key: string]: unknown;
  };
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
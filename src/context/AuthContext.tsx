import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { ApiError, isAuthInvalidError } from '../services/api/apiError';
import { bootstrap as bootstrapRequest, login as loginRequest, logout as logoutRequest } from '../services/auth/authService';
import { clearSession, getSession, saveSession } from '../services/auth/sessionStorage';
import { resolveWorkspace } from '../services/auth/tenantService';
import { getAuthErrorMessage } from './authErrorMessage';
import { getSignInFailure } from './authSignIn';
import type { SignInResult } from './authSignIn';
import type { AuthSession, AuthStatus, AuthenticatedUser, InventoryLocation, MobileBootstrap, OperationalContext, TenantInfo } from '../types/auth';

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  bootstrap: MobileBootstrap | null;
  error: string | null;
  sessionExpired: boolean;
};

type AuthAction =
  | { type: 'status'; status: AuthStatus }
  | { type: 'session'; session: AuthSession | null }
  | { type: 'bootstrap'; data: MobileBootstrap }
  | { type: 'error'; message: string; sessionExpired?: boolean; preserveSession?: boolean }
  | { type: 'clear' };

const initialState: AuthState = { status: 'initializing', session: null, bootstrap: null, error: null, sessionExpired: false };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'status': return { ...state, status: action.status, error: null, sessionExpired: false };
    case 'session': return { ...state, session: action.session };
    case 'bootstrap': return { ...state, status: 'authenticated', bootstrap: action.data, error: null, sessionExpired: false };
    case 'error': return { ...state, status: action.preserveSession ? 'bootstrap_error' : 'unauthenticated', error: action.message, sessionExpired: action.sessionExpired ?? false };
    case 'clear': return { ...initialState, status: 'unauthenticated' };
    default: return state;
  }
}

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  bootstrap: MobileBootstrap | null;
  user: AuthenticatedUser | null;
  tenant: TenantInfo | null;
  operationalContext: OperationalContext | null;
  inventoryLocationId: string | number | null;
  inventoryLocations: InventoryLocation[];
  error: string | null;
  sessionExpired: boolean;
  signIn: (workspace: string, email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  retryBootstrap: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readableError(error: unknown) {
  if (error instanceof ApiError && error.code === 'token_idle_timeout') return 'Tu sesión expiró. Inicia sesión nuevamente.';
  return getAuthErrorMessage(error);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const bootstrapSession = useCallback(async (session: AuthSession, preserveOnFailure: boolean) => {
    dispatch({ type: 'status', status: 'bootstrapping' });
    try {
      const data = await bootstrapRequest(session.baseUrl, session.accessToken);
      dispatch({ type: 'bootstrap', data });
      return true;
    } catch (error) {
      if (isAuthInvalidError(error)) {
        await clearSession();
        dispatch({ type: 'clear' });
        if (error instanceof ApiError && error.code === 'token_idle_timeout') dispatch({ type: 'error', message: 'Tu sesión expiró. Inicia sesión nuevamente.', sessionExpired: true });
        return false;
      }
      if (preserveOnFailure) dispatch({ type: 'error', message: `${readableError(error)} Puedes reintentar.`, preserveSession: true });
      else dispatch({ type: 'error', message: readableError(error) });
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSession().then(async (session) => {
      if (!active) return;
      if (!session) {
        dispatch({ type: 'status', status: 'unauthenticated' });
        return;
      }
      dispatch({ type: 'session', session });
      await bootstrapSession(session, true);
    }).catch(() => dispatch({ type: 'error', message: 'No se pudo restaurar la sesión. Puedes reintentar.' }));
    return () => { active = false; };
  }, [bootstrapSession]);

  const signIn = useCallback(async (workspace: string, email: string, password: string): Promise<SignInResult> => {
    dispatch({ type: 'status', status: 'resolving_tenant' });
    try {
      const tenant = await resolveWorkspace(workspace);
      dispatch({ type: 'status', status: 'authenticating' });
      const token = await loginRequest(tenant.base_url, email, password);
      const session: AuthSession = { version: 1, workspace: workspace.trim().toLowerCase(), baseUrl: tenant.base_url, accessToken: token.access_token, tokenType: token.token_type ?? 'Bearer', expiresAt: token.expires_at ?? null };
      await saveSession(session);
      dispatch({ type: 'session', session });
      const bootstrapped = await bootstrapSession(session, true);
      return bootstrapped ? { ok: true } : getSignInFailure(new ApiError({ status: 0, code: 'network_error', message: 'No se pudo completar la sesión.' }));
    } catch (error) {
      const failure = getSignInFailure(error);
      dispatch({ type: 'error', message: failure.message, sessionExpired: false });
      return failure;
    }
  }, [bootstrapSession]);

  const signOut = useCallback(async () => {
    const currentSession = state.session;
    if (currentSession) {
      try { await logoutRequest(currentSession.baseUrl, currentSession.accessToken); } catch { /* local cleanup is authoritative */ }
    }
    await clearSession();
    dispatch({ type: 'clear' });
  }, [state.session]);

  const retryBootstrap = useCallback(async () => {
    if (!state.session) return false;
    return bootstrapSession(state.session, true);
  }, [bootstrapSession, state.session]);

  const value = useMemo<AuthContextValue>(() => ({
    status: state.status,
    session: state.session,
    bootstrap: state.bootstrap,
    user: state.bootstrap?.user ?? null,
    tenant: state.bootstrap?.tenant ?? null,
    operationalContext: state.bootstrap?.operational_context ?? null,
    inventoryLocationId: state.bootstrap?.operational_context?.effective?.inventory_location_id ?? null,
    inventoryLocations: state.bootstrap?.inventory_locations ?? [],
    error: state.error,
    sessionExpired: state.sessionExpired,
    signIn,
    signOut,
    retryBootstrap,
    hasPermission: (permission) => state.bootstrap?.permissions?.includes(permission) ?? false,
  }), [retryBootstrap, signIn, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentCashRegister, MobileCashRegisterError } from '../services/cashRegister/mobileCashRegisterService';
import { CashRegisterSessionController } from '../services/cashRegister/cashRegisterSessionController';

const Context = createContext<CashRegisterSessionController | null>(null);
export function CashRegisterProvider({ children }: { children: ReactNode }) {
  const { session, user, operationalContext, hasPermission, signOut } = useAuth();
  const canOperate = hasPermission('Pos_view') || hasPermission('cash_register_report');
  const controller = useMemo(() => new CashRegisterSessionController(async signal => {
    if (!session?.accessToken || !canOperate) return { status: 'closed', register: null, summary: null };
    try { return await getCurrentCashRegister({ baseUrl: session.baseUrl, accessToken: session.accessToken, signal }); }
    catch (error) {
      if (!signal.aborted && error instanceof MobileCashRegisterError && error.status === 'session_expired') void signOut();
      throw error;
    }
  }), [session?.baseUrl, session?.accessToken, user?.id, operationalContext?.effective?.branch_id, operationalContext?.effective?.inventory_location_id, operationalContext?.effective?.cash_drawer_id, canOperate, signOut]);
  useEffect(() => { void controller.refresh(); return controller.dispose; }, [controller]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}
export function useCashRegister() {
  const controller = useContext(Context);
  if (!controller) throw new Error('CashRegisterProvider is required');
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { ...state, refresh: controller.refresh, invalidate: controller.invalidate };
}

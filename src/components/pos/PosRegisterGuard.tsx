import { useCallback, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useCashRegister } from '../../context/CashRegisterContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../../theme';

export function PosRegisterGuard({ children, recovery = false }: { children: ReactNode; recovery?: boolean }) {
  const { status, refresh } = useCashRegister();
  const { hasPermission } = useAuth();
  const [focusedReady, setFocusedReady] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setFocusedReady(false);
    void refresh().then(() => { if (active) setFocusedReady(true); });
    return () => { active = false; setFocusedReady(false); };
  }, [refresh]));
  if (!hasPermission('Pos_view')) return <EmptyState icon="lock-closed-outline" title="No tienes permiso para vender." />;
  // Recovery renders only the existing sale's retry/receipt UI, never a new checkout.
  if (recovery) return children;
  if (!focusedReady || status === 'loading') return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Consultando caja" color={colors.brand} /></View>;
  if (status !== 'open') return <EmptyState icon="lock-closed-outline" title="Necesitas abrir caja antes de comenzar a vender." message={status === 'error' ? 'No pudimos comprobar el estado de tu caja. Consulta Caja para actualizarlo.' : undefined} actionLabel="Abrir caja" onAction={() => router.push('/cash-register/open')} />;
  return children;
}

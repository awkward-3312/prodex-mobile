import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { EmptyState } from './EmptyState';

type Props = { permission: string; title: string; children: ReactNode };

/**
 * Client-side gate to keep the UI consistent with what the backend already
 * enforces (a permission the API would reject with 403 stays unreachable in
 * the UI too). The backend remains authoritative: this is UX, not security.
 */
export function PermissionGuard({ permission, title, children }: Props) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <EmptyState icon="lock-closed-outline" title={title} />
      </SafeAreaView>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
});

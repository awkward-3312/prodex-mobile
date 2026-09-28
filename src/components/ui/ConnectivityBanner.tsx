import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConnectivity } from '../../services/connectivity/connectivityController';
import { colors, fontWeights, spacing, typography } from '../../theme';
import { FadeInView } from '../motion';

/**
 * App-wide, non-blocking notice of connectivity state. Mounted once at the
 * root layout so every screen (POS, checkout, cash register, receipts,
 * bootstrap) shows the same message without each one wiring its own banner.
 * Renders nothing while online.
 */
export function ConnectivityBanner() {
  const { status } = useConnectivity();
  const insets = useSafeAreaInsets();
  const previousStatus = useRef(status);

  useEffect(() => {
    if (status === 'online' && previousStatus.current !== 'online') {
      AccessibilityInfo.announceForAccessibility?.('Conexión restablecida');
    }
    previousStatus.current = status;
  }, [status]);

  if (status === 'online') return null;

  const isOffline = status === 'offline';
  return (
    <FadeInView accessibilityLiveRegion="polite" distance={0} style={[styles.wrap, { paddingTop: insets.top + spacing.xs }, isOffline ? styles.offline : styles.reconnecting]}>
      <Ionicons name={isOffline ? 'cloud-offline-outline' : 'sync-outline'} size={14} color={colors.white} />
      <Text style={styles.text}>{isOffline ? 'Sin conexión a internet' : 'Reconectando...'}</Text>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingBottom: spacing.xs },
  offline: { backgroundColor: colors.red },
  reconnecting: { backgroundColor: colors.amber },
  text: { color: colors.white, fontSize: typography.caption, fontWeight: fontWeights.semibold },
});
